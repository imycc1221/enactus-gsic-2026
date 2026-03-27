import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import AgentStatus from '../components/AgentStatus.jsx';
import { COMPANY_MAP } from '../data/companies.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
  'Loading company financials and holding period...',
  'Modelling base case (compliance-only ESG)...',
  'Applying BCG/EY-Parthenon ESG benchmarks...',
  'Calculating initiative-level IRR contributions...',
  'Running implementation cost projections...',
  'Generating exit narrative for LP pack...'
];

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
function pct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function x(n)   { return n != null ? `${Number(n).toFixed(2)}x` : '—'; }

function Card({ children, style = {}, highlight = false, className = '' }) {
  return (
    <div className={`card-hover ${className}`} style={{
      background: highlight ? '#130018' : '#111111',
      border: `1px solid ${highlight ? '#AC00EF44' : '#2E2E2E'}`,
      borderRadius: '0.25rem',
      padding: '1.25rem',
      ...style
    }}>
      {children}
    </div>
  );
}

function Label({ children, purple = false }) {
  return (
    <div style={{
      fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: purple ? '#AC00EF' : '#fff',
      marginBottom: '0.75rem'
    }}>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.75rem' }}>
      <p style={{ fontWeight: 500, color: '#fff', marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(1)}%</p>
      ))}
    </div>
  );
};


export default function Screen2Predict({ companyId }) {
  const [agentStatus, setAgentStatus] = useState('idle');
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);
  const [expanded,    setExpanded]    = useState(false);

  const company = COMPANY_MAP[companyId];

  async function run() {
    setAgentStatus('running'); setData(null); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setData(await res.json());
      setAgentStatus('complete');
    } catch (err) { setError(err.message); setAgentStatus('idle'); }
  }

  const irrData = data ? [
    { name: 'Base Case', irr: Number(data.baseCase?.projectedIrr) },
    { name: 'With ESG',  irr: Number(data.withEsgInterventions?.projectedIrr) }
  ] : [];

  return (
    <div>
      {/* Header with image banner */}
      <div style={{ position: 'relative', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#111111', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.6))' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontWeight: 300, fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#787878' }}>
              {company.geography} · {fmt(company.peInvestmentContext.investmentAmount)} PE investment · {company.peInvestmentContext.holdingPeriod}-year hold · {company.peInvestmentContext.targetExitMultiple}x target
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {data && (
              <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#AC00EF', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', padding: 0 }}>
                {expanded ? '− Collapse details' : '+ Expand all details'}
              </button>
            )}
            <button className="btn-acc" onClick={run} disabled={agentStatus === 'running'}>
              {agentStatus === 'running' ? 'Modelling...' : agentStatus === 'complete' ? 'Re-model' : 'Run Value Prediction'}
            </button>
          </div>
        </div>
      </div>

      <AgentStatus steps={STEPS} status={agentStatus} />

      {error && (
        <div style={{ background: '#FF1F5A10', border: '1px solid #FF1F5A40', borderRadius: '0.25rem', padding: '1rem', color: '#FF1F5A', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Row 1: IRR chart + Base vs ESG */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '1rem' }}>

            {/* IRR chart */}
            <Card>
              <Label>Projected IRR Comparison</Label>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={irrData} barCategoryGap="40%">
                  <CartesianGrid stroke="#2E2E2E" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#787878', fontSize: 11, fontFamily: 'Graphik, Arial, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, Math.ceil(((data.withEsgInterventions?.projectedIrr ?? 30) + 5) / 5) * 5]}
                    tick={{ fill: '#444444', fontSize: 10, fontFamily: 'Graphik, Arial, sans-serif' }}
                    axisLine={false} tickLine={false} unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E1E1E' }} />
                  <Bar dataKey="irr" name="IRR" radius={[2, 2, 0, 0]}>
                    <Cell fill="#2E2E2E" />
                    <Cell fill="#AC00EF" />
                    <LabelList dataKey="irr" position="top" formatter={v => `${Number(v).toFixed(1)}%`} style={{ fill: '#787878', fontSize: 11, fontFamily: 'ui-monospace, monospace' }} />
                  </Bar>
                  <ReferenceLine y={data.baseCase?.projectedIrr} stroke="#444444" strokeDasharray="4 4" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Side-by-side metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

              <Card>
                <Label>Base Case — No ESG Program</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Projected IRR',  val: pct(data.baseCase?.projectedIrr) },
                    { label: 'MOIC',           val: x(data.baseCase?.projectedMoic) },
                    { label: 'Exit EV',        val: fmt(data.baseCase?.exitEv) },
                    { label: 'Exit Multiple',  val: x(data.baseCase?.exitMultiple) }
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#787878' }}>{label}</span>
                      <span className="data-mono" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#aaaaaa' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card highlight>
                <Label purple>With ESG Value Engine</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Projected IRR',  val: pct(data.withEsgInterventions?.projectedIrr) },
                    { label: 'MOIC',           val: x(data.withEsgInterventions?.projectedMoic) },
                    { label: 'Exit EV',        val: fmt(data.withEsgInterventions?.exitEv) },
                    { label: 'Exit Multiple',  val: x(data.withEsgInterventions?.exitMultiple) }
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#AC00EF99' }}>{label}</span>
                      <span className="data-mono" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F04FDB' }}>{val}</span>
                    </div>
                  ))}
                </div>
                {/* IRR uplift */}
                <div style={{ marginTop: '1rem', background: '#AC00EF22', border: '1px solid #AC00EF44', borderRadius: '0.25rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#AC00EF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>IRR Uplift</div>
                  <div className="data-mono num-in" style={{ fontSize: '2.75rem', fontWeight: 700, color: '#F04FDB', lineHeight: 1 }}>+{pct(data.withEsgInterventions?.irrUplift)}</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Row 2: Value callouts */}
          <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#0D0018', border: '1px solid #AC00EF33', borderRadius: '0.25rem', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#AC00EF', marginBottom: '0.5rem' }}>Additional Value Created</div>
              <div className="num-in stat-hero" style={{ fontSize: '2.75rem', color: '#FFFFFF' }}>
                {fmt(data.withEsgInterventions?.additionalValueCreated)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#787878', marginTop: '0.5rem' }}>beyond base case exit EV</div>
            </div>
            <Card style={{ textAlign: 'center' }}>
              <Label>Net ROI on ESG Investment</Label>
              <div className="num-in stat-hero" style={{ fontSize: '2.5rem', color: '#fff' }}>
                {data.netRoiOnEsgInvestment}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#787878', marginTop: '0.5rem' }}>value created / total ESG spend</div>
            </Card>
            <Card>
              <Label>Implementation Cost</Label>
              {data.esgImplementationCost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {[
                    { label: 'Year 1 setup',    val: fmt(data.esgImplementationCost.year1Setup) },
                    { label: 'Annual ongoing',  val: fmt(data.esgImplementationCost.annualOngoing) }
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#787878' }}>{label}</span>
                      <span className="data-mono" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#787878' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2E2E2E', paddingTop: '0.625rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#787878', fontWeight: 500 }}>5-year total</span>
                    <span className="data-mono" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>{fmt(data.esgImplementationCost.totalFiveYear)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Row 3: ESG breakdown cards */}
          {data.esgBreakdown?.length > 0 && (
            <Card className="fade-up fade-up-3">
              <Label>ESG Initiative Breakdown</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.esgBreakdown.map((item, i) => {
                  const irrStr = String(item.irrContribution ?? '');
                  const irrM = irrStr.match(/^([+\-]?[\d.,]+\s*(?:pp|x|%|bps)?)/i);
                  const irrHero  = irrM ? irrM[1].trim() : irrStr.split(/\s/)[0];
                  const irrDetail = irrM ? irrStr.slice(irrM[1].length).replace(/^[\s–—\-]+/, '').trim() : null;

                  const exitStr = String(item.exitMultipleImpact ?? '');
                  const exitM = exitStr.match(/^([+\-]?[\d.,]+\s*x?)/i);
                  const exitHero   = exitM ? exitM[1].trim() : exitStr.split(/\s/)[0];
                  const exitDetail = exitM ? exitStr.slice(exitM[1].length).replace(/^[\s–—\-]+/, '').trim() : null;

                  return (
                    <div key={i} style={{ background: '#0D0D0D', border: '1px solid #2E2E2E', borderRadius: '0.25rem', overflow: 'hidden' }}>
                      {/* Top: initiative name + cost/savings/payback */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', padding: '0.875rem 1rem', alignItems: 'start' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>
                          {item.intervention}
                        </div>
                        <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'flex-start', flexShrink: 0 }}>
                          {[
                            { label: 'Cost',    val: fmt(item.totalCost),                                   color: '#555555' },
                            { label: 'Savings', val: fmt(item.annualSavings),                               color: '#FFFFFF' },
                            { label: 'Payback', val: item.paybackMonths ? `${item.paybackMonths}mo` : '—', color: '#c8c8c4' },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
                              <div className="data-mono" style={{ fontSize: '0.875rem', fontWeight: 600, color }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Bottom: IRR | Exit Multiple */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #1E1E1E' }}>
                        <div style={{ padding: '0.625rem 1rem', borderRight: '1px solid #1E1E1E' }}>
                          <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>IRR Contribution</div>
                          <div className="data-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#F04FDB', marginBottom: irrDetail ? '0.25rem' : 0 }}>{irrHero}</div>
                          {irrDetail && (
                            <div style={{ fontSize: '0.6875rem', color: '#787878', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>{irrDetail}</div>
                          )}
                        </div>
                        <div style={{ padding: '0.625rem 1rem' }}>
                          <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Exit Multiple</div>
                          <div className="data-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#AC00EF', marginBottom: exitDetail ? '0.25rem' : 0 }}>{exitHero}</div>
                          {exitDetail && (
                            <div style={{ fontSize: '0.6875rem', color: '#787878', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>{exitDetail}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Row 4: Risk mitigation + Exit narrative */}
          <div className="fade-up fade-up-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <Label>Risk Mitigation</Label>
              {data.riskMitigation && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
                    {[
                      { label: 'Before ESG', val: `${data.riskMitigation.greenwashingRiskBefore}/10`, color: '#FF1F5A' },
                      { label: 'After ESG',  val: `${data.riskMitigation.greenwashingRiskAfter}/10`,  color: '#FFFFFF' }
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                        <div className="data-mono" style={{ fontSize: '2.25rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: '0.6875rem', color: '#787878', marginBottom: '0.4rem' }}>Greenwashing Risk Score</div>
                  </div>
                  <div style={{ height: '1px', background: '#1E1E1E' }} />
                  <div style={{ fontSize: '0.75rem', color: '#c8c8c4', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {data.riskMitigation.regulatoryRiskReduction}
                  </div>
                </div>
              )}
            </Card>
            <Card>
              <Label>Exit Narrative for Buyers</Label>
              {(() => {
                const sentences = (data.exitNarrative ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sentences.slice(0, expanded ? undefined : 4).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#AC00EF', fontWeight: 700, flexShrink: 0, fontSize: '0.625rem', marginTop: '0.25rem', width: '4px', height: '4px', borderRadius: '50%', background: '#AC00EF', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.8125rem', color: '#c8c8c4', lineHeight: 1.6 }}>{s.trim()}</span>
                      </div>
                    ))}
                    {!expanded && sentences.length > 4 && (
                      <span style={{ fontSize: '0.6875rem', color: '#444444', paddingLeft: '1rem' }}>+{sentences.length - 4} more — expand to read all</span>
                    )}
                  </div>
                );
              })()}
            </Card>
          </div>

        </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.25rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontSize: '1.25rem', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Ready to model {company.name}
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#555555', marginBottom: '2rem' }}>
            Click <strong style={{ color: '#fff', fontWeight: 500 }}>Run Value Prediction</strong> to generate the full financial model
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'IRR Uplift',      desc: 'Base case vs ESG model' },
              { label: 'Exit EV',         desc: 'Additional value created' },
              { label: 'Initiative ROI',  desc: 'Cost vs savings per action' },
              { label: 'Exit Narrative',  desc: 'LP-ready buyer story' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '0.6875rem', color: '#333333' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
