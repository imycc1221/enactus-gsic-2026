/**
 * POST /api/predict
 * ESG Value Modeler — returns base case vs ESG scenario financial comparison.
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithTool } from '../services/claude.js';
import { buildPredictPrompt, predictToolSchema } from '../services/prompts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { _screen1Result, ...company } = req.body;
  if (!company?.id) return res.status(400).json({ error: 'Request body must include company id' });

  const { systemPrompt, userPrompt } = buildPredictPrompt(company, _screen1Result);
  const baseMeta = {
    model: 'claude-sonnet-4-6',
    tool: predictToolSchema.name,
    generatedAt: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    screen1ContextInjected: !!_screen1Result,
  };

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = getCachedResponse(company.id, 'predict');
  if (cached) {
    await simulateThinking();
    const cachedGeneratedAt = cached._meta?.generatedAt ?? baseMeta.generatedAt;
    return res.json({ ...cached, _source: 'cached', _meta: { ...baseMeta, generatedAt: cachedGeneratedAt, cached: true } });
  }

  // ── Live fallback ──────────────────────────────────────────────────────────
  try {
    const result = await callWithTool(systemPrompt, userPrompt, predictToolSchema);
    return res.json({ ...result, _source: 'live', _meta: { ...baseMeta, cached: false } });
  } catch (err) {
    console.error('[/api/predict] Live call failed:', err.message);
    return res.status(500).json({ error: 'Value prediction failed. Check API key and try again.' });
  }
}
