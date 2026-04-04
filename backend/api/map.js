/**
 * POST /api/map
 * Framework Mapper — maps a company's ESG data across all applicable frameworks simultaneously.
 *
 * The data point to map is selected internally based on company.id
 * (each demo company has a pre-chosen "hero" data point for maximum impact).
 */

import { getCachedResponse, simulateThinking } from '../services/cache.js';
import { callWithTool } from '../services/claude.js';
import { buildMapPrompt, mapToolSchema } from '../services/prompts.js';

// Hero data point per company — same selection as precache.js
const DATA_POINTS = {
  'greentech-mfg': {
    metric: 'GHG Emissions (Scope 1 + Scope 2)',
    value: '8,200 tCO2e (Scope 1) + 4,300 tCO2e (Scope 2) = 12,500 tCO2e total',
    additionalContext: 'Manufacturing sector, Germany + Vietnam operations, 15,600,000 kWh energy, 12% renewable'
  },
  'cleanenergy-saas': {
    metric: 'Employee Diversity & Inclusion Metrics',
    value: '42% female workforce, 50% board gender diversity, 8.2% voluntary turnover, eNPS: 42',
    additionalContext: 'Software & IT Services sector, UK + Nordics, 95 employees'
  },
  'sustainable-retail': {
    metric: 'Supply Chain Scope 3 GHG Emissions',
    value: '45,000 tCO2e Scope 3 (vs 3,400 Scope 1 + 11,200 Scope 2), 16% supplier audit coverage (45/280)',
    additionalContext: 'Retail sector, France + Southeast Asia, EU Deforestation Regulation exposure'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { _screen1Result, ...company } = req.body;
  if (!company?.id) return res.status(400).json({ error: 'Request body must include company id' });

  const dataPoint = DATA_POINTS[company.id] ?? {
    metric: 'Primary ESG Data Point',
    value: `Sector: ${company.sector}. Revenue: $${((company.revenue ?? 0) / 1_000_000).toFixed(0)}M. Employees: ${company.employees ?? 'unknown'}.`,
    additionalContext: `${company.geography} operations. Regulatory exposure: ${(company.regulatoryExposure ?? []).join(', ') || 'CSRD, SFDR, TCFD'}.`
  };

  const { systemPrompt, userPrompt } = buildMapPrompt(company, dataPoint, _screen1Result);
  const baseMeta = {
    model: 'claude-sonnet-4-6',
    tool: mapToolSchema.name,
    timestamp: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    dataPoint,
  };

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = getCachedResponse(company.id, 'map');
  if (cached) {
    await simulateThinking();
    return res.json({ ...cached, _source: 'cached', _meta: { ...baseMeta, cached: true } });
  }

  // ── Live fallback ──────────────────────────────────────────────────────────
  try {
    const result = await callWithTool(systemPrompt, userPrompt, mapToolSchema);
    return res.json({ ...result, _source: 'live', _meta: { ...baseMeta, cached: false } });
  } catch (err) {
    console.error('[/api/map] Live call failed:', err.message);
    return res.status(500).json({ error: 'Framework mapping failed. Check API key and try again.' });
  }
}
