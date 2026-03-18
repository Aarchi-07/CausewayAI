/**
 * explorer.js — Section 02: Vector Explorer (static simulation)
 * Shows top 20 results, total match count, and approximate token count for current filter.
 */

// ── CORPUS SCALE DATA ─────────────────────────────────────
const DOMAIN_SCALE = {
  'Banking':   { calls: 5200, avgTok: 1050 },
  'Flight':    { calls: 4800, avgTok: 980  },
  'Hotel':     { calls: 3900, avgTok: 1100 },
  'Insurance': { calls: 5600, avgTok: 1200 },
  'Retail':    { calls: 6100, avgTok: 850  },
  'Telecom':   { calls: 4400, avgTok: 1150 },
};

// Approximate share of calls each topic takes within its domain
const TOPIC_SHARE = {
  'Booking Error': 0.08, 'Cancellation Policy Inquiry': 0.07, 'Connectivity Issue': 0.12,
  'Delivery Delay': 0.11, 'Fee Dispute': 0.10, 'Flight Delay': 0.14,
  'Flight Rebooking Request': 0.09, 'Fraud Report': 0.06, 'Incorrect Product Received': 0.09,
  'Loyalty Program Dissatisfaction': 0.05, 'Plan/Service Upgrade Inquiry': 0.10,
  'Refund Request': 0.13, 'Service Complaint': 0.14, 'Service Dissatisfaction / Churn Risk': 0.08,
};

const OUTCOME_SHARE = {
  'Billing Corrected': 0.06, 'Cancellation Processed': 0.07, 'Compensation Offered': 0.09,
  'Escalation Request': 0.05, 'Fee Waived': 0.08, 'Flight Rebooked': 0.07,
  'Information Provided': 0.18, 'No Resolution': 0.06, 'Refund Processed': 0.12,
  'Resolved via Troubleshooting': 0.10,
};

function estimateCorpusSize(domain, topic, outcome) {
  let calls = 0, avgTok = 1000;
  if (domain && DOMAIN_SCALE[domain]) {
    calls = DOMAIN_SCALE[domain].calls;
    avgTok = DOMAIN_SCALE[domain].avgTok;
  } else {
    // All domains
    calls = Object.values(DOMAIN_SCALE).reduce((s, d) => s + d.calls, 0); // ~30,000
    avgTok = Math.round(Object.values(DOMAIN_SCALE).reduce((s, d) => s + d.avgTok, 0) / 6);
  }
  if (topic && TOPIC_SHARE[topic]) calls = Math.round(calls * TOPIC_SHARE[topic]);
  if (outcome && OUTCOME_SHARE[outcome]) calls = Math.max(1, Math.round(calls * OUTCOME_SHARE[outcome]));
  const tokens = calls * avgTok;
  return { calls, tokens };
}

function fmtNum(n) { return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }

// ── STATIC CORPUS ─────────────────────────────────────────
const CALL_CORPUS = [
  { id:'BNK-CORP-0012', domain:'Banking',   topic:'Fraud Report',                      outcome:'Dispute Filed',                score:0.94, snippet:'Customer reports unauthorized transactions totaling $2,400. Card replacement initiated after identity verification.' },
  { id:'BNK-CORP-0034', domain:'Banking',   topic:'Fee Dispute',                        outcome:'Fee Waived',                   score:0.91, snippet:'Monthly maintenance fee disputed. Agent confirmed eligibility waiver after reviewing 18-month account history.' },
  { id:'BNK-CORP-0078', domain:'Banking',   topic:'Credit Limit Inquiry',               outcome:'Information Provided',         score:0.87, snippet:'Customer requests credit limit increase. Informed of 6-month waiting period post last increase.' },
  { id:'BNK-MRKT-0021', domain:'Banking',   topic:'Service Complaint',                  outcome:'Escalation Request',           score:0.85, snippet:'Online banking portal inaccessible for 3 days. Issue escalated to digital infrastructure team.' },
  { id:'BNK-MRKT-0055', domain:'Banking',   topic:'Loyalty Program Dissatisfaction',    outcome:'Compensation Offered',         score:0.82, snippet:'Points expired without notification. 5,000 bonus points offered as goodwill gesture.' },
  { id:'BNK-CORP-0091', domain:'Banking',   topic:'Refund Request',                     outcome:'Refund Processed',             score:0.79, snippet:'Double charge on mortgage payment. Full refund of $1,850 initiated within 3-5 business days.' },
  { id:'FLT-AKME-0003', domain:'Flight',    topic:'Flight Delay',                       outcome:'Compensation Offered',         score:0.96, snippet:'Customer flight delayed 5 hours due to mechanical issue. $200 travel voucher and meal voucher offered.' },
  { id:'FLT-AKME-0017', domain:'Flight',    topic:'Flight Rebooking Request',            outcome:'Flight Rebooked',              score:0.93, snippet:'Customer missed connection due to inbound delay. Rebooked on next available flight departing in 2 hours.' },
  { id:'FLT-GLOB-0042', domain:'Flight',    topic:'Cancellation Policy Inquiry',        outcome:'Information Provided',         score:0.89, snippet:'Customer inquires about refund eligibility for non-refundable ticket. 24-hour rule and exception criteria explained.' },
  { id:'FLT-GLOB-0066', domain:'Flight',    topic:'Service Dissatisfaction / Churn Risk', outcome:'Compensation Offered',       score:0.84, snippet:'Business class seat malfunction. Customer threatens to switch carrier. Upgrade on next flight offered.' },
  { id:'FLT-AKME-0089', domain:'Flight',    topic:'Booking Error',                      outcome:'Billing Corrected',            score:0.81, snippet:'Name misspelling on ticket causing boarding issues. Correction processed with documentation submitted.' },
  { id:'HTL-PRME-0008', domain:'Hotel',     topic:'Service Complaint',                  outcome:'Compensation Offered',         score:0.92, snippet:'Room not cleaned for two consecutive days. 20% discount on stay and complimentary dinner offered.' },
  { id:'HTL-PRME-0031', domain:'Hotel',     topic:'Booking Error',                      outcome:'Billing Corrected',            score:0.88, snippet:'Double booking detected for same date. Customer moved to superior room at same rate.' },
  { id:'HTL-LUXE-0054', domain:'Hotel',     topic:'Refund Request',                     outcome:'Refund Processed',             score:0.83, snippet:'Early checkout due to noise complaints. Two nights refunded, remaining as hotel credit.' },
  { id:'HTL-LUXE-0072', domain:'Hotel',     topic:'Loyalty Program Dissatisfaction',    outcome:'Information Provided',         score:0.77, snippet:'Points redemption process for free night clarified. Minimum 10,000 points required.' },
  { id:'INS-AKME-0002', domain:'Insurance', topic:'Cancellation Policy Inquiry',        outcome:'Information Provided',         score:0.97, snippet:'Auto policy renewal with updated coverage tier. Annual premium increased by 4.2% due to regional risk.' },
  { id:'INS-AKME-0019', domain:'Insurance', topic:'Refund Request',                     outcome:'Refund Processed',             score:0.91, snippet:'Customer cancels home insurance mid-term. Pro-rated refund of $340 processed after 30-day processing.' },
  { id:'INS-CORP-0038', domain:'Insurance', topic:'Service Complaint',                  outcome:'Escalation Request',           score:0.86, snippet:'Claim denied despite valid documentation. Case escalated to senior claims adjuster for review.' },
  { id:'INS-CORP-0067', domain:'Insurance', topic:'Fraud Report',                       outcome:'Dispute Filed',                score:0.83, snippet:'Multiple claims filed for same incident from different parties. Investigation initiated.' },
  { id:'RTL-FAST-0011', domain:'Retail',    topic:'Incorrect Product Received',         outcome:'Refund Processed',             score:0.95, snippet:'Customer received XL instead of M. Replacement shipped with prepaid return label, no item return required.' },
  { id:'RTL-FAST-0029', domain:'Retail',    topic:'Delivery Delay',                     outcome:'Information Provided',         score:0.90, snippet:'Order delayed 6 days due to warehouse inventory sync error. Estimated delivery revised to next Tuesday.' },
  { id:'RTL-ELEC-0048', domain:'Retail',    topic:'Service Complaint',                  outcome:'Refund Processed',             score:0.87, snippet:'Laptop damaged in transit. Full refund processed. Customer opted out of replacement.' },
  { id:'RTL-ELEC-0063', domain:'Retail',    topic:'Service Dissatisfaction / Churn Risk', outcome:'Refund Processed',          score:0.82, snippet:'Loyalty membership cancellation after poor service. 3-month refund issued as retention offer, declined.' },
  { id:'RTL-FAST-0077', domain:'Retail',    topic:'Loyalty Program Dissatisfaction',    outcome:'Compensation Offered',         score:0.78, snippet:'Promo code not applying at checkout. Code expiry confirmed — alternate 10% code issued as goodwill.' },
  { id:'TEL-NETW-0007', domain:'Telecom',   topic:'Connectivity Issue',                 outcome:'Resolved via Troubleshooting', score:0.96, snippet:'No 4G signal in residential area. Tower maintenance confirmed. Hotspot workaround configured remotely.' },
  { id:'TEL-NETW-0025', domain:'Telecom',   topic:'Plan/Service Upgrade Inquiry',       outcome:'Information Provided',         score:0.93, snippet:'Customer upgrades to unlimited data plan. Prorated credit applied for current billing cycle.' },
  { id:'TEL-CORP-0044', domain:'Telecom',   topic:'Service Dissatisfaction / Churn Risk', outcome:'Compensation Offered',      score:0.89, snippet:'Customer threatening cancellation due to repeated dropped calls. Free device upgrade offered to retain.' },
  { id:'TEL-CORP-0061', domain:'Telecom',   topic:'Fee Dispute',                        outcome:'Billing Corrected',            score:0.84, snippet:'International roaming charges applied during domestic stay. Billing corrected, $78 credit issued.' },
  { id:'TEL-NETW-0083', domain:'Telecom',   topic:'Service Complaint',                  outcome:'Escalation Request',           score:0.80, snippet:'Intermittent fiber outages over 2 weeks. Technician visit scheduled for next business day.' },
  { id:'RTL-FAST-0093', domain:'Retail',    topic:'Delivery Delay',                     outcome:'Compensation Offered',         score:0.76, snippet:'Second consecutive delayed order for same customer. $15 store credit issued as automated exception.' },
];

// ── FILTER LOGIC ──────────────────────────────────────────
window.runFilter = function () {
  const domain = document.getElementById('f-domain').value;
  const topic  = document.getElementById('f-topic').value;
  const outcome = document.getElementById('f-outcome').value;

  const statusEl = document.getElementById('filterStatus');
  const statusText = document.getElementById('filterStatusText');
  const grid = document.getElementById('callGrid');

  statusEl.style.display = 'block';

  // Build pipeline description
  let pipes = [];
  if (domain)  pipes.push(`domain="${domain}" <strong>[must-match]</strong>`);
  if (topic)   pipes.push(`topic="${topic}" <strong>[should-match]</strong>`);
  if (outcome) pipes.push(`outcome="${outcome}" <strong>[should-match]</strong>`);
  statusText.innerHTML = pipes.length
    ? `Qdrant pre-filter: ${pipes.join(' · ')} → embedding re-rank`
    : 'No filters · full semantic search over corpus';

  grid.innerHTML = '<div style="padding:24px 20px;font-size:13px;color:#999;grid-column:1/-1;">Searching corpus…</div>';

  // Estimate total corpus matches BEFORE display cap
  const { calls: estCalls, tokens: estTokens } = estimateCorpusSize(domain, topic, outcome);

  setTimeout(() => {
    let results = CALL_CORPUS.filter(c => {
      if (domain  && c.domain  !== domain)  return false;
      if (topic   && c.topic   !== topic)   return false;
      if (outcome && c.outcome !== outcome) return false;
      return true;
    }).sort((a, b) => b.score - a.score);

    // If zero exact matches in our static set, broaden to domain-only
    const noExact = results.length === 0;
    if (noExact) {
      results = CALL_CORPUS
        .filter(c => !domain || c.domain === domain)
        .sort((a, b) => b.score - a.score);
    }

    const displayed = results.slice(0, 20);

    grid.innerHTML = '';
    if (displayed.length === 0) {
      grid.innerHTML = '<div style="padding:24px;font-size:13px;color:#999;grid-column:1/-1;">No results matched the selected filters.</div>';
      return;
    }

    displayed.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'call-card fade-up';
      card.innerHTML = `
        <div class="call-card-id">${c.id}<span class="call-card-score">${c.score.toFixed(2)}</span></div>
        <div class="call-card-domain">${c.domain}</div>
        <div class="call-card-topic">${c.topic}</div>
        <p style="font-size:12px;color:#777;line-height:1.55;margin:6px 0 10px;">${c.snippet}</p>
        <span class="call-card-outcome">${c.outcome}</span>
      `;
      grid.appendChild(card);
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));
    });

    // Build result summary line
    const capLabel = results.length > 20 ? `Showing top 20 of` : `Showing`;
    const fallbackNote = noExact ? ' (broadened — no exact match in static set)' : '';
    const canonCount = `~${fmtNum(estCalls)} calls`;
    const tokenApprox = `~${fmtNum(estTokens)} tokens`;
    statusText.innerHTML += `<br><span style="color:#111;">${capLabel} ${displayed.length}</span> · Full corpus match: <strong>${canonCount}</strong> · <strong>${tokenApprox}</strong>${fallbackNote}`;
  }, 550);
};

// ── AUTO-LOAD ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => window.runFilter(), 900);
});
