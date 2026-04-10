import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import AgentStatus from '../components/AgentStatus.jsx';
import ReasoningDrawer from '../components/ReasoningDrawer.jsx';
import RaiPanel from '../components/RaiPanel.jsx';
import { COMPANY_MAP, getRegScoping } from '../data/companies.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
  'Parsing ESG data point and context...',
  'Scanning CSRD/ESRS article requirements...',
  'Mapping to SFDR PAI indicators...',
  'Cross-referencing TCFD, IFRS S1/S2 (ISSB), GRI, SASB, EDCI...',
  'Assessing AI automation potential...',
  'Generating multi-framework output...'
];

const DATA_POINT_LABELS = {
  'greentech-mfg':      'GHG Emissions — Scope 1 + Scope 2 (12,500 tCO2e total)',
  'cleanenergy-saas':   'Employee Diversity & Inclusion (42% female, 50% board diversity)',
  'sustainable-retail': 'Supply Chain Scope 3 GHG (45,000 tCO2e, 16% audit coverage)'
};

const STATUS_STYLE = {
  compliant:        { bg: '#AC00EF18', border: '#AC00EF40', text: '#FFFFFF',  label: 'Compliant' },
  needs_conversion: { bg: '#AC00EF10', border: '#AC00EF30', text: '#AC00EF',  label: 'Needs Conversion' },
  needs_enrichment: { bg: '#FF444418', border: '#FF444440', text: '#FF4444',  label: 'Needs Enrichment' },
  partial:          { bg: '#AC00EF0A', border: '#AC00EF25', text: '#AC00EF',  label: 'Partial' },
  not_applicable:   { bg: '#2E2E2E18', border: '#44444440', text: '#787878',  label: 'N/A' }
};

// Maps framework keyword → flag country code (ISO 3166-1 alpha-2, from flagcdn.com)
// Framework badge config: flag = flagcdn code, logo = local image path, bg = background colour
const FRAMEWORK_META = {
  CSRD: { flag: 'eu',        abbr: 'EU'  },
  ESRS: { flag: 'eu',        abbr: 'EU'  },
  SFDR: { flag: 'eu',        abbr: 'EU'  },
  TCFD: { flag: 'gb',        abbr: 'UK'  },
  GRI:  { logo: '/images/logos/gri-logo.svg',  bg: '#ffffff', abbr: 'GRI' },
  SASB: { logo: '/images/logos/sasb-logo.png', bg: '#ffffff', abbr: 'US'  },
  EDCI: { logo: '/images/edci-logo.svg',       bg: '#42baba', abbr: 'PE'  },
  IFRS: { flag: 'un',        abbr: 'INT' },
  HKEX: { flag: 'hk',        abbr: 'HK'  },
};

function getFrameworkMeta(fw) {
  const upper = fw.toUpperCase();
  for (const [key, meta] of Object.entries(FRAMEWORK_META)) {
    if (upper.includes(key)) return meta;
  }
  return { abbr: fw.slice(0, 3).toUpperCase() };
}

function FrameworkBadge({ fw }) {
  const meta = getFrameworkMeta(fw);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', width: '2.75rem', background: '#1A1A1A', border: '1px solid #333333', borderRadius: '3px', padding: '0.3rem 0.25rem', flexShrink: 0 }}>
      {meta.logo ? (
        <div style={{ width: '1.5rem', height: '1.5rem', background: meta.bg, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px', overflow: 'hidden' }}>
          <img src={meta.logo} alt={meta.abbr} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
      ) : meta.flag ? (
        <img src={`/images/flags/${meta.flag}.png`} alt={meta.abbr} style={{ width: '1.5rem', height: 'auto', display: 'block', borderRadius: '1px', imageRendering: 'crisp-edges' }} />
      ) : (
        <div style={{ width: '1.5rem', height: '1rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '2px' }} />
      )}
      <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#787878', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>{meta.abbr}</span>
    </div>
  );
}

function clamp(lines, expanded) {
  if (expanded) return {};
  return { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
}

function Card({ children, style = {}, className = '' }) {
  return (
    <div className={`card-hover ${className}`} style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem', ...style }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>{children}</div>;
}

export default function Screen3Map({ companyId, companyOverride, screen1Result, onResult, runTrigger = 0, cachedResult }) {
  const [agentStatus, setAgentStatus] = useState(() => cachedResult ? 'complete' : 'idle');
  const [data,        setData]        = useState(() => cachedResult ?? null);
  const [error,       setError]       = useState(null);
  const [meta,        setMeta]        = useState(null);
  const [expanded,    setExpanded]    = useState(false);

  const prevTrigger = useRef(cachedResult?._runTrigger ?? 0);
  useEffect(() => {
    if (runTrigger > prevTrigger.current) {
      prevTrigger.current = runTrigger;
      run();
    }
  }, [runTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const company = companyOverride ?? COMPANY_MAP[companyId];

  async function run() {
    setAgentStatus('running'); setData(null); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/map`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...company, _screen1Result: screen1Result ?? null })
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const result = await res.json();
      setData(result);
      setMeta(result._meta ?? null);
      onResult?.(result);
      setAgentStatus('complete');
    } catch (err) { setError(err.message); setAgentStatus('idle'); }
  }

  const total       = data?.mappings?.length ?? 0;
  const automatable = data?.mappings?.filter(m => m.automatable).length ?? 0;
  const compliant   = data?.mappings?.filter(m => m.status === 'compliant').length ?? 0;

  const complianceDonut = total > 0 ? [
    { name: 'Compliant',         value: data.mappings.filter(m => m.status === 'compliant').length,        color: '#AC00EF' },
    { name: 'Partial',           value: data.mappings.filter(m => m.status === 'partial').length,          color: '#7B00AC' },
    { name: 'Needs Conversion',  value: data.mappings.filter(m => m.status === 'needs_conversion').length, color: '#888888' },
    { name: 'Needs Enrichment',  value: data.mappings.filter(m => m.status === 'needs_enrichment').length, color: '#FF4444' },
    { name: 'N/A',               value: data.mappings.filter(m => m.status === 'not_applicable').length,   color: '#2E2E2E' },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      {/* Header with image banner */}
      <div style={{ position: 'relative', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#111111', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.6))' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.25rem' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>
              {company.geography} · {company.regulatoryExposure.join(' · ')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {data && (
              <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#AC00EF', fontSize: 'var(--fs-label)', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', padding: 0 }}>
                {expanded ? '− Collapse details' : '+ Expand all details'}
              </button>
            )}
            <button className="btn-acc" onClick={run} disabled={agentStatus === 'running'}>
              {agentStatus === 'running' ? 'Mapping...' : agentStatus === 'complete' ? 'Re-map' : 'Run Framework Mapper'}
            </button>
          </div>
        </div>
      </div>

      <AgentStatus steps={STEPS} status={agentStatus} />

      {meta && agentStatus === 'complete' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--fs-label)', color: '#333', marginBottom: '1rem' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.cached ? '#888888' : '#00C896', flexShrink: 0 }} />
          {meta.cached ? 'Cached result' : 'Live result'} · Generated {new Date(meta.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {meta.cached && (
            <button onClick={run} style={{ background: 'none', border: 'none', color: '#555', fontSize: 'var(--fs-label)', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: '0.25rem' }}>
              Re-run live →
            </button>
          )}
        </div>
      )}

      <RaiPanel />
      {meta && (
        <div style={{ marginBottom: '1rem' }}>
          <ReasoningDrawer meta={meta} />
        </div>
      )}

      {error && (
        <div style={{ background: '#FF444410', border: '1px solid #FF444440', borderRadius: '0.25rem', padding: '1rem', color: '#FF4444', fontSize: 'var(--fs-sm)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Value proposition callout */}
          <div className="fade-up fade-up-1" style={{ background: '#0A0A0A', border: '1px solid #AC00EF33', borderRadius: '0.25rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>

            {/* 1 input → N frameworks visual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="num-in stat-hero" style={{ fontSize: '4rem', color: '#AC00EF' }}>1</div>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>data input</div>
              </div>
              <div style={{ width: '1.5rem', height: '1px', background: '#AC00EF44', flexShrink: 0 }} />
              <div style={{ textAlign: 'center' }}>
                <div className="num-in stat-hero" style={{ fontSize: '4rem', color: '#AC00EF', animationDelay: '100ms' }}>{total}</div>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>frameworks</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '4rem', background: '#AC00EF33', flexShrink: 0 }} />

            {/* Stats */}
            <div style={{ display: 'flex', gap: '2.5rem' }}>
              {[
                { val: compliant,   label: 'immediately compliant', color: '#FFFFFF' },
                { val: automatable, label: 'AI-automatable',        color: '#AC00EF' },
                { val: total - compliant, label: 'need action',     color: '#AC00EF' }
              ].map(({ val, label, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div className="num-in stat-hero" style={{ fontSize: '2.5rem', color }}>{val}</div>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.35rem' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Compliance donut */}
            {complianceDonut.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <ResponsiveContainer width={80} height={80}>
                    <PieChart>
                      <Pie data={complianceDonut} cx={36} cy={36} innerRadius={22} outerRadius={36} strokeWidth={0} dataKey="value" startAngle={90} endAngle={-270}>
                        {complianceDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#fff' }}>{Math.round((compliant / total) * 100)}%</span>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.375rem' }}>compliant</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                  {complianceDonut.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--fs-label)', color: '#787878', whiteSpace: 'nowrap' }}>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accenture thesis */}
            <div style={{ marginLeft: 'auto', maxWidth: '16rem' }}>
              <div style={{ fontSize: 'var(--fs-micro)', color: '#AC00EF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                The ESG Value Engine thesis
              </div>
              <p style={{ fontSize: 'var(--fs-sm)', color: '#787878', lineHeight: 1.5 }}>
                One data submission. Automated multi-framework compliance. Accenture's consulting layer provides strategic interpretation.
              </p>
            </div>
          </div>

          {/* Regulatory Obligations Split — Mandatory vs De Facto */}
          {(() => {
            const scoping = getRegScoping(company);
            const urgencyColor = { critical: '#FF4444', high: '#FF4444', medium: '#888888' };
            return (
              <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#0A0A0A', border: '1px solid #FF444425', borderRadius: '0.25rem', padding: '0.875rem' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF4444', marginBottom: '0.5rem' }}>
                    Legally Mandatory
                  </div>
                  {scoping.mandatory.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.5rem 0.75rem', background: '#00C89608', border: '1px solid #00C89625', borderRadius: '0.25rem' }}>
                        <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#00C89615', border: '1px solid #00C89635', borderRadius: '2px', padding: '0.15rem 0.4rem', flexShrink: 0, marginTop: '0.05rem' }}>Below Threshold</span>
                        <span style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.55 }}>Omnibus I raises mandatory CSRD reporting threshold to 1,000+ employees. No CSRD/ESRS/CSDDD obligations apply at current company size.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'var(--fs-micro)', color: '#333', fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                        <span style={{ color: '#444' }}>→</span>
                        <span>De facto LP/SFDR 2.0 obligations still apply — see column right</span>
                      </div>
                    </div>
                  ) : scoping.mandatory.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.375rem 0', borderTop: i > 0 ? '1px solid #1A1A1A' : 'none' }}>
                      <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: urgencyColor[item.urgency] ?? '#888888', background: `${urgencyColor[item.urgency] ?? '#888888'}20`, border: `1px solid ${urgencyColor[item.urgency] ?? '#888888'}40`, borderRadius: '2px', padding: '0.1rem 0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, marginTop: '0.15rem' }}>{item.urgency}</span>
                      <div>
                        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: '#fff', marginBottom: '0.15rem' }}>{item.label}</div>
                        <div style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.5 }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '0.875rem' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#CCCCCC', marginBottom: '0.5rem' }}>
                    De Facto (LP Pressure + SFDR 2.0)
                  </div>
                  {scoping.deFacto.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.375rem 0', borderTop: i > 0 ? '1px solid #1A1A1A' : 'none' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', flexShrink: 0 }}>→</span>
                      <div>
                        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: '#c8c8c4', marginBottom: '0.15rem' }}>{item.label}</div>
                        <div style={{ fontSize: 'var(--fs-micro)', color: '#444', lineHeight: 1.5 }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1A1A1A', fontSize: 'var(--fs-label)', color: '#444444', fontStyle: 'italic' }}>
                    De facto obligations persist even when no mandatory reporting threshold is met — LP mandates and SFDR 2.0 do not have employee/revenue exemptions.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Input data point */}
          <Card className="fade-up fade-up-2">
            <Label>Input Data Point</Label>
            <div style={{ background: '#1E1E1E', border: '1px solid #444444', borderRadius: '0.25rem', padding: '0.875rem' }}>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: '#fff', marginBottom: '0.375rem' }}>{DATA_POINT_LABELS[companyId]}</div>
              {data.inputSummary && <p style={{ fontSize: 'var(--fs-label)', color: '#787878', lineHeight: 1.5 }}>{data.inputSummary}</p>}
            </div>
          </Card>

          {/* One Input → N Outputs: Cross-Framework Field Name Crosswalk */}
          {data.mappings?.length > 0 && (
            <div className="fade-up fade-up-3" style={{ background: '#080808', border: '1px solid #2E2E2E', borderRadius: '0.25rem', overflow: 'hidden' }}>
              <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>Cross-Framework Field Crosswalk</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#333' }}>One data submission → exact field name per framework — drop directly into regulatory filing</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '6rem 1fr 1fr', fontSize: 'var(--fs-micro)' }}>
                {/* header */}
                {['Framework', 'Exact Disclosure Field', 'Reporting Format'].map((h, i) => (
                  <div key={h} style={{ padding: '0.4rem 0.75rem', background: '#0D0D0D', borderRight: i < 2 ? '1px solid #1A1A1A' : 'none', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
                {data.mappings.map((m, i) => {
                  const s = STATUS_STYLE[m.status] ?? STATUS_STYLE.partial;
                  return [
                    <div key={`fw-${i}`} style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid #1A1A1A', borderTop: '1px solid #141414', display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.text, flexShrink: 0, marginTop: '0.2rem' }} />
                      <span style={{ fontWeight: 700, color: '#c8c8c4', lineHeight: 1.5 }}>{m.framework}</span>
                    </div>,
                    <div key={`dp-${i}`} style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid #1A1A1A', borderTop: '1px solid #141414', color: '#787878', lineHeight: 1.55 }}>
                      {m.standard?.split('+')[0]?.replace(/\(.*?\)/g, '').trim() ?? m.dataPoint?.split(';')[0]?.trim()}
                    </div>,
                    <div key={`fmt-${i}`} style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #141414', color: '#444', lineHeight: 1.55 }}>
                      {m.format?.split(';')[0]?.split('—')[0]?.trim() ?? '—'}
                    </div>,
                  ];
                })}
              </div>
            </div>
          )}

          {/* Framework mapping grid */}
          <div className="fade-up fade-up-3">
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#787878', marginBottom: '0.75rem' }}>
              Multi-Framework Output — one submission, automated cross-framework compliance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {data.mappings?.map((m, i) => {
                const s = STATUS_STYLE[m.status] ?? STATUS_STYLE.partial;
                return (
                  <div key={i} className="card-hover" style={{
                    background: '#111111', border: '1px solid #2E2E2E',
                    borderLeft: `3px solid ${s.text}44`, borderRadius: '0.25rem',
                    overflow: 'hidden'
                  }}>
                    {/* Header row: badge + name | status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                        <FrameworkBadge fw={m.framework} />
                        <div style={{ fontWeight: 600, fontSize: 'var(--fs-body)', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.framework}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                        <span style={{ fontSize: 'var(--fs-micro)', padding: '0.2rem 0.625rem', background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: '2px', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                          {s.label}
                        </span>
                        {m.automatable && (
                          <span style={{ fontSize: 'var(--fs-micro)', color: '#AC00EF', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: '#AC00EF15', border: '1px solid #AC00EF33', borderRadius: '2px', padding: '0.1rem 0.375rem' }}>
                            AI-AUTOMATABLE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Standard disclosures (pink, clamped) */}
                    {m.standard && (
                      <div style={{ margin: '0.625rem 1rem 0', padding: '0.5rem 0.75rem', background: '#AC00EF0A', borderLeft: '2px solid #AC00EF44', borderRadius: '0 2px 2px 0' }}>
                        <div style={{ fontSize: 'var(--fs-micro)', color: '#AC00EF', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>
                          {m.standard}
                        </div>
                      </div>
                    )}

                    {/* Fields table */}
                    <div style={{ padding: '0.75rem 1rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {[
                        { k: 'Data field',  v: m.dataPoint },
                        { k: 'Format',      v: m.format },
                        { k: 'Materiality', v: m.materiality },
                        m.note ? { k: 'Note', v: m.note } : null
                      ].filter(Boolean).map(({ k, v }, idx, arr) => (
                        <div key={k} style={{ display: 'grid', gridTemplateColumns: '5.5rem 1fr', gap: '0 0.625rem', padding: '0.4rem 0', borderBottom: idx < arr.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: '0.1rem', lineHeight: 1.4 }}>{k}</span>
                          <span style={{ fontSize: 'var(--fs-label)', color: '#a0a0a0', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automation + Missing data */}
          <div className="fade-up fade-up-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
            <Card>
              <Label>Automation Potential</Label>
              <p style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.65, marginBottom: '1rem', ...clamp(3, expanded) }}>{data.automationPotential}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: '3px', background: '#1E1E1E', borderRadius: '2px' }}>
                  <div className="bar-fill" style={{ height: '100%', width: `${total > 0 ? (automatable / total) * 100 : 0}%`, background: 'linear-gradient(to right, #7B00AC, #AC00EF)', borderRadius: '2px' }} />
                </div>
                <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#AC00EF' }}>
                  {total > 0 ? Math.round((automatable / total) * 100) : 0}%
                </span>
              </div>
              <div style={{ fontSize: 'var(--fs-micro)', color: '#444444', marginTop: '0.375rem' }}>
                {automatable} of {total} mappings fully automatable by AI
              </div>

              {/* Per-framework automatable breakdown */}
              {total > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #1A1A1A', paddingTop: '0.875rem' }}>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444', marginBottom: '0.5rem' }}>Per-Framework Status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {data.mappings.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.625rem', background: m.automatable ? '#AC00EF08' : '#0D0D0D', borderRadius: '2px', borderLeft: `2px solid ${m.automatable ? '#AC00EF55' : '#2E2E2E'}` }}>
                        <span style={{ fontSize: 'var(--fs-label)', color: '#c8c8c4', fontWeight: 600, letterSpacing: '0.03em' }}>{m.framework.split(' ')[0]}</span>
                        {m.automatable
                          ? <span style={{ fontSize: 'var(--fs-label)', color: '#AC00EF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Auto</span>
                          : <span style={{ fontSize: 'var(--fs-label)', color: '#444' }}>Manual</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <Label>Missing Data for Full Compliance</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.missingToComplete?.length > 0
                  ? data.missingToComplete.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0D0D', borderLeft: '2px solid #AC00EF44', borderRadius: '0 2px 2px 0' }}>
                        <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem', flexShrink: 0 }}>Gap</span>
                        <span style={{ fontSize: 'var(--fs-label)', color: '#787878', lineHeight: 1.55, ...clamp(2, expanded) }}>{item}</span>
                      </div>
                    ))
                  : (
                    <div style={{ padding: '0.75rem 1rem', background: '#AC00EF0A', border: '1px solid #AC00EF33', borderRadius: '0.25rem', fontSize: 'var(--fs-sm)', color: '#FFFFFF', fontWeight: 500 }}>
                      All frameworks satisfied with available data
                    </div>
                  )
                }
              </div>
            </Card>
          </div>

          {data.summary && (
            <Card className="fade-up fade-up-5">
              <Label>Summary</Label>
              <p style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.7, ...clamp(4, expanded) }}>{data.summary}</p>
            </Card>
          )}

        </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.25rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h2)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            One input. Six framework outputs.
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: '#555555', marginBottom: '2rem' }}>
            Click <strong style={{ color: '#fff', fontWeight: 500 }}>Run Framework Mapper</strong> to generate automated cross-framework compliance
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {['CSRD / ESRS', 'SFDR', 'TCFD', 'IFRS S1/S2 (ISSB / HKEX)', 'GRI', 'SASB', 'EDCI'].map(fw => (
              <div key={fw} style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{fw}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
