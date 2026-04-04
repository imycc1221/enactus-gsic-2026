/**
 * precache.js
 * Run once during development to generate all 9 cached AI responses.
 * Usage: node scripts/precache.js
 *
 * Generates: backend/data/cache/{companyId}-{endpoint}.json (9 files total)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../backend/data/cache');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── COMPANY PROFILES ────────────────────────────────────────────────────────

const companies = [
  {
    id: 'greentech-mfg',
    name: 'GreenTech Manufacturing Co.',
    sector: 'Industrial Manufacturing',
    sasbSector: 'Industrial Machinery & Goods (IF-MS)',
    geography: 'Germany + Vietnam',
    revenue: 85000000,
    ebitda: 12750000,
    employees: 420,
    description: 'Mid-market manufacturer of industrial components. Some emissions tracking in place, no formal ESG reporting. Strong governance but weak environmental data completeness.',
    availableData: {
      ghgEmissions:        { available: true,  scope1: 8200, scope2: 4300, scope3: null,  unit: 'tCO2e' },
      energyConsumption:   { available: true,  kwh: 15600000, renewablePercent: 12 },
      waterUsage:          { available: false },
      workforceDiversity:  { available: true,  femalePercent: 28, boardDiversity: 33 },
      supplyChainAudit:    { available: false },
      boardGovernance:     { available: true,  independentDirectors: 3, totalDirectors: 7 },
      employeeSafety:      { available: true,  ltirRate: 2.1, trainingHoursPerEmployee: 18 }
    },
    regulatoryExposure: ['CSRD (Germany operations)', 'EU Taxonomy', 'Vietnam local labor law'],
    peInvestmentContext: { investmentAmount: 72250000, holdingPeriod: 5, targetExitMultiple: 10 }
  },
  {
    id: 'cleanenergy-saas',
    name: 'CleanEnergy SaaS Platform',
    sector: 'Technology / Clean Energy',
    sasbSector: 'Software & IT Services (TC-SI)',
    geography: 'UK + Nordics (Sweden, Denmark)',
    revenue: 22000000,
    ebitda: 5500000,
    employees: 95,
    description: 'B2B SaaS platform helping utilities manage renewable energy portfolios. Low direct emissions, high growth, strong social metrics. Limited Scope 3 visibility (customer usage emissions).',
    availableData: {
      ghgEmissions:        { available: true,  scope1: 120, scope2: 890, scope3: null, unit: 'tCO2e' },
      energyConsumption:   { available: true,  kwh: 480000, renewablePercent: 78 },
      waterUsage:          { available: true,  cubicMeters: 1200 },
      workforceDiversity:  { available: true,  femalePercent: 42, boardDiversity: 50 },
      supplyChainAudit:    { available: false },
      boardGovernance:     { available: true,  independentDirectors: 2, totalDirectors: 5 },
      employeeEngagement:  { available: true,  voluntaryTurnoverRate: 8.2, eNPS: 42 }
    },
    regulatoryExposure: ['UK SDR', 'SFDR (Nordic LP base)', 'EU AI Act (SaaS product)'],
    peInvestmentContext: { investmentAmount: 19250000, holdingPeriod: 5, targetExitMultiple: 12 }
  },
  {
    id: 'sustainable-retail',
    name: 'Sustainable Retail Group',
    sector: 'Consumer Retail',
    sasbSector: 'Food & Beverage Retailers (FB-FR) / Apparel (CG-AA)',
    geography: 'France + Southeast Asia (Vietnam, Thailand, Indonesia)',
    revenue: 150000000,
    ebitda: 18000000,
    employees: 1200,
    description: 'Retailer with growing sustainable product lines. Complex supply chain across 8 countries. Some ESG reporting but inconsistent quality. Scope 3 data available but supply chain audit coverage low.',
    availableData: {
      ghgEmissions:        { available: true,  scope1: 3400, scope2: 11200, scope3: 45000, unit: 'tCO2e' },
      energyConsumption:   { available: true,  kwh: 38000000, renewablePercent: 31 },
      waterUsage:          { available: true,  cubicMeters: 85000 },
      workforceDiversity:  { available: true,  femalePercent: 55, boardDiversity: 25 },
      supplyChainAudit:    { available: true,  suppliersAudited: 45, totalSuppliers: 280, auditCoverage: '16%' },
      boardGovernance:     { available: true,  independentDirectors: 2, totalDirectors: 8 },
      productSustainability: { available: true, sustainableProductsPercent: 34, packagingRecyclable: 61 }
    },
    regulatoryExposure: ['CSRD (France operations)', 'SFDR', 'France Duty of Vigilance Law', 'EU Deforestation Regulation'],
    peInvestmentContext: { investmentAmount: 144000000, holdingPeriod: 6, targetExitMultiple: 9 }
  }
];

// ─── TOOL SCHEMAS ─────────────────────────────────────────────────────────────

const analyzeToolSchema = {
  name: 'esg_deal_analysis',
  description: 'Output a complete ESG deal analysis for a private equity target company',
  input_schema: {
    type: 'object',
    properties: {
      overallScore: { type: 'number', description: 'ESG score 0-100 based on available data and material issues' },
      sasbClassification: { type: 'string', description: 'Confirmed SASB industry classification' },
      materialKpis: {
        type: 'array',
        description: 'The 5-7 ESG KPIs that are financially material for this specific SASB industry',
        items: {
          type: 'object',
          properties: {
            kpi:        { type: 'string' },
            why:        { type: 'string', description: 'Why this is financially material in this sector' },
            ebitdaLink: { type: 'string', description: 'Specific EBITDA impact mechanism e.g. "15% energy cost reduction = $X savings"' },
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
            financialExposure: { type: 'string', description: 'Estimated financial cost if this risk materialises' }
          },
          required: ['severity', 'area', 'detail', 'financialExposure']
        }
      },
      valueOpportunities: {
        type: 'array',
        description: 'Top 3-4 ESG improvement initiatives with quantified EBITDA impact',
        items: {
          type: 'object',
          properties: {
            initiative:            { type: 'string' },
            estimatedAnnualSavings:{ type: 'string', description: 'Dollar value e.g. "$1.2M/year"' },
            irrImpact:             { type: 'string', description: 'e.g. "+1.4pp IRR"' },
            paybackMonths:         { type: 'number' },
            implementation:        { type: 'string', description: 'Brief how-to' }
          },
          required: ['initiative', 'estimatedAnnualSavings', 'irrImpact', 'paybackMonths']
        }
      },
      frameworkGaps: {
        type: 'object',
        description: 'Compliance percentage for each applicable framework',
        properties: {
          csrd: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          sfdr: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          tcfd: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          edci: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } },
          sasb: { type: 'object', properties: { compliant: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' }, keyGaps: { type: 'array', items: { type: 'string' } } } }
        }
      },
      dataConfidenceScore: { type: 'number', description: '0.0-1.0 confidence in this analysis based on data completeness' },
      recommendation:       { type: 'string', description: '2-3 sentence invest/pass/conditional recommendation' },
      quickWins:            { type: 'array', items: { type: 'string' }, description: '3 actions to take in first 100 days post-acquisition' }
    },
    required: ['overallScore', 'sasbClassification', 'materialKpis', 'pillarScores', 'riskFlags', 'valueOpportunities', 'frameworkGaps', 'dataConfidenceScore', 'recommendation', 'quickWins']
  }
};

const predictToolSchema = {
  name: 'esg_value_prediction',
  description: 'Model ESG-driven financial value creation across a PE holding period',
  input_schema: {
    type: 'object',
    properties: {
      baseCase: {
        type: 'object',
        description: 'Returns WITHOUT active ESG value creation program',
        properties: {
          entryMultiple:  { type: 'number' },
          exitMultiple:   { type: 'number' },
          projectedIrr:   { type: 'number' },
          projectedMoic:  { type: 'number' },
          exitEv:         { type: 'number' }
        },
        required: ['entryMultiple', 'exitMultiple', 'projectedIrr', 'projectedMoic', 'exitEv']
      },
      withEsgInterventions: {
        type: 'object',
        description: 'Returns WITH Accenture ESG Value Engine deployed',
        properties: {
          entryMultiple:          { type: 'number' },
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
        description: 'Individual ESG initiative contributions to value creation',
        items: {
          type: 'object',
          properties: {
            intervention:        { type: 'string' },
            totalCost:           { type: 'number' },
            annualSavings:       { type: 'number' },
            cumulativeSavings:   { type: 'number' },
            exitMultipleImpact:  { type: 'string' },
            irrContribution:     { type: 'string' },
            paybackMonths:       { type: 'number' }
          },
          required: ['intervention', 'totalCost', 'annualSavings', 'exitMultipleImpact', 'irrContribution']
        }
      },
      esgImplementationCost: {
        type: 'object',
        properties: {
          year1Setup:     { type: 'number' },
          annualOngoing:  { type: 'number' },
          totalFiveYear:  { type: 'number' }
        }
      },
      riskMitigation: {
        type: 'object',
        properties: {
          regulatoryRiskReduction:   { type: 'string' },
          greenwashingRiskBefore:    { type: 'number', description: '0-10 risk score' },
          greenwashingRiskAfter:     { type: 'number' },
          strandedAssetRisk:         { type: 'string' },
          lpRetentionImpact:         { type: 'string' }
        }
      },
      exitNarrative: { type: 'string', description: 'The ESG story a buyer will see at exit — why they pay a premium' },
      netRoiOnEsgInvestment: { type: 'string', description: 'e.g. "6.2x" — total value created / total ESG spend' }
    },
    required: ['baseCase', 'withEsgInterventions', 'esgBreakdown', 'esgImplementationCost', 'riskMitigation', 'exitNarrative', 'netRoiOnEsgInvestment']
  }
};

const mapToolSchema = {
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
            standard:    { type: 'string', description: 'Specific standard/article e.g. "ESRS E1-6"' },
            dataPoint:   { type: 'string', description: 'Exact field name in that framework' },
            format:      { type: 'string', description: 'Required unit/format' },
            materiality: { type: 'string', description: 'Financial, impact, or double materiality' },
            status:      { type: 'string', enum: ['compliant', 'needs_conversion', 'needs_enrichment', 'partial', 'not_applicable'] },
            note:        { type: 'string' },
            automatable: { type: 'boolean', description: 'Can this conversion be done automatically by AI?' }
          },
          required: ['framework', 'standard', 'dataPoint', 'format', 'materiality', 'status', 'automatable']
        }
      },
      summary:             { type: 'string' },
      automationPotential: { type: 'string', description: 'How much of the cross-framework work can be automated' },
      missingToComplete:   { type: 'array', items: { type: 'string' }, description: 'Additional data needed to achieve full compliance' }
    },
    required: ['inputSummary', 'mappings', 'summary', 'automationPotential', 'missingToComplete']
  }
};

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────

function buildAnalyzePrompt(company) {
  return `You are the ESG Deal Screener Agent within Accenture's ESG Value Engine — a PE-focused platform built on SASB's 77-industry materiality framework.

Your task: Analyze this private equity acquisition target for ESG investment potential. Focus ONLY on the 5-7 ESG issues that are financially material for this specific SASB industry classification. Do NOT report generic ESG metrics — only what drives EBITDA in this sector.

COMPANY DATA:
${JSON.stringify(company, null, 2)}

ANALYTICAL FRAMEWORK:
1. SASB Classification: Identify the correct SASB industry and its ~6 material topics
2. Materiality Filter: For each data point available, assess whether it's financially material (i.e., could it affect revenue, costs, or valuation?)
3. Data Quality: Score confidence based on what's available vs. what's needed
4. Value Creation: For each gap/opportunity, estimate EBITDA impact in dollar terms
5. Risk Flags: Identify ESG risks that could lower valuation or create regulatory exposure
6. Framework Compliance: Map available data to CSRD, SFDR, TCFD, EDCI, SASB

IMPORTANT CALIBRATION:
- This is a real PE deal analysis. Be specific and quantitative.
- Reference actual framework requirements (e.g., "CSRD ESRS E1-6 requires absolute Scope 1+2 GHG")
- Link every value opportunity to a specific EBITDA mechanism
- Be honest about data gaps — low confidence is fine and should be flagged
- The dataConfidenceScore should reflect actual data completeness, not optimism

Use the esg_deal_analysis tool to output your complete analysis.`;
}

function buildPredictPrompt(company) {
  return `You are the Value Modeler Agent within Accenture's ESG Value Engine. You use financial modeling to show PE firms the quantified ROI of ESG improvements BEFORE they commit capital.

Your task: Model the financial impact of a structured ESG improvement program for this portfolio company across its holding period.

COMPANY DATA:
${JSON.stringify(company, null, 2)}

MODELING INSTRUCTIONS:

BASE CASE (no active ESG program):
- Use sector-appropriate entry/exit multiples for a company of this size and geography
- Apply realistic IRR based on market conditions (PE mid-market: typically 15-22% target)
- The base case represents what happens if ESG is treated as compliance-only

WITH ESG VALUE ENGINE (active program):
- Apply BCG 2025 research: 4-7% EBITDA growth from material sustainability initiatives
- Apply EY-Parthenon finding: AAA ESG profile → +7.8pp IRR vs BBB baseline
- Exit multiple uplift: PRI/Bain/NYU Stern (2025): 6-7% multiple uplift for strong ESG profile
- ESG scores 4 years prior have GREATEST impact on current-year stock returns (Liu 2024) — perfectly aligned with PE holding periods

ESG IMPLEMENTATION COSTS (use Verdantix/KnowESG 2024-2026 benchmarks):
- Year 1 setup: $310K-$705K (consulting, software, training, certifications)
- Annual ongoing (Years 2-5): $250K-$530K/yr
- Total 5-year: $1.3M-$2.8M

BREAKDOWN BY INITIATIVE:
Model 3-4 specific interventions appropriate for this company's sector and gaps. Each should have:
- Realistic cost
- Specific annual savings mechanism (not generic "ESG improvement")
- Exit multiple contribution
- Payback period

Use the esg_value_prediction tool to output your complete financial model.`;
}

function buildMapPrompt(company) {
  // For the framework mapper, we'll use the most interesting data point for each company
  const dataPoints = {
    'greentech-mfg': {
      metric: 'GHG Emissions (Scope 1 + Scope 2)',
      value: '8,200 tCO2e (Scope 1) + 4,300 tCO2e (Scope 2) = 12,500 tCO2e total',
      additionalContext: 'Manufacturing sector, Germany + Vietnam operations, 15,600,000 kWh energy consumption, 12% renewable energy'
    },
    'cleanenergy-saas': {
      metric: 'Employee Diversity & Inclusion Metrics',
      value: '42% female workforce, 50% board gender diversity, 8.2% voluntary turnover, eNPS: 42',
      additionalContext: 'Software & IT Services sector, UK + Nordics, 95 employees, no supply chain audit data'
    },
    'sustainable-retail': {
      metric: 'Supply Chain Scope 3 GHG Emissions',
      value: '45,000 tCO2e Scope 3 (vs 3,400 Scope 1 + 11,200 Scope 2), 16% supplier audit coverage (45/280 suppliers)',
      additionalContext: 'Retail sector, France + Southeast Asia, EU Deforestation Regulation exposure, France Duty of Vigilance Law'
    }
  };

  const dp = dataPoints[company.id];

  return `You are the Framework Mapper Agent within Accenture's ESG Value Engine. You demonstrate the "one data input → multi-framework output" capability that is the core solution to the fragmented standards problem.

Your task: Take this single ESG data point from a portfolio company and show exactly how it maps across ALL applicable regulatory frameworks simultaneously.

PORTFOLIO COMPANY:
${JSON.stringify({ id: company.id, name: company.name, sector: company.sector, geography: company.geography, regulatoryExposure: company.regulatoryExposure }, null, 2)}

DATA POINT TO MAP:
Metric: ${dp.metric}
Value: ${dp.value}
Context: ${dp.additionalContext}

MAPPING INSTRUCTIONS:
For each applicable framework (CSRD/ESRS, SFDR, TCFD, GRI, SASB, EDCI):
1. Identify the EXACT standard/article that requires this data
2. Specify the required format/unit (frameworks often require different normalizations)
3. Determine if the data as provided is immediately compliant, needs conversion, or needs enrichment
4. Note whether an AI agent can perform the conversion automatically

KEY INSIGHT TO DEMONSTRATE:
This is the solution to "too many frameworks, too much complexity." The company reports ONE data point. Our system maps it to SIX frameworks simultaneously. Regulators get automated filings. PE firms get compliance dashboards. Accenture's consulting layer ensures strategic interpretation.

Be technically accurate — cite specific ESRS numbers, SFDR PAI indicators, TCFD categories, GRI standards, and SASB industry-specific codes.

Use the framework_mapping tool to output your complete mapping.`;
}

// ─── RUNNER ───────────────────────────────────────────────────────────────────

async function generateResponse(company, endpoint) {
  let prompt, toolSchema;

  if (endpoint === 'analyze') {
    prompt = buildAnalyzePrompt(company);
    toolSchema = analyzeToolSchema;
  } else if (endpoint === 'predict') {
    prompt = buildPredictPrompt(company);
    toolSchema = predictToolSchema;
  } else if (endpoint === 'map') {
    prompt = buildMapPrompt(company);
    toolSchema = mapToolSchema;
  }

  console.log(`  Calling Claude for ${company.id}/${endpoint}...`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    tools: [toolSchema],
    tool_choice: { type: 'tool', name: toolSchema.name },
    messages: [{ role: 'user', content: prompt }]
  });

  // tool_choice forces a tool call — safe to access directly
  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error(`No tool use block returned for ${company.id}/${endpoint}`);

  return toolUse.input;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable not set.');
    console.error('Run: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  // Ensure cache directory exists
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const endpoints = ['analyze', 'predict', 'map'];
  let successCount = 0;
  let failCount = 0;

  for (const company of companies) {
    console.log(`\n▶ Processing ${company.name}`);

    for (const endpoint of endpoints) {
      const cacheFile = path.join(CACHE_DIR, `${company.id}-${endpoint}.json`);

      // Skip if already cached (remove file manually to regenerate)
      if (fs.existsSync(cacheFile)) {
        console.log(`  ✓ ${company.id}/${endpoint} already cached — skipping`);
        successCount++;
        continue;
      }

      try {
        const result = await generateResponse(company, endpoint);

        // Add metadata to cached response
        const cacheEntry = {
          _meta: {
            generatedAt: new Date().toISOString(),
            companyId: company.id,
            endpoint,
            model: 'claude-sonnet-4-6'
          },
          ...result
        };

        fs.writeFileSync(cacheFile, JSON.stringify(cacheEntry, null, 2));
        console.log(`  ✅ ${company.id}/${endpoint} → saved to cache`);
        successCount++;

        // Polite rate limiting between calls
        await new Promise(r => setTimeout(r, 1000));

      } catch (err) {
        console.error(`  ❌ ${company.id}/${endpoint} FAILED: ${err.message}`);
        failCount++;
      }
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`Precaching complete: ${successCount} success, ${failCount} failed`);
  console.log(`Cache location: ${CACHE_DIR}`);

  if (failCount > 0) {
    console.log('\nTo retry failed items, delete the failed cache files and re-run.');
    process.exit(1);
  }
}

main();
