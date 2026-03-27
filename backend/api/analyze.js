/**
 * POST /api/analyze
 * ESG Deal Screener — returns SASB-filtered ESG score, risk flags, and value opportunities.
 *
 * Demo flow:
 *   1. Cache hit  → simulate thinking delay → return cached response (99% of demo)
 *   2. Cache miss → call Claude live → return result (Q&A improvisation fallback)
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithTool } from '../services/claude.js';
import { buildAnalyzePrompt, analyzeToolSchema } from '../services/prompts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const company = req.body;
  if (!company?.id) return res.status(400).json({ error: 'Request body must include company id' });

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = getCachedResponse(company.id, 'analyze');
  if (cached) {
    await simulateThinking();
    return res.json({ ...cached, _source: 'cached' });
  }

  // ── Live fallback (for Q&A with unexpected inputs) ─────────────────────────
  try {
    const { systemPrompt, userPrompt } = buildAnalyzePrompt(company);
    const result = await callWithTool(systemPrompt, userPrompt, analyzeToolSchema);
    return res.json({ ...result, _source: 'live' });
  } catch (err) {
    console.error('[/api/analyze] Live call failed:', err.message);
    return res.status(500).json({ error: 'ESG analysis failed. Check API key and try again.' });
  }
}
