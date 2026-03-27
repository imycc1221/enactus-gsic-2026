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
    regulatoryExposure: ['CSRD (Germany operations)', 'EU Taxonomy', 'Vietnam local labor law'],
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
    regulatoryExposure: ['CSRD (France)', 'SFDR', 'France Duty of Vigilance', 'EU Deforestation Regulation'],
    peInvestmentContext: { investmentAmount: 144_000_000, holdingPeriod: 6, targetExitMultiple: 9 }
  }
];

export const COMPANY_MAP = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
