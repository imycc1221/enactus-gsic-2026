/**
 * companies.js
 * Full company profiles for the ESG Value Engine demo.
 * These are sent to the API on each request (cache lookups only need the id).
 */

export const COMPANIES = [
  {
    id: 'greentech-mfg',
    name: 'GreenTech Manufacturing Co.',
    shortName: 'GreenTech Mfg',
    sector: 'Industrial Manufacturing',
    sasbSector: 'Industrial Machinery & Goods (IF-MS)',
    geography: 'Germany + Vietnam',
    countryCode: 'DE',
    revenue: 85_000_000,
    ebitda: 12_750_000,
    employees: 420,
    description: 'Mid-market manufacturer of industrial components. Some emissions tracking, no formal ESG reporting.',
    availableData: {
      ghgEmissions:       { available: true,  scope1: 8200, scope2: 4300, scope3: null, unit: 'tCO2e' },
      energyConsumption:  { available: true,  kwh: 15_600_000, renewablePercent: 12 },
      waterUsage:         { available: false },
      workforceDiversity: { available: true,  femalePercent: 28, boardDiversity: 33 },
      supplyChainAudit:   { available: false },
      boardGovernance:    { available: true,  independentDirectors: 3, totalDirectors: 7 },
      employeeSafety:     { available: true,  ltirRate: 2.1, trainingHoursPerEmployee: 18 }
    },
    regulatoryExposure: ['CSRD (voluntary — post-Omnibus I, 420 employees below 1,000 threshold)', 'EU Taxonomy (voluntary — below mandatory scope)', 'Vietnam local labor law'],
    peInvestmentContext: { investmentAmount: 72_250_000, holdingPeriod: 5, targetExitMultiple: 10 }
  },
  {
    id: 'cleanenergy-saas',
    name: 'CleanEnergy SaaS Platform',
    shortName: 'CleanEnergy SaaS',
    sector: 'Technology / Clean Energy',
    sasbSector: 'Software & IT Services (TC-SI)',
    geography: 'UK + Nordics',
    countryCode: 'GB',
    revenue: 22_000_000,
    ebitda: 5_500_000,
    employees: 95,
    description: 'B2B SaaS helping utilities manage renewable energy portfolios. Low direct emissions, high growth.',
    availableData: {
      ghgEmissions:       { available: true,  scope1: 120, scope2: 890, scope3: null, unit: 'tCO2e' },
      energyConsumption:  { available: true,  kwh: 480_000, renewablePercent: 78 },
      waterUsage:         { available: true,  cubicMeters: 1200 },
      workforceDiversity: { available: true,  femalePercent: 42, boardDiversity: 50 },
      supplyChainAudit:   { available: false },
      boardGovernance:    { available: true,  independentDirectors: 2, totalDirectors: 5 },
      employeeEngagement: { available: true,  voluntaryTurnoverRate: 8.2, eNPS: 42 }
    },
    regulatoryExposure: ['UK SDR', 'SFDR (Nordic LP base)', 'EU AI Act (SaaS product)'],
    peInvestmentContext: { investmentAmount: 19_250_000, holdingPeriod: 5, targetExitMultiple: 12 }
  },
  {
    id: 'sustainable-retail',
    name: 'Sustainable Retail Group',
    shortName: 'Sustainable Retail',
    sector: 'Consumer Retail',
    sasbSector: 'Food & Beverage Retailers / Apparel (CG-AA)',
    geography: 'France + SE Asia',
    countryCode: 'FR',
    revenue: 150_000_000,
    ebitda: 18_000_000,
    employees: 1200,
    description: 'Retailer with growing sustainable product lines. Complex 8-country supply chain.',
    availableData: {
      ghgEmissions:          { available: true,  scope1: 3400, scope2: 11200, scope3: 45000, unit: 'tCO2e' },
      energyConsumption:     { available: true,  kwh: 38_000_000, renewablePercent: 31 },
      waterUsage:            { available: true,  cubicMeters: 85000 },
      workforceDiversity:    { available: true,  femalePercent: 55, boardDiversity: 25 },
      supplyChainAudit:      { available: true,  suppliersAudited: 45, totalSuppliers: 280, auditCoverage: '16%' },
      boardGovernance:       { available: true,  independentDirectors: 2, totalDirectors: 8 },
      productSustainability: { available: true,  sustainableProductsPercent: 34, packagingRecyclable: 61 }
    },
    regulatoryExposure: ['CSRD (voluntary — post-Omnibus I, €150M revenue below €450M threshold)', 'SFDR', 'EU Deforestation Regulation (large-operator deadline Dec 2026)', 'GRI 18 Biodiversity (effective Jan 2026 — deforestation exposure)'],
    peInvestmentContext: { investmentAmount: 144_000_000, holdingPeriod: 6, targetExitMultiple: 9 }
  }
];

export const COMPANY_MAP = Object.fromEntries(COMPANIES.map(c => [c.id, c]));

/**
 * Regulatory scoping guard — returns what regulations are actually mandatory
 * vs. what is de facto required through LP pressure / SFDR 2.0 / EUDR.
 * Prevents false-positive regulatory flags for companies below legal thresholds.
 */
export function getRegScoping(company) {
  const employees = company.employees ?? 0;
  const revenue   = company.revenue   ?? 0;
  const geo       = (company.geography ?? '').toLowerCase();

  const mandatory = [];
  const deFacto   = [];

  // EUDR: large operator = above EU SME threshold (250+ employees OR >€50M revenue)
  const isEudrSme     = employees < 250 && revenue < 50_000_000;
  const hasHighRiskGeo = ['asia','vietnam','indonesia','malaysia','thailand','myanmar',
                           'brazil','africa','colombia','peru'].some(r => geo.includes(r));
  const eudrExemptSectors = ['industrial machinery','industrial components','metal','electronics',
                              'semiconductor','software','saas','technology','financial','insurance',
                              'pharma','chemical'];
  const hasForestRiskSector = !eudrExemptSectors.some(s => (company.sector ?? '').toLowerCase().includes(s));

  if (hasHighRiskGeo && hasForestRiskSector) {
    mandatory.push({
      label: 'EU Deforestation Regulation (EUDR)',
      detail: isEudrSme
        ? 'SME — simplified due diligence. Geographic coordinates + basic supply chain traceability required before 30 Dec 2026.'
        : 'Large operator — full due diligence by 30 Dec 2026. Geographic coordinates, due diligence statements, and plot-level traceability mandatory for all forest-risk commodities.',
      urgency: 'critical',
    });
  }

  // CSRD: Omnibus I (enacted 18 Mar 2026) — 1,000+ employees AND €450M+ revenue (both required)
  if (employees >= 1000 && revenue >= 450_000_000) {
    mandatory.push({ label: 'CSRD (mandatory)', detail: 'Above Omnibus I threshold. First report: FY2027 data (published 2028).', urgency: 'high' });
  }

  // CSDDD: 5,000+ employees AND €1.5B revenue
  if (employees >= 5000 && revenue >= 1_500_000_000) {
    mandatory.push({ label: 'CSDDD', detail: 'Supply chain human rights and environmental due diligence required.', urgency: 'high' });
  }

  // France Duty of Vigilance: 5,000 in France OR 10,000 worldwide
  if (employees >= 10000 || (geo.includes('france') && employees >= 5000)) {
    mandatory.push({ label: 'France Duty of Vigilance', detail: '5,000+ employees in France OR 10,000 worldwide.', urgency: 'medium' });
  }

  // De facto obligations (apply regardless of mandatory legal scope)
  deFacto.push({ label: 'LP ESG questionnaires (EDCI + SFDR PAI)', detail: 'PFZW (€238B), CalPERS ($496B), GPIF ($1.5T) require EDCI metrics and SFDR PAI data from all GPs.' });
  deFacto.push({ label: 'SFDR 2.0 fund classification (2028)', detail: 'Marketing ban: funds below ESG Basics/Transition/Sustainable threshold cannot use sustainability terms in name or marketing.' });
  if (employees < 1000 || revenue < 450_000_000) {
    deFacto.push({ label: 'CSRD voluntary disclosure', detail: 'Below Omnibus I mandatory threshold — voluntary adoption signals ESG credibility to LPs and strategic acquirers.' });
  }
  deFacto.push({ label: 'HKEX / MAS (APAC LP base)', detail: 'HKEX ISSB-aligned reporting (Jan 2025) and SFC climate risk requirements (AUM >HK$4B, Nov 2024) bind funds with Asian LP exposure.' });

  return { mandatory, deFacto, isEudrSme, hasHighRiskGeo };
}
