/**
 * graph.js — Section 01: Knowledge Graph Visualizer
 * Force-directed simulation (original aesthetic) +
 * live stats panel showing network scale vs actual corpus
 */
(function () {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ---- DATA ----
  const DOMAINS = ['Banking', 'Flight', 'Hotel', 'Insurance', 'Retail', 'Telecom'];
  const TOPICS = [
    'Booking Error', 'Cancellation Policy', 'Connectivity Issue',
    'Delivery Delay', 'Fee Dispute', 'Flight Delay', 'Flight Rebooking',
    'Fraud Report', 'Incorrect Product', 'Loyalty Program',
    'Plan Upgrade', 'Refund Request', 'Service Complaint', 'Churn Risk',
    'Credit Limit', 'Competitor Comparison', 'Policy Renewal', 'Sales Inquiry'
  ];

  // ACTUAL corpus scale (hardcoded from dataset knowledge)
  const ACTUAL = {
    calls:    30000,
    concepts: 29,
    domains:  6,
    edges:    150000,
    tokens:   '30M+',
  };

  let nodes = [], edges = [];
  let animFrame, hoveredNode = null;
  let W, H;

  function buildGraph() {
    nodes = []; edges = [];
    const cx = W / 2, cy = H / 2;

    // Domain nodes
    const domainNodes = DOMAINS.map((d, i) => {
      const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(W, H) * 0.28;
      return { id: `domain-${i}`, label: d, type: 'domain',
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        vx: 0, vy: 0, radius: 10 };
    });

    // Concept nodes
    const conceptNodes = TOPICS.map((t, i) => {
      const domainIdx = i % DOMAINS.length;
      const parent = domainNodes[domainIdx];
      const angle = Math.random() * Math.PI * 2;
      const r = 55 + Math.random() * 40;
      return { id: `concept-${i}`, label: t, type: 'concept',
        x: parent.x + Math.cos(angle) * r, y: parent.y + Math.sin(angle) * r,
        vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5,
        radius: 5, parentId: `domain-${domainIdx}` };
    });

    // Call nodes — scaled to viewport
    const callCount = Math.min(Math.floor(W / 4), 180);
    const callNodes = [];
    for (let i = 0; i < callCount; i++) {
      const conceptIdx = Math.floor(Math.random() * conceptNodes.length);
      const parent = conceptNodes[conceptIdx];
      const angle = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 30;
      callNodes.push({ id: `call-${i}`, label: `CALL-${String(i).padStart(4,'0')}`,
        type: 'call', radius: 2.5,
        x: parent.x + Math.cos(angle) * r, y: parent.y + Math.sin(angle) * r,
        vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3,
        parentId: parent.id });
    }

    nodes = [...domainNodes, ...conceptNodes, ...callNodes];

    // Edges
    conceptNodes.forEach(c => edges.push({ a: c.parentId, b: c.id, strength: 0.04 }));
    callNodes.forEach(c => edges.push({ a: c.parentId, b: c.id, strength: 0.02 }));
    for (let i = 0; i < 20; i++) {
      const a = conceptNodes[Math.floor(Math.random() * conceptNodes.length)];
      const b = conceptNodes[Math.floor(Math.random() * conceptNodes.length)];
      if (a.id !== b.id) edges.push({ a: a.id, b: b.id, strength: 0.01 });
    }

    // Update stats panel
    updateStats(callNodes.length, conceptNodes.length);
  }

  // ---- STATS PANEL ----
  function updateStats(visibleCalls, visibleConcepts) {
    const el = document.getElementById('graphScaleNote');
    if (!el) return;
    const visibleNodes = nodes.length;
    const visibleEdges = edges.length;
    const callPct = ((visibleCalls / ACTUAL.calls) * 100).toFixed(2);
    const edgePct = ((visibleEdges / ACTUAL.edges) * 100).toFixed(2);
    el.innerHTML =
      `Visualising <strong>${visibleNodes}</strong> nodes `+
      `(<strong>${callPct}%</strong> of ~${ACTUAL.calls.toLocaleString()} actual calls · `+
      `<strong>${edgePct}%</strong> of ~${(ACTUAL.edges/1000).toFixed(0)}K graph edges). `+
      `Full corpus: <strong>${ACTUAL.tokens} tokens · 6 domains · 29 topic clusters · 28 outcome types.</strong>`;
  }

  // ---- FORCE SIM ----
  function nodeMap() {
    const m = {}; nodes.forEach(n => m[n.id] = n); return m;
  }

  function tick() {
    const map = nodeMap();
    const cx = W / 2, cy = H / 2;

    // Spring edges
    edges.forEach(e => {
      const a = map[e.a], b = map[e.b];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const targetLen = (a.type==='domain' && b.type==='concept') ? 80 :
                        (a.type==='concept' && b.type==='call') ? 35 : 60;
      const force = (dist - targetLen) * e.strength;
      const fx = (dx/dist)*force, fy = (dy/dist)*force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });

    // Repulsion between non-call nodes
    const noncall = nodes.filter(n => n.type !== 'call');
    for (let i = 0; i < noncall.length; i++) {
      for (let j = i+1; j < noncall.length; j++) {
        const a = noncall[i], b = noncall[j];
        const dx = b.x-a.x, dy = b.y-a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const minDist = (a.type==='domain'||b.type==='domain') ? 120 : 60;
        if (dist < minDist) {
          const force = (minDist-dist)/dist*0.15;
          a.vx -= dx*force; a.vy -= dy*force;
          b.vx += dx*force; b.vy += dy*force;
        }
      }
    }

    // Gravity
    nodes.forEach(n => {
      const g = n.type==='domain' ? 0.003 : n.type==='concept' ? 0.001 : 0.0005;
      n.vx += (cx-n.x)*g; n.vy += (cy-n.y)*g;
    });

    // Integrate & dampen & boundary
    nodes.forEach(n => {
      n.vx *= 0.88; n.vy *= 0.88;
      n.x += n.vx; n.y += n.vy;
      const pad = 24;
      if (n.x < pad) { n.x = pad; n.vx *= -.5; }
      if (n.x > W-pad) { n.x = W-pad; n.vx *= -.5; }
      if (n.y < pad) { n.y = pad; n.vy *= -.5; }
      if (n.y > H-pad) { n.y = H-pad; n.vy *= -.5; }
    });
  }

  // ---- RENDER ----
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const map = nodeMap();

    // Edges
    edges.forEach(e => {
      const a = map[e.a], b = map[e.b];
      if (!a || !b) return;
      const isCall = a.type==='call' || b.type==='call';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isCall ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.10)';
      ctx.lineWidth = isCall ? 0.5 : 0.8;
      ctx.stroke();
    });

    // Nodes
    nodes.forEach(n => {
      const isHov = hoveredNode?.id === n.id;

      if (n.type === 'domain') {
        // Glow ring
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 28);
        grd.addColorStop(0, 'rgba(0,0,0,0.10)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(n.x, n.y, 28, 0, Math.PI*2);
        ctx.fillStyle = grd; ctx.fill();

        ctx.beginPath(); ctx.arc(n.x, n.y, isHov ? 13 : 10, 0, Math.PI*2);
        ctx.fillStyle = '#111111'; ctx.fill();

        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#111'; ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + 22);

      } else if (n.type === 'concept') {
        ctx.beginPath(); ctx.arc(n.x, n.y, isHov ? 7 : 5, 0, Math.PI*2);
        ctx.fillStyle = isHov ? '#333' : '#666'; ctx.fill();
        if (isHov) {
          ctx.font = '400 11px Inter, sans-serif';
          ctx.fillStyle = '#333'; ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y - 10);
        }

      } else {
        ctx.beginPath(); ctx.arc(n.x, n.y, 2, 0, Math.PI*2);
        ctx.fillStyle = isHov ? '#888' : 'rgba(0,0,0,0.22)'; ctx.fill();
      }
    });

    ctx.textAlign = 'left';
  }

  function loop() { tick(); draw(); animFrame = requestAnimationFrame(loop); }

  // ---- HOVER ----
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    hoveredNode = null;
    for (const n of nodes) {
      if (Math.hypot(n.x-mx, n.y-my) < n.radius + 6) { hoveredNode = n; break; }
    }
    const fact = document.getElementById('graphFact');
    if (fact) {
      if (hoveredNode) {
        const labels = { domain: 'Domain anchor', concept: 'Concept node', call: 'Call node' };
        fact.textContent = `${labels[hoveredNode.type]}: ${hoveredNode.label}`;
      } else { fact.textContent = 'Hover a node to explore'; }
    }
  });

  // ---- RESIZE ----
  function resize() {
    const stage = canvas.parentElement;
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = W; canvas.height = H;
    buildGraph();
  }

  window.addEventListener('resize', () => { cancelAnimationFrame(animFrame); resize(); loop(); });
  resize(); loop();
})();
