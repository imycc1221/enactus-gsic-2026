/**
 * prompts.js
 * All Claude prompt templates and tool schemas for the ESG Value Engine.
 *
 * Each exported builder returns { systemPrompt, userPrompt } so the
 * API routes stay thin and all prompt logic lives here.
 */

// ─── SHARED SYSTEM CONTEXT ───────────────────────────────────────────────────

const AGENT_CONTEXT = `You are an agent within Accenture's ESG Value Engine — a platform that helps private equity firms turn ESG from a compliance cost into a priced value creation lever.

Core thesis: Generic ESG measurement generates zero alpha. Industry-specific, MATERIAL ESG measurement generates 5.58% annualised alpha (Khan, Serafeim & Yoon, 2016, Harvard/The Accounting Review).

Platform principles:
- SASB's 77-industry materiality map determines which ESG issues matter for each company
- Every KPI must link to a specific EBITDA mechanism (not just "ESG score improved")
- Data confidence is scored 0-1 and displayed to LPs — trust is the product
- Responsible AI: every output includes reasoning trace for human review (Accenture RAI principles)`;

// ─── ANALYZE TOOL SCHEMA ─────────────────────────────────────────────────────

export const analyzeToolSchema = {
  name: 'esg_deal_analysis',
  description: 'Output a complete ESG deal analysis for a private equity target company',
  input_schema: {
    type: 'object',
    properties: {
      overallScore:        { type: 'number', description: 'ESG materiality score 0-100' },
      sasbClassification:  { type: 'string' },
      materialKpis: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kpi:        { type: 'string' },
            why:        { type: 'string' },
            ebitdaLink: { type: 'string' },
            dataStatus: { type: 'string', enum: ['available', 'partial', 'missing'] }
          },
          required: ['kpi', 'why', 'ebitdaLink', 'dataStatus']
        }
      },
      pillarScores: {
        type: 'object',
        properties: {
          environmental: { type: 'number' },
          social:        { type: 'number' },
          governance:    { type: 'number' }
        },
        required: ['environmental', 'social', 'governance']
      },
      riskFlags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity:          { type: 'string', enum: ['high', 'medium', 'low'] },
            area:              { type: 'string' },
            detail:            { type: 'string' },
            financialExposure: { type: 'string' }
          },
          required: ['severity', 'area', 'detail', 'financialExposure']
        }
      },
      valueOpportunities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            initiative:             { type: 'string' },
            estimatedAnnualSavings: { type: 'string' },
            irrImpact:              { type: 'string' },
            paybackMonths:          { type: 'number' },
            implementation:         { type: 'string' }
          },
          required: ['initiative', 'estimatedAnnualSavings', 'irrImpact', 'paybackMonths']
        }
      },
      frameworkGaps: {
        type: 'object',
        properties: {
          csrd: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          sfdr: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          tcfd: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          edci: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          sasb: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } }
        }
      },
      dataConfidenceScore: { type: 'number' },
      recommendation:      { type: 'string' },
      quickWins:           { type: 'array', items: { type: 'string' } }
    },
    required: ['overallScore', 'sasbClassification', 'materialKpis', 'pillarScores', 'riskFlags', 'valueOpportunities', 'frameworkGaps', 'dataConfidenceScore', 'recommendation', 'quickWins']
  }
};

// ─── PREDICT TOOL SCHEMA ─────────────────────────────────────────────────────

export const predictToolSchema = {
  name: 'esg_value_prediction',
  description: 'Model ESG-driven financial value creation across a PE holding period',
  input_schema: {
    type: 'object',
    properties: {
      baseCase: {
        type: 'object',
        properties: {
          entryMultiple: { type: 'number' },
          exitMultiple:  { type: 'number' },
          projectedIrr:  { type: 'number' },
          projectedMoic: { type: 'number' },
          exitEv:        { type: 'number' }
        },
        required: ['entryMultiple', 'exitMultiple', 'projectedIrr', 'projectedMoic', 'exitEv']
      },
      withEsgInterventions: {
        type: 'object',
        properties: {
          exitMultiple:           { type: 'number' },
          projectedIrr:           { type: 'number' },
          projectedMoic:          { type: 'number' },
          exitEv:                 { type: 'number' },
          irrUplift:              { type: 'number' },
          additionalValueCreated: { type: 'number' }
        },
        required: ['exitMultiple', 'projectedIrr', 'projectedMoic', 'exitEv', 'irrUplift', 'additionalValueCreated']
      },
      esgBreakdown: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            intervention:       { type: 'string' },
            totalCost:          { type: 'number' },
            annualSavings:      { type: 'number' },
            cumulativeSavings:  { type: 'number' },
            exitMultipleImpact: { type: 'string' },
            irrContribution:    { type: 'string' },
            paybackMonths:      { type: 'number' }
          },
          required: ['intervention', 'totalCost', 'annualSavings', 'exitMultipleImpact', 'irrContribution']
        }
      },
      esgImplementationCost: {
        type: 'object',
        properties: {
          year1Setup:    { type: 'number' },
          annualOngoing: { type: 'number' },
          totalFiveYear: { type: 'number' }
        }
      },
      riskMitigation: {
        type: 'object',
        properties: {
          regulatoryRiskReduction: { type: 'string' },
          greenwashingRiskBefore:  { type: 'number' },
          greenwashingRiskAfter:   { type: 'number' },
          strandedAssetRisk:       { type: 'string' },
          lpRetentionImpact:       { type: 'string' }
        }
      },
      exitNarrative:          { type: 'string' },
      netRoiOnEsgInvestment:  { type: 'string' }
    },
    required: ['baseCase', 'withEsgInterventions', 'esgBreakdown', 'esgImplementationCost', 'riskMitigation', 'exitNarrative', 'netRoiOnEsgInvestment']
  }
};

// ─── MAP TOOL SCHEMA ──────────────────────────────────────────────────────────

export const mapToolSchema = {
  name: 'framework_mapping',
  description: 'Map a single ESG data point across all applicable regulatory frameworks',
  input_schema: {
    type: 'object',
    properties: {
      inputSummary: { type: 'string' },
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            framework:   { type: 'string' },
            standard:    { type: 'string' },
            dataPoint:   { type: 'string' },
            format:      { type: 'string' },
            materiality: { type: 'string' },
            status:      { type: 'string', enum: ['compliant', 'needs_conversion', 'needs_enrichment', 'partial', 'not_applicable'] },
            note:        { type: 'string' },
            automatable: { type: 'boolean' }
          },
          required: ['framework', 'standard', 'dataPoint', 'format', 'materiality', 'status', 'automatable']
        }
      },
      summary:             { type: 'string' },
      automationPotential: { type: 'string' },
      missingToComplete:   { type: 'array', items: { type: 'string' } }
    },
    required: ['inputSummary', 'mappings', 'summary', 'automationPotential', 'missingToComplete']
  }
};

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────

export function buildAnalyzePrompt(company) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the ESG Deal Screener Agent. Your job is to run the first pass on a potential acquisition target. You apply SASB materiality filtering — the PE investment committee only wants to know about ESG factors that will actually move EBITDA or valuation.`;

  const userPrompt = `Analyze this PE acquisition target for material ESG investment potential:

${JSON.stringify(company, null, 2)}

Focus only on the 5-7 ESG issues that are financially material for this specific SASB industry. Link every risk flag and value opportunity to a specific dollar amount. Score data confidence honestly based on what's available.`;

  return { systemPrompt, userPrompt };
}

export function buildPredictPrompt(company) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the Value Modeler Agent. You use Monte Carlo principles and sector benchmarks to show PE partners the probability distribution of outcomes before they commit capital. You convert "ESG might create value" into "here is the expected EBITDA impact under conservative, base, and aggressive scenarios."

Key benchmarks to apply:
- BCG 2025: 4-7% EBITDA growth from material sustainability initiatives
- EY-Parthenon: AAA ESG profile → +7.8pp IRR vs BBB baseline
- PRI/Bain/NYU Stern 2025: 6-7% exit multiple uplift for strong ESG profiles
- Liu 2024 (Springer): ESG scores 4 years prior → greatest impact on current returns (aligns with PE holding periods)
- Verdantix/KnowESG 2024: Year 1 ESG setup $310K-$705K; annual ongoing $250K-$530K`;

  const userPrompt = `Model the financial impact of deploying the ESG Value Engine for this portfolio company:

${JSON.stringify(company, null, 2)}

Show base case (no ESG program) vs. with ESG interventions. Break down 3-4 specific initiatives appropriate for this sector. All numbers should be internally consistent with the company's revenue and EBITDA.`;

  return { systemPrompt, userPrompt };
}

export function buildMapPrompt(company, dataPoint) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the Framework Mapper Agent. You solve the "too many frameworks" problem by taking ONE data input and mapping it to ALL applicable regulatory frameworks simultaneously. You are technically precise — you cite specific ESRS article numbers, SFDR PAI indicator numbers, GRI standards, and SASB industry codes.`;

  const userPrompt = `Map this ESG data point across all frameworks applicable to this portfolio company:

Company: ${JSON.stringify({ name: company.name, sector: company.sector, geography: company.geography, regulatoryExposure: company.regulatoryExposure }, null, 2)}

Data Point: ${JSON.stringify(dataPoint, null, 2)}

For each applicable framework, specify the exact standard reference, required format, and whether our AI can perform the conversion automatically. Demonstrate the "one input → six outputs" value proposition.`;

  return { systemPrompt, userPrompt };
}
