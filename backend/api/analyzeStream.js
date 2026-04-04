/**
 * POST /api/analyze/stream
 * Streaming version of the ESG Screener. Returns SSE events:
 *   { type: 'delta', text: '...' }   — partial JSON as Claude generates it
 *   { type: 'done',  result: {...}, _meta: {...} }  — final parsed result
 *   { type: 'error', message: '...' }
 *
 * Cache hits: simulates streaming by chunking the cached JSON with artificial delays.
 * Live calls: true token-by-token streaming from Claude via input_json_delta.
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithToolStream } from '../services/claude.js';
import { buildAnalyzePrompt, analyzeToolSchema } from '../services/prompts.js';

const SSE_HEADERS = {
  'Content-Type':  'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection':    'keep-alive',
  'X-Accel-Buffering': 'no', // disable nginx buffering in prod
};

function send(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function chunkSimulate(res, json) {
  const CHUNK = 18;
  for (let i = 0; i < json.length; i += CHUNK) {
    send(res, { type: 'delta', text: json.slice(i, i + CHUNK) });
    await new Promise(r => setTimeout(r, 22));
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const company = req.body;
  if (!company?.id) return res.status(400).json({ error: 'company id required' });

  Object.entries(SSE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.flushHeaders();

  const { systemPrompt, userPrompt } = buildAnalyzePrompt(company);
  const baseMeta = {
    model: 'claude-sonnet-4-6',
    tool:  analyzeToolSchema.name,
    timestamp: new Date().toISOString(),
    systemPrompt,
    userPrompt,
  };

  // ── Cache hit — simulate streaming ─────────────────────────────────────────
  const cached = getCachedResponse(company.id, 'analyze');
  if (cached) {
    await simulateThinking();
    await chunkSimulate(res, JSON.stringify(cached));
    send(res, { type: 'done', result: cached, _meta: { ...baseMeta, cached: true } });
    res.end();
    return;
  }

  // ── Live streaming ──────────────────────────────────────────────────────────
  try {
    const result = await callWithToolStream(systemPrompt, userPrompt, analyzeToolSchema, (delta) => {
      send(res, { type: 'delta', text: delta });
    });
    send(res, { type: 'done', result, _meta: { ...baseMeta, cached: false } });
    res.end();
  } catch (err) {
    console.error('[/api/analyze/stream]', err.message);
    send(res, { type: 'error', message: err.message });
    res.end();
  }
}
