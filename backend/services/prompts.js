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
- SASB's 77-industry materiality map (actively maintained by ISSB, under comprehensive review 2025-2026) determines which ESG issues matter for each company
- Every KPI must link to a specific EBITDA mechanism (not just "ESG score improved")
- Data confidence is scored 0-1 and displayed to LPs — trust is the product
- Responsible AI: every output includes reasoning trace for human review (Accenture RAI principles)

Current regulatory landscape (as of April 2026 — use this in all assessments):
CSRD/ESRS: Omnibus I Directive (EU) 2026/470 enacted 18 March 2026. Scope reduced to 1,000+ employees AND €450M+ turnover (~80% of companies removed). Wave 2 delayed to FY2027 (report 2028). Simplified ESRS delegated act expected Q2 2026. Double materiality retained for in-scope companies.
EU Taxonomy: Simplification delegated act in force 8 Jan 2026. 10% materiality threshold — activities below 10% of turnover/CapEx/OpEx excluded. Data points reduced 64% for non-financial companies.
EUDR: Second delay enacted Dec 2025. Large operators: 30 December 2026. SMEs: 30 June 2027. Simplified: only first-placer on EU market responsible for due diligence. Printed products removed from scope.
CSDDD/CS3D: Omnibus I raised thresholds to 5,000+ employees AND €1.5B+ turnover. Compliance required from 26 July 2029. France Duty of Vigilance (national law) unchanged.
SFDR 2.0: EC proposal Nov 2025, trilogue ongoing. Expected implementation 2028-2029. Three categories: ESG Basics / Transition / Sustainable. Entity-level PAI abolished. 70% threshold. No grandfathering.
ISSB: IFRS S1+S2 active in 36 jurisdictions. S2 amended (Scope 3 Cat.15 exclusion, effective 2027). Biodiversity/BEES standard exposure draft forthcoming. SASB under comprehensive ISSB review (ED published July 2025, final updates expected 2026).
UK SDR: Fully in force. Anti-greenwashing rule since May 2024. Four labels since July 2024. Naming/marketing rules since April 2025.
France Duty of Vigilance: Threshold is 5,000 employees in France OR 10,000 employees worldwide (incl. subsidiaries). Only large multinationals qualify — most PE portfolio companies are below this threshold.
GRI 18 Biodiversity: New GRI Topic Standard effective January 2026. Covers biodiversity impacts and dependencies, aligned with TNFD. Relevant for nature-risk exposed companies (deforestation, land use, water).
SASB: Under comprehensive ISSB review. Exposure drafts published July 2025 for 9 priority industries + 41 others. Final updated standards expected 2026. 77-industry materiality map remains the authoritative reference.`;

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

// ─── SFDR TOOL SCHEMA ────────────────────────────────────────────────────────

export const sfdrToolSchema = {
  name: 'sfdr_classification',
  description: 'Classify a PE fund under SFDR 1.0 (Article 6/8/9) AND SFDR 2.0 (ESG Basics/Transition/Sustainable) dual-readiness assessment',
  input_schema: {
    type: 'object',
    properties: {
      recommendedArticle:    { type: 'string', enum: ['Article 6', 'Article 8', 'Article 9'] },
      confidence:            { type: 'string', enum: ['high', 'medium', 'low'] },
      rationale:             { type: 'string' },
      qualifyingFactors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            factor:     { type: 'string' },
            assessment: { type: 'string' },
            status:     { type: 'string', enum: ['met', 'partial', 'not_met'] }
          },
          required: ['factor', 'assessment', 'status']
        }
      },
      principalAdverseImpacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            indicator: { type: 'string' },
            available: { type: 'boolean' },
            value:     { type: 'string' },
            gap:       { type: 'string' }
          },
          required: ['indicator', 'available', 'gap']
        }
      },
      upgradePath: {
        type: 'object',
        properties: {
          currentArticle:          { type: 'string' },
          nextArticle:             { type: 'string' },
          requiredActions:         { type: 'array', items: { type: 'string' } },
          estimatedTimeToUpgrade:  { type: 'string' }
        },
        required: ['currentArticle', 'nextArticle', 'requiredActions', 'estimatedTimeToUpgrade']
      },
      disclosureRequirements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            requirement: { type: 'string' },
            status:      { type: 'string', enum: ['compliant', 'partial', 'missing'] },
            action:      { type: 'string' }
          },
          required: ['requirement', 'status', 'action']
        }
      },
      lpNarrative:    { type: 'string' },
      regulatoryRisk: { type: 'string' },

      // ── SFDR 2.0 Dual-Readiness (EC proposal Nov 2025, expected 2028-2029) ──
      sfdr2: {
        type: 'object',
        properties: {
          category:   { type: 'string', enum: ['Sustainable', 'Transition', 'ESG Basics', 'Non-categorised'], description: 'Shadow classification under SFDR 2.0 three-tier system' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          rationale:  { type: 'string', description: 'Why this 2.0 category — differences from 1.0 classification explained' },
          exclusionCompliance: {
            type: 'object',
            description: 'Mandatory exclusions required for all SFDR 2.0 categories',
            properties: {
              weapons:  { type: 'boolean', description: 'No investments in controversial weapons' },
              tobacco:  { type: 'boolean', description: 'No investments in tobacco production' },
              coal:     { type: 'boolean', description: 'No coal ≥1% revenue threshold breach' },
              ungcOecd: { type: 'string',  description: 'UNGC / OECD Guidelines compliance status: pass, at_risk, or fail' }
            },
            required: ['weapons', 'tobacco', 'coal', 'ungcOecd']
          },
          threshold70pct: {
            type: 'object',
            description: '70% binding investment threshold — required for Transition or Sustainable',
            properties: {
              met:             { type: 'boolean' },
              currentEstimate: { type: 'string', description: 'Best estimate of current threshold %, e.g. ~35-40%' },
              gap:             { type: 'string', description: 'What data or actions are needed to demonstrate or achieve the threshold' }
            },
            required: ['met', 'currentEstimate', 'gap']
          },
          taxonomyShortcut: {
            type: 'object',
            description: 'EU Taxonomy shortcut — ≥15% taxonomy-aligned CapEx/OpEx unlocks Sustainable category',
            properties: {
              applicable:        { type: 'boolean' },
              taxonomyAlignment: { type: 'string', description: 'Estimated EU Taxonomy alignment % and basis' }
            },
            required: ['applicable', 'taxonomyAlignment']
          },
          keyChanges:       { type: 'array', items: { type: 'string' }, description: 'Key differences between 1.0 and 2.0 classification for this fund' },
          gaps:             { type: 'array', items: { type: 'string' }, description: 'Specific gaps to close to achieve or maintain the 2.0 category' },
          migrationTimeline:{ type: 'string', description: 'Recommended preparation timeline given 2028-2029 implementation window' },
          marketingRisk: {
            type: 'object',
            description: 'Marketing and fund naming rights under SFDR 2.0 — non-categorised funds lose ALL ESG claim rights in name and marketing',
            properties: {
              level:                  { type: 'string', enum: ['safe', 'restricted', 'at_risk', 'banned'], description: 'safe=Transition/Sustainable; restricted=ESG Basics; at_risk=borderline non-categorised risk; banned=Non-categorised confirmed' },
              canUseEsgInName:        { type: 'boolean', description: 'Whether ESG/sustainable terms are permitted in fund name post-2028' },
              canMakeMarketingClaims: { type: 'boolean', description: 'Whether sustainability claims are permitted in marketing documents post-2028' },
              nameRisk:               { type: 'string',  description: 'Specific risk to current fund or company name if it contains ESG/sustainable/green/climate terms' },
              implication:            { type: 'string',  description: 'Practical LP and commercial impact of the marketing rights position' }
            },
            required: ['level', 'canUseEsgInName', 'canMakeMarketingClaims', 'nameRisk', 'implication']
          },
          paiObligations: {
            type: 'object',
            description: 'PAI reporting obligations under SFDR 2.0 — entity-level abolished entirely, product-level stays for Transition/Sustainable with indicator flexibility',
            properties: {
              entityLevelRequired:  { type: 'boolean', description: 'Entity-level PAI abolished under 2.0 — always false' },
              productLevelRequired: { type: 'boolean', description: 'Product-level PAI required only for Transition and Sustainable categories' },
              flexibility:          { type: 'string',  description: 'Transition/Sustainable funds no longer restricted to Annex I indicators — can use custom material indicators. What does this mean for this specific fund?' },
              complianceCostImpact: { type: 'string',  description: 'Estimated compliance burden change vs SFDR 1.0. EC targets 25% overall cost reduction via simplified 2-page disclosures.' }
            },
            required: ['entityLevelRequired', 'productLevelRequired', 'flexibility', 'complianceCostImpact']
          }
        },
        required: ['category', 'confidence', 'rationale', 'exclusionCompliance', 'threshold70pct', 'taxonomyShortcut', 'keyChanges', 'gaps', 'migrationTimeline', 'marketingRisk', 'paiObligations']
      }
    },
    required: ['recommendedArticle', 'confidence', 'rationale', 'qualifyingFactors', 'principalAdverseImpacts', 'upgradePath', 'disclosureRequirements', 'lpNarrative', 'regulatoryRisk', 'sfdr2']
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

export function buildPredictPrompt(company, screen1Result = null) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the Value Modeler Agent. You use Monte Carlo principles and sector benchmarks to show PE partners the probability distribution of outcomes before they commit capital. You convert "ESG might create value" into "here is the expected EBITDA impact under conservative, base, and aggressive scenarios."

Key benchmarks to apply:
- BCG 2025: 4-7% EBITDA growth from material sustainability initiatives
- EY-Parthenon: AAA ESG profile → +7.8pp IRR vs BBB baseline
- PRI/Bain/NYU Stern 2025: 6-7% exit multiple uplift for strong ESG profiles
- Liu 2024 (Springer): ESG scores 4 years prior → greatest impact on current returns (aligns with PE holding periods)
- Verdantix/KnowESG 2024: Year 1 ESG setup $310K-$705K; annual ongoing $250K-$530K`;

  const screen1Context = screen1Result ? `
ESG Screener findings (from upstream ESG Deal Screener Agent — use these to make the financial model causally consistent):
- SASB Classification: ${screen1Result.sasbClassification}
- Overall ESG Score: ${screen1Result.overallScore}/100 (E: ${screen1Result.pillarScores?.environmental}, S: ${screen1Result.pillarScores?.social}, G: ${screen1Result.pillarScores?.governance})
- Data Confidence: ${Math.round((screen1Result.dataConfidenceScore ?? 0) * 100)}%
- High-severity risks: ${(screen1Result.riskFlags ?? []).filter(r => r.severity === 'high').map(r => `${r.area} (${r.financialExposure})`).join('; ') || 'none'}
- Top value opportunities: ${(screen1Result.valueOpportunities ?? []).slice(0, 3).map(o => `${o.initiative} — ${o.estimatedAnnualSavings}, ${o.paybackMonths}mo payback`).join('; ')}

Price these specific opportunities and risks in your financial model. The IRR uplift should reflect remediating the high-severity risks and capturing the top value opportunities above.` : '';

  const userPrompt = `Model the financial impact of deploying the ESG Value Engine for this portfolio company:

${JSON.stringify(company, null, 2)}
${screen1Context}
Show base case (no ESG program) vs. with ESG interventions. Break down 3-4 specific initiatives appropriate for this sector. All numbers should be internally consistent with the company's revenue and EBITDA.`;

  return { systemPrompt, userPrompt };
}

export function buildSfdrPrompt(company, screen1Result = null) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the SFDR Classification Agent. You are a specialist in EU Sustainable Finance Disclosure Regulation — covering both SFDR 1.0 (Regulation EU 2019/2088, Level 2 RTS 2022/1288) and the SFDR 2.0 reform proposal published by the European Commission in November 2025 (expected implementation 2028-2029).

SFDR 1.0 classification thresholds:
- Article 6: No sustainability integration claim — standard fund
- Article 8: Promotes environmental or social characteristics — "light green" — PAI considered; good governance required
- Article 9: Sustainable investment objective — "dark green" — min. sustainable investment %; DNSH mandatory; PAI monitoring across 14 mandatory indicators

Key Article 9 gatekeepers (ALL required):
1. Formal sustainable investment objective at fund level
2. Minimum sustainable investment percentage (typically ≥51%)
3. DNSH assessment across all 6 environmental objectives
4. Good governance — independent board majority, exec pay linked to ESG
5. Alignment with OECD Guidelines and UN Guiding Principles
6. Mandatory PAI monitoring across 14 mandatory + 2 elected indicators

SFDR 2.0 classification system (EC proposal Nov 2025):
- Article 6 / 8 / 9 labels are ELIMINATED. Three new categories replace them:
  • ESG Basics: Mandatory exclusions only (weapons, tobacco, coal ≥1%, UNGC/OECD violations). Baseline tier — does NOT imply sustainability promotion.
  • Transition: ≥70% of investments in companies transitioning toward net zero aligned to 1.5°C. Benchmark shortcut: CTB (Climate Transition Benchmark). Formal transition plan required.
  • Sustainable: ≥70% sustainable investments + EU Taxonomy shortcut (≥15% taxonomy-aligned CapEx/OpEx). Benchmark shortcut: PAB (Paris-Aligned Benchmark).
- No grandfathering — all funds must re-assess under the new regime by implementation date
- 2-page simplified consumer-facing disclosure replaces current complex pre-contractual template — EC targets 25% compliance cost reduction
- Mandatory exclusions apply to ALL categories (not just higher tiers)
- Entity-level PAI statements ABOLISHED entirely (removes overlap with CSRD). Product-level PAI remains for Transition and Sustainable only, with flexibility to use non-Annex-I indicators
- CRITICAL MARKETING RULE: Only funds in one of the three categories may use ESG/sustainability terms in fund names OR marketing documents. Non-categorised funds are BANNED from any sustainability claims — including voluntary ones. ESG Basics funds have limited marketing rights (baseline positioning only, not promotional). This means any fund with "sustainable", "green", "ESG", or "climate" in its name that becomes Non-categorised must rebrand
- ESG Basics is NOT equivalent to Article 8 — it is the baseline exclusions floor. It is NOT a promotional label and carries far weaker LP signalling power than current Article 8

Your task: produce BOTH the SFDR 1.0 classification AND a shadow SFDR 2.0 assessment in the sfdr2 field, proving the system is future-proofed and regulatorily resilient. Pay particular attention to the marketingRisk field — if there is any ESG/sustainability language in the company or fund name, flag it explicitly.`;

  const screen1Context = screen1Result ? `
ESG Screener findings from upstream analysis:
- Overall ESG Score: ${screen1Result.overallScore}/100
- SASB Classification: ${screen1Result.sasbClassification}
- Data Confidence: ${Math.round((screen1Result.dataConfidenceScore ?? 0) * 100)}%
- High risks: ${(screen1Result.riskFlags ?? []).filter(r => r.severity === 'high').map(r => r.area).join(', ') || 'none'}
- Framework compliance: CSRD ${screen1Result.frameworkGaps?.csrd?.percentage ?? '?'}%, SFDR ${screen1Result.frameworkGaps?.sfdr?.percentage ?? '?'}%
Use this data to calibrate your PAI assessments and qualifying factor ratings.` : '';

  const userPrompt = `Produce a dual SFDR 1.0 + SFDR 2.0 classification for this PE portfolio company:

${JSON.stringify(company, null, 2)}
${screen1Context}
SFDR 1.0: Assess all qualifying factors for Article 8/9, evaluate the 7 most relevant PAI indicators for this sector, identify every disclosure gap, and produce a credible upgrade pathway. The LP narrative must be ready to send to a Nordic pension fund LP.

SFDR 2.0 (shadow classification): In the sfdr2 field, determine which of the three new categories (ESG Basics / Transition / Sustainable) this fund would most likely receive under the 2025 EC reform. Assess the four mandatory exclusions, whether the 70% threshold is achievable, EU Taxonomy alignment potential, and provide a migration timeline given the 2028-2029 implementation window. Highlight the key classification changes vs SFDR 1.0.

Critically assess the marketingRisk field: if the company name contains "sustainable", "clean", "green", "ESG", or similar terms, flag whether this name would survive the 2.0 marketing restriction rules. Assess the paiObligations field: explain how entity-level PAI abolition and product-level PAI flexibility changes this fund's data collection burden vs today. This dual-readiness analysis is the core value demonstration.`;

  return { systemPrompt, userPrompt };
}

export function buildMapPrompt(company, dataPoint, screen1Result = null) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the Framework Mapper Agent. You solve the "too many frameworks" problem by taking ONE data input and mapping it to ALL applicable regulatory frameworks simultaneously. You are technically precise — you cite specific ESRS article numbers, SFDR PAI indicator numbers, GRI standards, and SASB industry codes.`;

  const screen1Context = screen1Result ? `
ESG Screener context (from upstream Agent 1 — use to prioritise which frameworks are most urgent):
- SASB Classification: ${screen1Result.sasbClassification}
- ESG Score: ${screen1Result.overallScore}/100
- Key framework gaps: ${Object.entries(screen1Result.frameworkGaps ?? {}).filter(([, v]) => v && v.percentage < 60).map(([k, v]) => `${k.toUpperCase()} ${v.percentage}%`).join(', ') || 'none below 60%'}
- Highest severity risk: ${screen1Result.riskFlags?.find(r => r.severity === 'high')?.area ?? 'none'}
Use this context to highlight which framework mappings are most urgent for this specific company's compliance posture.` : '';

  const userPrompt = `Map this ESG data point across all frameworks applicable to this portfolio company:

Company: ${JSON.stringify({ name: company.name, sector: company.sector, geography: company.geography, regulatoryExposure: company.regulatoryExposure }, null, 2)}

Data Point: ${JSON.stringify(dataPoint, null, 2)}
${screen1Context}
For each applicable framework (CSRD/ESRS, SFDR 1.0 + SFDR 2.0, TCFD/IFRS S1+S2, GRI, GRI 18 Biodiversity (if nature-risk relevant), SASB, EDCI, and HKEX ISSB), specify the exact standard reference, required format, and whether our AI can perform the conversion automatically. Note which frameworks are mandatory vs voluntary for this specific company given their size (check employee count and revenue against Omnibus I thresholds). Include HKEX ISSB where relevant — particularly important for Hong Kong-listed or Asia-Pacific companies. Demonstrate the "one input → multiple framework outputs" value proposition.`;

  return { systemPrompt, userPrompt };
}

// ─── GREENWASH TOOL SCHEMA ────────────────────────────────────────────────────

export const greenwashToolSchema = {
  name: 'greenwashing_detector',
  description: 'Cross-reference ESG claims against available data to identify greenwashing risk, evidence gaps, and regulatory exposure',
  input_schema: {
    type: 'object',
    properties: {
      riskLevel:         { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      riskScore:         { type: 'number', description: '0-100 greenwashing risk score. 0=pristine disclosure, 100=fraudulent claims' },
      overallAssessment: { type: 'string', description: '2-3 paragraph forensic assessment of the gap between claims and evidence' },
      flaggedClaims: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            claim:       { type: 'string', description: 'The specific ESG claim or positioning being flagged' },
            claimType:   { type: 'string', enum: ['emissions', 'social', 'governance', 'supply_chain', 'targets', 'certifications'] },
            evidenceGap: { type: 'string', description: 'Specific data missing or inconsistent with the claim' },
            severity:    { type: 'string', enum: ['minor', 'moderate', 'material', 'critical'] },
            mitigation:  { type: 'string', description: 'Specific action to close the gap' }
          },
          required: ['claim', 'claimType', 'evidenceGap', 'severity', 'mitigation']
        }
      },
      redFlags:               { type: 'array', items: { type: 'string' } },
      positiveIndicators:     { type: 'array', items: { type: 'string' } },
      recommendedDisclosures: { type: 'array', items: { type: 'string' } },
      regulatoryExposure:     { type: 'string', description: 'Specific regulatory frameworks breached or at risk, with penalty exposure' }
    },
    required: ['riskLevel', 'riskScore', 'overallAssessment', 'flaggedClaims', 'redFlags', 'positiveIndicators', 'recommendedDisclosures', 'regulatoryExposure']
  }
};

export function buildGreenwashPrompt(company, screen1Result = null) {
  const systemPrompt = `${AGENT_CONTEXT}

You are currently operating as the Greenwashing Forensics Agent — a specialist in identifying gaps between ESG claims and supporting evidence. You apply the lens of a hostile ESG regulator, a sceptical journalist, and a sophisticated LP conducting enhanced due diligence simultaneously.

Your framework for greenwashing detection:
1. SCOPE SHIFTING — claiming sustainability while externalising the majority of impacts (e.g., strong Scope 1+2 but unmeasured Scope 3)
2. SELECTIVE DISCLOSURE — reporting only favourable metrics while omitting required negative indicators
3. UNSUBSTANTIATED CLAIMS — sustainability branding without independent verification (certificates, third-party audits, assurance)
4. VAGUE TARGETS — "net zero aspirations" or "sustainability journey" language without specific, time-bound, science-aligned commitments
5. BENCHMARK GAMING — comparing performance to non-representative peers or using outdated baselines

Regulatory frameworks you enforce (all dates as of April 2026):
- EU Green Claims Directive (2024) — false/misleading environmental claims are criminal offences
- CSRD/ESRS — Omnibus I (March 2026): scope reduced to 1,000+ employees + €450M turnover. Wave 2 delayed to FY2027 (report 2028). Still mandatory for in-scope companies — gaps become public regulatory failures
- SFDR Level 2 RTS (1.0) — PAI statement exposes data gaps to all LPs simultaneously. SFDR 2.0 adds marketing ban for non-categorised funds
- EU Deforestation Regulation (EUDR) — large-operator enforcement 30 December 2026 (second delay, Dec 2025). Penalties up to 4% EU-wide annual turnover
- UK FCA ESG Sourcebook — anti-greenwashing rule (effective May 2024), naming/marketing rules (April 2025)
- France Loi Devoir de Vigilance — national law, unchanged by EU Omnibus, applies now to French-headquartered companies`;

  const screen1Context = screen1Result ? `
ESG Screener findings (use to identify specific claim-evidence gaps):
- SASB Classification: ${screen1Result.sasbClassification}
- Overall ESG Score: ${screen1Result.overallScore}/100 (E: ${screen1Result.pillarScores?.environmental}, S: ${screen1Result.pillarScores?.social}, G: ${screen1Result.pillarScores?.governance})
- Data Confidence: ${Math.round((screen1Result.dataConfidenceScore ?? 0) * 100)}% — low confidence = high greenwash risk
- Missing KPIs: ${(screen1Result.materialKpis ?? []).filter(k => k.dataStatus === 'missing').map(k => k.kpi).join(', ') || 'none identified'}
- Partial KPIs: ${(screen1Result.materialKpis ?? []).filter(k => k.dataStatus === 'partial').map(k => k.kpi).join(', ') || 'none'}
- High-severity risks: ${(screen1Result.riskFlags ?? []).filter(r => r.severity === 'high').map(r => r.area).join(', ') || 'none'}
Cross-reference these gaps against the company's sustainability positioning to identify where claims exceed evidence.` : '';

  const userPrompt = `Conduct a greenwashing forensics analysis on this PE portfolio company:

${JSON.stringify(company, null, 2)}
${screen1Context}
Identify every instance where the company's ESG claims, positioning, or brand exceed the supporting evidence in their disclosed data. Be specific — cite exact data fields, name the regulatory articles breached, and quantify the gap where possible. Flag the highest-risk issues first.`;

  return { systemPrompt, userPrompt };
}
