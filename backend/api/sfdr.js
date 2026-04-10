/**
 * POST /api/sfdr
 * SFDR Classification Agent — classifies a PE fund under Article 6, 8, or 9
 * based on the portfolio company's ESG profile.
 *
 * Demo flow:
 *   1. Cache hit  → simulate thinking → return cached classification
 *   2. Cache miss → call Claude live  → return live classification
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithTool } from '../services/claude.js';
import { buildSfdrPrompt, sfdrToolSchema } from '../services/prompts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { _screen1Result, ...company } = req.body;
  if (!company?.id) return res.status(400).json({ error: 'Request body must include company id' });

  const { systemPrompt, userPrompt } = buildSfdrPrompt(company, _screen1Result);
  const baseMeta = {
    model: 'claude-sonnet-4-6',
    tool: sfdrToolSchema.name,
    generatedAt: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    screen1ContextInjected: !!_screen1Result,
  };

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = getCachedResponse(company.id, 'sfdr');
  if (cached) {
    await simulateThinking();
    const cachedGeneratedAt = cached._meta?.generatedAt ?? baseMeta.generatedAt;
    return res.json({ ...cached, _source: 'cached', _meta: { ...baseMeta, generatedAt: cachedGeneratedAt, cached: true } });
  }

  // ── Live fallback ──────────────────────────────────────────────────────────
  try {
    const result = await callWithTool(systemPrompt, userPrompt, sfdrToolSchema);
    return res.json({ ...result, _source: 'live', _meta: { ...baseMeta, cached: false } });
  } catch (err) {
    console.error('[/api/sfdr] Live call failed:', err.message);
    return res.status(500).json({ error: 'SFDR classification failed. Check API key and try again.' });
  }
}
