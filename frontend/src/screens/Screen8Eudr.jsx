import { COMPANY_MAP } from '../data/companies.js';

// Forest-risk commodities under EUDR (Regulation EU 2023/1115)
const COMMODITIES = [
  { id: 'palm_oil',  label: 'Palm Oil',      img: '/images/commodities/palm_oil.jpg.png',  triggers: ['asia', 'indonesia', 'malaysia', 'thailand'] },
  { id: 'timber',    label: 'Timber / Wood', img: '/images/commodities/timber.jpg.png',    triggers: ['asia', 'vietnam', 'indonesia', 'brazil', 'africa'] },
  { id: 'rubber',    label: 'Rubber',        img: '/images/commodities/rubber.jpg.png',    triggers: ['asia', 'vietnam', 'indonesia', 'malaysia', 'thailand'] },
  { id: 'soy',       label: 'Soy',           img: '/images/commodities/soy.jpg.png',       triggers: ['brazil', 'latin', 'argentina', 'us', 'usa'] },
  { id: 'cocoa',     label: 'Cocoa',         img: '/images/commodities/cocoa.jpg.png',     triggers: ['africa', 'ivory', 'ghana', 'nigeria', 'ecuador'] },
  { id: 'coffee',    label: 'Coffee',        img: '/images/commodities/coffee.jpg.png',    triggers: ['ethiopia', 'brazil', 'vietnam', 'colombia', 'indonesia'] },
  { id: 'cattle',    label: 'Cattle / Beef', img: '/images/commodities/cattle.jpg.png',    triggers: ['brazil', 'latin', 'argentina'] },
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
  high:   { color: '#FF4444', bg: '#FF44440D', border: '#FF444430', label: 'HIGH RISK',   bar: '#FF4444' },
  medium: { color: '#888888', bg: '#8888880D', border: '#88888830', label: 'MEDIUM RISK',  bar: '#888888' },
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

  // Shared glass card style matching app design language
  const glassCard = {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '0.5rem',
    position: 'relative',
  };

  // Gradient top shimmer line (mirrors glass-card::before in CSS)
  const shimmerLine = (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(172,0,239,0.6), rgba(255,255,255,0.2), transparent)', opacity: 0.7, pointerEvents: 'none', borderRadius: '0.5rem 0.5rem 0 0' }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header banner */}
      <div style={{
        ...glassCard,
        overflow: 'hidden',
        padding: '1.5rem',
        boxShadow: `0 0 40px rgba(172,0,239,0.12), 0 0 80px rgba(172,0,239,0.05)`,
      }}>
        {shimmerLine}
        {/* Purple top accent stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #7B00AC, #AC00EF, #C020FF)', opacity: 0.9 }} />
        {/* Radial purple glow behind content */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 85% 50%, rgba(172,0,239,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#AC00EF', marginBottom: '0.375rem' }}>
              EU Deforestation Regulation (EUDR) — Regulation EU 2023/1115
            </div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.25rem' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>
              {company.geography} · {largeOp ? 'Large operator' : 'SME (simplified rules)'} · {eudrInScope ? 'Forest-risk geography detected' : 'Low deforestation exposure'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '2px', padding: '0.2rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {cfg.label}
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--fs-micro)', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>{largeOp ? 'Large-operator deadline' : 'SME deadline'}</div>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff' }}>{largeOp ? '30 December 2026' : '30 June 2027'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown + Operator Classification + Supply Chain */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>

        {/* Countdown */}
        <div style={{
          ...glassCard,
          padding: '1.25rem',
          textAlign: 'center',
          boxShadow: daysLeft < 200 ? '0 0 32px rgba(255,68,68,0.12)' : '0 0 32px rgba(0,200,150,0.08)',
          borderColor: daysLeft < 200 ? 'rgba(255,68,68,0.2)' : 'rgba(0,200,150,0.15)',
        }}>
          {shimmerLine}
          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: daysLeft < 200 ? '#FF4444' : '#00C896', marginBottom: '0.5rem' }}>Days to Deadline</div>
          <div className="data-mono" style={{ fontSize: '3.5rem', fontWeight: 700, color: daysLeft < 200 ? '#FF4444' : '#00C896', lineHeight: 1 }}>{daysLeft}</div>
          <div style={{ fontSize: 'var(--fs-label)', color: '#555', marginTop: '0.5rem' }}>{largeOp ? '30 Dec 2026' : '30 Jun 2027'} (second delay — Reg EU 2024/3234)</div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '0.75rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, ((270 - daysLeft) / 270) * 100)}%`, background: daysLeft < 200 ? 'linear-gradient(90deg, #FF4444, #FF7777)' : 'linear-gradient(90deg, #7B00AC, #AC00EF)', borderRadius: '2px', transition: 'width 0.5s', boxShadow: daysLeft < 200 ? '0 0 8px #FF444480' : '0 0 8px #AC00EF60' }} />
          </div>
          <div style={{ fontSize: 'var(--fs-label)', color: '#444', marginTop: '0.25rem' }}>Compliance window consumed</div>
        </div>

        {/* Operator classification */}
        <div style={{
          ...glassCard,
          padding: '1.25rem',
          boxShadow: '0 0 32px rgba(172,0,239,0.08)',
        }}>
          {shimmerLine}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg, #AC00EF, #7B00AC)', flexShrink: 0 }} />
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#AC00EF' }}>Operator Classification</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Operator type', val: largeOp ? 'Large Operator' : 'SME (Simplified)', color: largeOp ? '#FF4444' : '#00C896' },
              { label: 'Employees', val: `${(company.employees ?? 0).toLocaleString()}`, color: '#fff' },
              { label: 'Revenue', val: company.revenue >= 1_000_000 ? `€${(company.revenue/1_000_000).toFixed(0)}M` : '—', color: '#fff' },
              { label: 'Due diligence', val: largeOp ? 'Full (Art. 4)' : 'Simplified (Art. 13)', color: largeOp ? '#FF4444' : '#00C896' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 'var(--fs-micro)', color: '#555' }}>{label}</span>
                <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supply chain audit coverage */}
        <div style={{
          ...glassCard,
          padding: '1.25rem',
          boxShadow: auditPct >= 60 ? '0 0 32px rgba(0,200,150,0.08)' : '0 0 32px rgba(255,68,68,0.10)',
          borderColor: auditPct >= 60 ? 'rgba(0,200,150,0.15)' : 'rgba(255,68,68,0.18)',
        }}>
          {shimmerLine}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: auditPct >= 60 ? '#00C896' : '#FF4444', flexShrink: 0 }} />
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: auditPct >= 60 ? '#00C896' : '#FF4444' }}>Supply Chain Traceability</div>
          </div>
          {auditData?.available ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--fs-micro)', color: '#555' }}>Suppliers audited</span>
                <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff' }}>{auditData.suppliersAudited ?? '—'} / {auditData.totalSuppliers ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--fs-micro)', color: '#555' }}>Audit coverage</span>
                <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: auditPct >= 60 ? '#00C896' : '#FF4444' }}>{auditPct.toFixed(0)}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${auditPct}%`, background: auditPct >= 60 ? '#00C896' : '#FF4444', borderRadius: '2px', boxShadow: auditPct >= 60 ? '0 0 6px #00C89660' : '0 0 6px #FF444460' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--fs-micro)', color: '#555' }}>EUDR gap (untraced)</span>
                <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#FF4444' }}>{auditGap.toFixed(0)}%</span>
              </div>
              <div style={{ fontSize: 'var(--fs-micro)', color: '#444', fontStyle: 'italic' }}>EUDR requires plot-level geographic coordinates — audit coverage alone is insufficient without geolocation data</div>
            </div>
          ) : (
            <div style={{ padding: '0.75rem', background: '#FF44440D', border: '1px solid #FF444430', borderRadius: '2px', fontSize: 'var(--fs-micro)', color: '#FF4444' }}>
              No supply chain data available — EUDR traceability gap cannot be assessed. Immediate supplier mapping required.
            </div>
          )}
        </div>
      </div>

      {/* Forest-risk Commodity Exposure */}
      <div style={{
        ...glassCard,
        padding: '1.25rem',
        boxShadow: '0 0 32px rgba(172,0,239,0.08)',
      }}>
        {shimmerLine}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg, #AC00EF, #7B00AC)', flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#AC00EF' }}>
            Forest-Risk Commodity Exposure
          </div>
        </div>
        {commodities.length === 0 ? (
          <div style={{ padding: '0.75rem', background: '#00C8960D', border: '1px solid #00C89630', borderRadius: '2px', fontSize: 'var(--fs-sm)', color: '#00C896', fontWeight: 500 }}>
            No forest-risk commodity exposure detected based on geography and sector — EUDR obligation low. Confirm with procurement team.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.625rem' }}>
            {COMMODITIES.map(c => {
              const hit = commodities.some(a => a.id === c.id);
              return (
                <div key={c.id} style={{ border: `1px solid ${hit ? 'rgba(172,0,239,0.35)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '0.375rem', overflow: 'hidden', opacity: hit ? 1 : 0.4, position: 'relative', boxShadow: hit ? '0 0 12px rgba(172,0,239,0.15)' : 'none' }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', position: 'relative', background: '#060606' }}>
                    <img src={c.img} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: hit ? 'brightness(0.92) saturate(1.1)' : 'grayscale(90%) brightness(0.35)' }} />
                    {/* gradient overlay — dark at bottom only, no colour tint */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.82) 100%)' }} />
                    {/* shimmer top for hit cards */}
                    {hit && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(172,0,239,0.7), transparent)' }} />}
                    <div style={{ position: 'absolute', bottom: '0.35rem', left: '0.4rem', right: '0.4rem' }}>
                      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: hit ? '#fff' : '#555', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{c.label}</div>
                      <div style={{ fontSize: 'var(--fs-label)', color: hit ? '#CC88FF' : '#333', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{hit ? 'At risk' : 'Not detected'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Due Diligence Checklist */}
      <div style={{
        ...glassCard,
        overflow: 'hidden',
        boxShadow: '0 0 32px rgba(172,0,239,0.07)',
      }}>
        {shimmerLine}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg, #AC00EF, #7B00AC)', flexShrink: 0 }} />
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#AC00EF' }}>EUDR Due Diligence Checklist</div>
          </div>
          <div style={{ fontSize: 'var(--fs-micro)', color: '#555' }}>Article 8 — Regulation EU 2023/1115</div>
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

            const statusColor = isDone ? '#00C896' : '#FF4444';
            const statusLabel = isDone ? 'Complete' : 'Gap';

            return (
              <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr auto', gap: '0.75rem', padding: '0.75rem 1.25rem', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1rem', color: statusColor, fontWeight: 700 }}>{isDone ? '✓' : '✗'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>{req.label}</div>
                  <div style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.55 }}>{req.detail}</div>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}40`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended 9-Month Sprint */}
      <div style={{
        ...glassCard,
        overflow: 'hidden',
        boxShadow: '0 0 32px rgba(172,0,239,0.07)',
      }}>
        {shimmerLine}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg, #AC00EF, #7B00AC)', flexShrink: 0 }} />
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#AC00EF' }}>Recommended Compliance Sprint — 9 Months to Dec 2026</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            {
              phase: 'Phase 1 — Now → Month 3',
              color: '#FF4444',
              gradStart: 'rgba(255,68,68,0.08)',
              items: [
                'Engage EUDR specialist (Sourcemap, Proforest, Rainforest Alliance)',
                'Map all forest-risk commodities in supply chain by product category',
                'Identify first-placer status for each commodity / market',
              ]
            },
            {
              phase: 'Phase 2 — Month 3 → Month 6',
              color: '#AC00EF',
              gradStart: 'rgba(172,0,239,0.08)',
              items: [
                'Collect geographic coordinates (GPS / plot-level) from all Tier 1 suppliers',
                'Conduct risk assessment per commodity per country using EC benchmark list',
                'Implement digital traceability platform for SE Asia supply chain',
              ]
            },
            {
              phase: 'Phase 3 — Month 6 → Dec 2026',
              color: '#00C896',
              gradStart: 'rgba(0,200,150,0.08)',
              items: [
                'Submit due diligence statements via EUDR Information System',
                'Implement annual review protocol and 5-year record keeping',
                'Disclose EUDR compliance status in LP pre-contractual documents',
              ]
            },
          ].map((phase, i) => (
            <div key={phase.phase} style={{ padding: '1rem 1.25rem', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: `linear-gradient(180deg, ${phase.gradStart} 0%, transparent 60%)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                <div style={{ width: 2, height: 12, borderRadius: 2, background: phase.color, flexShrink: 0 }} />
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: phase.color }}>{phase.phase}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {phase.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: phase.color, fontWeight: 700, flexShrink: 0, marginTop: '0.15rem', fontSize: 'var(--fs-label)' }}>→</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 'var(--fs-micro)', color: '#555' }}>
          Penalty: up to 4% EU-wide annual turnover + product confiscation + temporary market access ban (Article 25, Regulation EU 2023/1115)
        </div>
      </div>

    </div>
  );
}
