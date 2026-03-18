This technical report outlines a framework for analyzing customer support transcripts by extracting structured, actionable information from long, noisy conversational data. The system addresses limitations of single-pass LLM classification and traditional preprocessing by using a metadata-enrichment pipeline and two complementary retrieval architectures: **Vector RAG** and **GraphRAG**.

### **Data Processing and Metadata Enrichment**

The enrichment pipeline assigns meaningful business labels to transcripts, such as topics (e.g., "Service Dissatisfaction") and outcomes (e.g., "Information Provided").

  * **Two-Stage Design:** To ensure stability and schema consistency, the system first discovers labels through sampling and then performs constrained classification.
  * **Sampling-Based Label Discovery:** A representative 40% sample of transcripts is analyzed by **Gemini Pro** to identify candidate topics and outcomes. This captures the majority of labels across the Zipfian distribution at a lower compute cost.
  * **Constrained Classification:** The remaining transcripts are classified by **Gemini Flash** using the fixed schema. This prevents naming drift (e.g., "Billing" vs. "Bills") and ensures deterministic outputs.
  * **Raw Form Preservation:** Traditional preprocessing like stopword removal or lemmatization was avoided as it can degrade conversational cues and distort original interactions.

### **Retrieval Architectures**

The system implements two distinct retrieval methods to feed grounded evidence into an LLM.

#### **1. Vector RAG (Approach-1)**

This method uses semantic similarity search to retrieve relevant transcript segments.

  * **Indexing:** Enriched call summaries and problem-resolution segments are converted into 768-dimensional embeddings using **embeddinggemma-300m** and stored in a **Qdrant** vector database.
  * **Search Plan Generation:** Gemini 2.5 Flash rewrites user queries to resolve pronouns and extracts structured filters (domain, topic, outcome) from the query.
  * **Execution:** A hybrid filter uses "must" matches for domains and "should" matches for topics/outcomes to retrieve relevant transcripts from Qdrant.
  * **Strengths and Flaws:** It is computationally lightweight, has high recall, and handles simple queries well. However, it loses structural context and can return redundant text slices.

#### **2. GraphRAG (Approach-2)**

This approach incorporates a dynamic relational structure encoded in a knowledge graph to handle both local and global queries.

  * **Graph Representation:** The graph consists of **Call nodes** (containing full text and summaries) and **Concept nodes** (used as anchors for traversal).
  * **Expansion Logic:** Based on the query, the system identifies initial nodes and expands the search through the graph.
      * **Single-Concept:** Retrieves directly connected Call nodes.
      * **Multi-Concept:** Retrieves Calls at the intersection of different Concept neighborhoods.
      * **Shortest Path:** If no intersection exists, it finds shortest paths between concepts to connect structurally related regions.
  * **Strengths and Flaws:** It provides exceptional faithfulness and acts as a strict guardrail for root cause analysis. However, it is brittle if initial entity resolution fails (e.g., failing to link a pronoun to a specific node).

### **Comparison and Evaluation**

The two strategies were evaluated based on **ID Recall** (evidence quality), **Faithfulness** (trust/safety), and **Answer Relevancy** (utility).

| Metric           | Graph Strategy | Filter (Vector) Strategy |
| :--------------- | :------------- | :----------------------- |
| **ID Recall**    | 30.8%          | **36.0%**                |
| **Faithfulness** | **0.74**       | 0.58                     |
| **Relevancy**    | 0.71           | **0.77**                 |

**Key Finding:** The **Graph Strategy** is superior for compliance and root cause analysis due to its high faithfulness and low hallucination risk. The **Filter Strategy** is better suited for general information retrieval where high recall is prioritized over absolute precision.
