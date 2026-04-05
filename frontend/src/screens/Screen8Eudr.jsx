import { COMPANY_MAP } from '../data/companies.js';

// Forest-risk commodities under EUDR (Regulation EU 2023/1115)
const COMMODITIES = [
  { id: 'palm_oil',  label: 'Palm Oil',    icon: '🌴', triggers: ['asia', 'indonesia', 'malaysia', 'thailand'] },
  { id: 'timber',    label: 'Timber / Wood', icon: '🪵', triggers: ['asia', 'vietnam', 'indonesia', 'brazil', 'africa'] },
  { id: 'rubber',    label: 'Rubber',      icon: '⚫', triggers: ['asia', 'vietnam', 'indonesia', 'malaysia', 'thailand'] },
  { id: 'soy',       label: 'Soy',         icon: '🌿', triggers: ['brazil', 'latin', 'argentina', 'us', 'usa'] },
  { id: 'cocoa',     label: 'Cocoa',       icon: '🍫', triggers: ['africa', 'ivory', 'ghana', 'nigeria', 'ecuador'] },
  { id: 'coffee',    label: 'Coffee',      icon: '☕', triggers: ['ethiopia', 'brazil', 'vietnam', 'colombia', 'indonesia'] },
  { id: 'cattle',    label: 'Cattle / Beef', icon: '🐄', triggers: ['brazil', 'latin', 'argentina'] },
];

const DUE_DILIGENCE_REQUIREMENTS = [
  { id: 'info_collect', label: 'Information Collection', detail: 'Country of production, geographic coordinates (plot-level), quantity, supplier info for all forest-risk commodities placed on EU market.' },
  { id: 'risk_assess',  label: 'Risk Assessment',        detail: 'Evaluate deforestation / forest degradation risk based on country benchmark (EC classification list, pending publication). SE Asia high-risk default.' },
  { id: 'risk_mitig',   label: 'Risk Mitigation',        detail: 'Where non-negligible risk identified: supplier audits, third-party verification, satellite monitoring, certification schemes (RSPO, FSC).' },
  { id: 'due_dilig',    label: 'Due Diligence Statement', detail: 'Submit due diligence statement via EUDR Information System before placing goods on EU market. Reference number required on customs declaration.' },
  { id: 'traceability', label: 'Supply Chain Traceability', detail: 'Traceability from EU market back to plot of land. GPS coordinates required. Digital traceability platforms (Sourcemap, Proforest) recommended.' },
  { id: 'record_keep',  label: 'Record Keeping (5 Years)', detail: 'All due diligence records kept for 5 years. Annual review required if risk assessment basis changes (e.g. EC reclassification of country risk).' },
];

// EUDR-exempt sectors: industrial manufacturing with no forest-risk commodity inputs
const EUDR_EXEMPT_SECTORS = [
  'industrial machinery', 'industrial components', 'metal', 'electronics', 'semiconductor',
  'software', 'saas', 'technology', 'financial', 'insurance', 'pharma', 'chemical'
];

function hasForestRiskSectorExposure(company) {
  const sector = (company.sector ?? '').toLowerCase();
  return !EUDR_EXEMPT_SECTORS.some(s => sector.includes(s));
}

function getRiskLevel(company) {
  const geo = (company.geography ?? '').toLowerCase();
  const hasHighRiskGeo = ['asia', 'vietnam', 'indonesia', 'malaysia', 'thailand', 'brazil', 'africa'].some(r => geo.includes(r));
  if (!hasHighRiskGeo || !hasForestRiskSectorExposure(company)) return 'low';

  const hasSupplyChain = company.availableData?.supplyChainAudit?.available;
  const coverage = parseFloat(company.availableData?.supplyChainAudit?.auditCoverage ?? '0') || 0;
  if (hasSupplyChain && coverage >= 60) return 'medium';
  return 'high';
}

function isLargeOperator(company) {
  // EUDR large operator = above EU SME threshold: 250+ employees OR >€50M revenue
  return (company.employees ?? 0) >= 250 || (company.revenue ?? 0) >= 50_000_000;
}

function getAffectedCommodities(company) {
  if (!hasForestRiskSectorExposure(company)) return [];
  const geo = (company.geography ?? '').toLowerCase();
  const sector = (company.sector ?? '').toLowerCase();
  return COMMODITIES.filter(c =>
    c.triggers.some(t => geo.includes(t)) ||
    (sector.includes('retail') && ['palm_oil', 'timber', 'rubber'].includes(c.id)) ||
    (sector.includes('food') && ['soy', 'cocoa', 'cattle'].includes(c.id))
  );
}

function getDaysUntilDeadline(largeOperator) {
  const deadline = largeOperator ? new Date('2026-12-30') : new Date('2027-06-30');
  const today    = new Date();
  const diff     = deadline - today;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const RISK_CONFIG = {
  high:   { color: '#FF1F5A', bg: '#FF1F5A0D', border: '#FF1F5A30', label: 'HIGH RISK',   bar: '#FF1F5A' },
  medium: { color: '#F0A500', bg: '#F0A5000D', border: '#F0A50030', label: 'MEDIUM RISK',  bar: '#F0A500' },
  low:    { color: '#00C896', bg: '#00C8960D', border: '#00C89630', label: 'LOW RISK',     bar: '#00C896' },
};

export default function Screen8Eudr({ companyId, companyOverride }) {
  const company    = companyOverride ?? COMPANY_MAP[companyId];
  const riskLevel  = getRiskLevel(company);
  const largeOp    = isLargeOperator(company);
  const commodities = getAffectedCommodities(company);
  const daysLeft   = getDaysUntilDeadline(largeOp);
  const cfg        = RISK_CONFIG[riskLevel];

  const eudrInScope = riskLevel !== 'low';
  const auditData   = company.availableData?.supplyChainAudit;
  const auditPct    = parseFloat(auditData?.auditCoverage ?? '0') || 0;
  const auditGap    = 100 - auditPct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header banner */}
      <div style={{ position: 'relative', background: '#111111', border: `1px solid ${cfg.border}`, borderRadius: '0.25rem', overflow: 'hidden', padding: '1.5rem' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${cfg.color}08 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: cfg.color, marginBottom: '0.375rem' }}>
              EU Deforestation Regulation (EUDR) — Regulation EU 2023/1115
            </div>
            <h1 style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontWeight: 300, fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#787878' }}>
              {company.geography} · {largeOp ? 'Large operator' : 'SME (simplified rules)'} · {eudrInScope ? 'Forest-risk geography detected' : 'Low deforestation exposure'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '2px', padding: '0.2rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {cfg.label}
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.5625rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>{largeOp ? 'Large-operator deadline' : 'SME deadline'}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{largeOp ? '30 December 2026' : '30 June 2027'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown + Operator Classification */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>

        {/* Countdown */}
        <div style={{ background: daysLeft < 200 ? '#1A0A00' : '#0A0A0A', border: `1px solid ${daysLeft < 200 ? '#FF8C0030' : '#2E2E2E'}`, borderRadius: '0.25rem', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: daysLeft < 200 ? '#FF8C00' : '#444', marginBottom: '0.5rem' }}>Days to Deadline</div>
          <div className="data-mono" style={{ fontSize: '3.5rem', fontWeight: 700, color: daysLeft < 200 ? '#FF8C00' : '#fff', lineHeight: 1 }}>{daysLeft}</div>
          <div style={{ fontSize: '0.625rem', color: '#444', marginTop: '0.5rem' }}>{largeOp ? '30 Dec 2026' : '30 Jun 2027'} (second delay — Reg EU 2024/3234)</div>
          <div style={{ height: '3px', background: '#1E1E1E', borderRadius: '2px', marginTop: '0.75rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, ((270 - daysLeft) / 270) * 100)}%`, background: daysLeft < 200 ? 'linear-gradient(90deg, #FF8C00, #FF1F5A)' : 'linear-gradient(90deg, #00C896, #3B82F6)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: '0.5rem', color: '#2E2E2E', marginTop: '0.25rem' }}>Compliance window consumed</div>
        </div>

        {/* Operator classification */}
        <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>Operator Classification</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Operator type', val: largeOp ? 'Large Operator' : 'SME (Simplified)', color: largeOp ? '#FF8C00' : '#00C896' },
              { label: 'Employees', val: `${(company.employees ?? 0).toLocaleString()}`, color: '#fff' },
              { label: 'Revenue', val: company.revenue >= 1_000_000 ? `€${(company.revenue/1_000_000).toFixed(0)}M` : '—', color: '#fff' },
              { label: 'Due diligence', val: largeOp ? 'Full (Art. 4)' : 'Simplified (Art. 13)', color: largeOp ? '#FF8C00' : '#00C896' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: '#555' }}>{label}</span>
                <span className="data-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supply chain audit coverage */}
        <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>Supply Chain Traceability</div>
          {auditData?.available ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: '#555' }}>Suppliers audited</span>
                <span className="data-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{auditData.suppliersAudited ?? '—'} / {auditData.totalSuppliers ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: '#555' }}>Audit coverage</span>
                <span className="data-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: auditPct >= 60 ? '#00C896' : '#FF1F5A' }}>{auditPct.toFixed(0)}%</span>
              </div>
              <div style={{ height: '3px', background: '#1E1E1E', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${auditPct}%`, background: auditPct >= 60 ? '#00C896' : '#FF1F5A', borderRadius: '2px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: '#555' }}>EUDR gap (untraced)</span>
                <span className="data-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FF1F5A' }}>{auditGap.toFixed(0)}%</span>
              </div>
              <div style={{ fontSize: '0.5625rem', color: '#444', fontStyle: 'italic' }}>EUDR requires plot-level geographic coordinates — audit coverage alone is insufficient without geolocation data</div>
            </div>
          ) : (
            <div style={{ padding: '0.75rem', background: '#FF1F5A0D', border: '1px solid #FF1F5A30', borderRadius: '2px', fontSize: '0.6875rem', color: '#FF1F5A' }}>
              No supply chain data available — EUDR traceability gap cannot be assessed. Immediate supplier mapping required.
            </div>
          )}
        </div>
      </div>

      {/* Forest-risk Commodity Exposure */}
      <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>
          Forest-Risk Commodity Exposure
        </div>
        {commodities.length === 0 ? (
          <div style={{ padding: '0.75rem', background: '#00C8960D', border: '1px solid #00C89630', borderRadius: '2px', fontSize: '0.8125rem', color: '#00C896', fontWeight: 500 }}>
            No forest-risk commodity exposure detected based on geography and sector — EUDR obligation low. Confirm with procurement team.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.625rem' }}>
            {COMMODITIES.map(c => {
              const hit = commodities.some(a => a.id === c.id);
              return (
                <div key={c.id} style={{ background: hit ? '#FF1F5A0D' : '#0A0A0A', border: `1px solid ${hit ? '#FF1F5A30' : '#1A1A1A'}`, borderRadius: '0.25rem', padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: hit ? 1 : 0.35 }}>
                  <span style={{ fontSize: '1.25rem' }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: hit ? '#FF1F5A' : '#444' }}>{c.label}</div>
                    <div style={{ fontSize: '0.5rem', color: hit ? '#FF1F5A80' : '#2E2E2E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{hit ? 'At risk' : 'Not detected'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Due Diligence Checklist */}
      <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>EUDR Due Diligence Checklist</div>
          <div style={{ fontSize: '0.5625rem', color: '#444' }}>Article 8 — Regulation EU 2023/1115</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {DUE_DILIGENCE_REQUIREMENTS.map((req, i) => {
            // Derive compliance status from company data
            const isDone = !eudrInScope ? true
              : req.id === 'info_collect'  ? false
              : req.id === 'traceability'  ? (auditPct >= 60)
              : req.id === 'risk_assess'   ? false
              : req.id === 'risk_mitig'    ? (auditData?.available && auditPct >= 40)
              : req.id === 'due_dilig'     ? false
              : req.id === 'record_keep'   ? false
              : false;

            const statusColor = isDone ? '#00C896' : '#FF1F5A';
            const statusLabel = isDone ? 'Complete' : 'Gap';

            return (
              <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr auto', gap: '0.75rem', padding: '0.75rem 1.25rem', borderTop: i > 0 ? '1px solid #1A1A1A' : 'none', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1rem', color: statusColor, fontWeight: 700 }}>{isDone ? '✓' : '✗'}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>{req.label}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#555', lineHeight: 1.55 }}>{req.detail}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}40`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended 9-Month Sprint */}
      <div style={{ background: '#040D14', border: '1px solid #3B82F625', borderRadius: '0.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #3B82F620' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3B82F6' }}>Recommended Compliance Sprint — 9 Months to Dec 2026</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            {
              phase: 'Phase 1 — Now → Month 3',
              color: '#FF1F5A',
              items: [
                'Engage EUDR specialist (Sourcemap, Proforest, Rainforest Alliance)',
                'Map all forest-risk commodities in supply chain by product category',
                'Identify first-placer status for each commodity / market',
              ]
            },
            {
              phase: 'Phase 2 — Month 3 → Month 6',
              color: '#F0A500',
              items: [
                'Collect geographic coordinates (GPS / plot-level) from all Tier 1 suppliers',
                'Conduct risk assessment per commodity per country using EC benchmark list',
                'Implement digital traceability platform for SE Asia supply chain',
              ]
            },
            {
              phase: 'Phase 3 — Month 6 → Dec 2026',
              color: '#00C896',
              items: [
                'Submit due diligence statements via EUDR Information System',
                'Implement annual review protocol and 5-year record keeping',
                'Disclose EUDR compliance status in LP pre-contractual documents',
              ]
            },
          ].map((phase, i) => (
            <div key={phase.phase} style={{ padding: '1rem 1.25rem', borderRight: i < 2 ? '1px solid #3B82F615' : 'none' }}>
              <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: phase.color, marginBottom: '0.625rem' }}>{phase.phase}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {phase.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: phase.color, fontWeight: 700, flexShrink: 0, marginTop: '0.15rem', fontSize: '0.625rem' }}>→</span>
                    <span style={{ fontSize: '0.6875rem', color: '#787878', lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid #3B82F615', fontSize: '0.5625rem', color: '#2E3E50' }}>
          Penalty: up to 4% EU-wide annual turnover + product confiscation + temporary market access ban (Article 25, Regulation EU 2023/1115)
        </div>
      </div>

    </div>
  );
}
