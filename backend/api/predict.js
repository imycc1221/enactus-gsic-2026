/**
 * POST /api/predict
 * ESG Value Modeler — returns base case vs ESG scenario financial comparison.
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithTool } from '../services/claude.js';
import { buildPredictPrompt, predictToolSchema } from '../services/prompts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const company = req.body;
  if (!company?.id) return res.status(400).json({ error: 'Request body must include company id' });

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = getCachedResponse(company.id, 'predict');
  if (cached) {
    await simulateThinking();
    return res.json({ ...cached, _source: 'cached' });
  }

  // ── Live fallback ──────────────────────────────────────────────────────────
  try {
    const { systemPrompt, userPrompt } = buildPredictPrompt(company);
    const result = await callWithTool(systemPrompt, userPrompt, predictToolSchema);
    return res.json({ ...result, _source: 'live' });
  } catch (err) {
    console.error('[/api/predict] Live call failed:', err.message);
    return res.status(500).json({ error: 'Value prediction failed. Check API key and try again.' });
  }
}
