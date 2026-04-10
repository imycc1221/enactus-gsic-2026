/**
 * POST /api/greenwash
 * Greenwashing Forensics Agent — cross-references ESG claims against
 * available data to identify disclosure gaps and regulatory exposure.
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithTool } from '../services/claude.js';
import { buildGreenwashPrompt, greenwashToolSchema } from '../services/prompts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { _screen1Result, ...company } = req.body;
  if (!company?.id) return res.status(400).json({ error: 'company id required' });

  const { systemPrompt, userPrompt } = buildGreenwashPrompt(company, _screen1Result);
  const baseMeta = {
    model: 'claude-sonnet-4-6',
    tool:  greenwashToolSchema.name,
    generatedAt: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    screen1ContextInjected: !!_screen1Result,
  };

  const cached = getCachedResponse(company.id, 'greenwash');
  if (cached) {
    await simulateThinking();
    const cachedGeneratedAt = cached._meta?.generatedAt ?? baseMeta.generatedAt;
    return res.json({ ...cached, _source: 'cached', _meta: { ...baseMeta, generatedAt: cachedGeneratedAt, cached: true } });
  }

  try {
    const result = await callWithTool(systemPrompt, userPrompt, greenwashToolSchema);
    return res.json({ ...result, _source: 'live', _meta: { ...baseMeta, cached: false } });
  } catch (err) {
    console.error('[/api/greenwash]', err.message);
    return res.status(500).json({ error: 'Greenwash analysis failed. Check API key and try again.' });
  }
}
