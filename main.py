import json
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from src.retrieval import run_graph_strategy, run_filter_strategy, init_resources

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_resources()
    yield

app = FastAPI(title="CausewayAI Causal Engine", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    history: list = []
    model_type: str = "graph"
    google_api_key: str = ""  # User provides their own Gemini API key

@app.get("/health")
@limiter.limit("30/minute")
def health(request: Request):
    return {"status": "ready"}

@app.post("/chat")
@limiter.limit("5/minute")
async def chat_endpoint(request: Request, req: ChatRequest):
    """
    Streaming Endpoint.
    Returns: Server-Sent Events (SSE)
    """
    # Resolve API key: user-provided key takes priority, fall back to server env var
    api_key = req.google_api_key or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="No Google API key provided. Pass 'google_api_key' in your request body."
        )
    gemini_client = genai.Client(api_key=api_key)

    async def sse_generator():
        try:
            if req.model_type == "filter":
                iterator = run_filter_strategy(req.query, req.history, gemini_client)
            else:
                iterator = run_graph_strategy(req.query, req.history, gemini_client)
            
            # Stream Loop
            async for item in iterator:
                encoded = json.dumps(item)
                yield f"data: {encoded}\n\n"
                await asyncio.sleep(0.2)
                
        except Exception as e:
            err = json.dumps({"event": "error", "message": str(e)})
            yield f"data: {err}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)