import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import AgentStatus from '../components/AgentStatus.jsx';
import ReasoningDrawer from '../components/ReasoningDrawer.jsx';
import RaiPanel from '../components/RaiPanel.jsx';
import { COMPANY_MAP } from '../data/companies.js';
import { richText } from '../utils/richText.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
  'Loading company financials and holding period...',
  'Modelling base case (compliance-only ESG)...',
  'Applying BCG/EY-Parthenon ESG benchmarks...',
  'Calculating initiative-level IRR contributions...',
  'Running implementation cost projections...',
  'Generating exit narrative for LP pack...'
];

function fmt(n, currency = '€') {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `${currency}${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${currency}${(n / 1_000).toFixed(0)}K`;
  return `${currency}${n}`;
}
function pct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function x(n)   { return n != null ? `${Number(n).toFixed(2)}x` : '—'; }

function Card({ children, style = {}, highlight = false, className = '' }) {
  return (
    <div className={`card-hover ${className}`} style={{
      background: highlight ? 'linear-gradient(135deg, #001a10 0%, #0d0d0d 60%)' : '#0d0d0d',
      border: `1px solid ${highlight ? '#00C89640' : '#1a1a2e'}`,
      borderRadius: '0.5rem',
      padding: '1.25rem',
      ...style
    }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  const c = color ?? '#00C896';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: `linear-gradient(180deg, ${c}, #9764ff)`, flexShrink: 0 }} />
      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: c }}>
        {children}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.75rem', fontSize: 'var(--fs-label)' }}>
      <p style={{ fontWeight: 500, color: '#fff', marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(1)}%</p>
      ))}
    </div>
  );
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} style={{ background: 'none', border: '1px solid #1a1a2e', borderRadius: '0.5rem', color: copied ? '#00C896' : '#555', fontSize: 'var(--fs-micro)', padding: '0.25rem 0.625rem', cursor: 'pointer', transition: 'color 200ms' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function Screen2Predict({ companyId, companyOverride, screen1Result, onResult, runTrigger = 0, cachedResult }) {
  const [agentStatus, setAgentStatus] = useState(() => cachedResult ? 'complete' : 'idle');
  const [data,        setData]        = useState(() => cachedResult ?? null);
  const [error,       setError]       = useState(null);
  const [meta,        setMeta]        = useState(null);
  const [expanded,    setExpanded]    = useState(false);
  const [scenario,    setScenario]    = useState('base');

  const prevTrigger = useRef(cachedResult?._runTrigger ?? 0);
  useEffect(() => {
    if (runTrigger > prevTrigger.current) {
      prevTrigger.current = runTrigger;
      run();
    }
  }, [runTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const company = companyOverride ?? COMPANY_MAP[companyId];

  const scenarioMultipliers = {
    bear: { irrMultiplier: 0.6, label: 'Bear', color: '#888888' },
    base: { irrMultiplier: 1.0, label: 'Base', color: '#00C896' },
    bull: { irrMultiplier: 1.4, label: 'Bull', color: '#22d3ee' },
  };

  async function run() {
    setAgentStatus('running'); setData(null); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
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

  const irrData = data ? [
    { name: 'Base Case', irr: Number(data.baseCase?.projectedIrr) },
    { name: 'With ESG',  irr: Number(data.baseCase?.projectedIrr) + (Number(data.withEsgInterventions?.irrUplift ?? 0) * scenarioMultipliers[scenario].irrMultiplier) }
  ] : [];

  return (
    <div>
      {/* Header with image banner */}
      <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#000000', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #FF99C9, #926EF7 50%, #6EEEF7)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.6))' }} />
        {data && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(0,200,150,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00C896', marginBottom: '0.375rem' }}>
              ESG Value Engine · IRR Uplift Model
            </div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.25rem' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>
              {company.geography} · {fmt(company.peInvestmentContext.investmentAmount, company.currency)} PE investment · {company.peInvestmentContext.holdingPeriod}-year hold · {company.peInvestmentContext.targetExitMultiple}x target
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {screen1Result && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: '#00C89615', border: '1px solid #00C89640',
                borderRadius: '999px', padding: '0.2rem 0.625rem',
                fontSize: 'var(--fs-micro)', color: '#00C896', fontWeight: 500
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00C896', flexShrink: 0 }} />
                ESG Screen context loaded · Score {screen1Result.overallScore}
              </div>
            )}
            {data && (
              <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#00C896', fontSize: 'var(--fs-label)', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', padding: 0 }}>
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
        <div style={{ background: '#FF444410', border: '1px solid #FF444440', borderRadius: '0.5rem', padding: '1rem', color: '#FF4444', fontSize: 'var(--fs-sm)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Scenario toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '0.25rem' }}>Scenario:</span>
            {Object.entries(scenarioMultipliers).map(([key, val]) => (
              <button key={key} onClick={() => setScenario(key)} style={{
                padding: '0.375rem 0.875rem', borderRadius: '999px', cursor: 'pointer',
                border: `1px solid ${scenario === key ? val.color : '#2a2a2a'}`,
                background: scenario === key ? `${val.color}20` : 'transparent',
                color: scenario === key ? val.color : '#555',
                fontSize: 'var(--fs-label)', fontWeight: 700, transition: 'all 200ms'
              }}>
                {val.label}
              </button>
            ))}
          </div>

          {/* Row 1: IRR chart + Base vs ESG */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '1rem' }}>

            {/* IRR chart */}
            <Card>
              <Label>Projected IRR Comparison</Label>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={irrData} barCategoryGap="40%">
                  <CartesianGrid stroke="#1a1a2e" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#787878', fontSize: 11, fontFamily: "'Inter', -apple-system, sans-serif" }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, Math.ceil(((data.withEsgInterventions?.projectedIrr ?? 30) + 5) / 5) * 5]}
                    tick={{ fill: '#444444', fontSize: 10, fontFamily: "'Inter', -apple-system, sans-serif" }}
                    axisLine={false} tickLine={false} unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a1a2e' }} />
                  <Bar dataKey="irr" name="IRR" radius={[4, 4, 0, 0]}>
                    <Cell fill="#2d2d4e" />
                    <Cell fill="#00C896" />
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
                    { label: 'Exit EV',        val: fmt(data.baseCase?.exitEv, company.currency) },
                    { label: 'Exit Multiple',  val: x(data.baseCase?.exitMultiple) }
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--fs-label)', color: '#787878' }}>{label}</span>
                      <span className="data-mono" style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: '#aaaaaa' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {(() => {
                const mult = scenarioMultipliers[scenario].irrMultiplier;
                const irrUpliftS = (data.withEsgInterventions?.irrUplift ?? 0) * mult;
                const projIrrS   = (data.baseCase?.projectedIrr ?? 0) + irrUpliftS;
                const addlValS   = (data.withEsgInterventions?.additionalValueCreated ?? 0) * mult;
                const exitEvS    = (data.baseCase?.exitEv ?? 0) + addlValS;
                const investAmt  = company.peInvestmentContext?.investmentAmount ?? 1;
                const projMoicS  = exitEvS / investAmt;
                const baseExitMult = data.baseCase?.exitMultiple ?? 0;
                const esgExitMultDelta = (data.withEsgInterventions?.exitMultiple ?? 0) - baseExitMult;
                const exitMultS  = baseExitMult + esgExitMultDelta * mult;
                return (
              <Card highlight>
                <Label>With ESG Value Engine</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Projected IRR',  val: pct(projIrrS) },
                    { label: 'MOIC',           val: x(projMoicS) },
                    { label: 'Exit EV',        val: fmt(exitEvS, company.currency) },
                    { label: 'Exit Multiple',  val: x(exitMultS) }
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--fs-label)', color: '#00C89699' }}>{label}</span>
                      <span className="data-mono" style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: '#00C896' }}>{val}</span>
                    </div>
                  ))}
                </div>
                {/* IRR uplift */}
                <div style={{ marginTop: '1rem', background: '#00C89622', border: '1px solid #00C89644', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', color: '#00C896', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>IRR Uplift</div>
                  <div className="data-mono num-in" style={{ fontSize: '2.75rem', fontWeight: 700, color: scenarioMultipliers[scenario].color, lineHeight: 1 }}>+{pct((data.withEsgInterventions?.irrUplift ?? 0) * scenarioMultipliers[scenario].irrMultiplier)}</div>
                </div>
              </Card>
                );
              })()}
            </div>
          </div>

          {/* Row 2: Value callouts */}
          <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#0A0A0A', border: '1px solid #00C89633', borderRadius: '0.5rem', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#00C896', marginBottom: '0.5rem' }}>Additional Value Created</div>
              <div className="num-in stat-hero" style={{ fontSize: '2.75rem', color: scenarioMultipliers[scenario].color }}>
                {fmt((data.withEsgInterventions?.additionalValueCreated ?? 0) * scenarioMultipliers[scenario].irrMultiplier, company.currency)}
              </div>
              <div style={{ fontSize: 'var(--fs-label)', color: '#787878', marginTop: '0.5rem' }}>beyond base case exit EV</div>
            </div>
            <Card style={{ textAlign: 'center' }}>
              <Label>Net ROI on ESG Investment</Label>
              <div className="num-in stat-hero" style={{ fontSize: '2.5rem', color: '#fff' }}>
                {data.netRoiOnEsgInvestment}
              </div>
              <div style={{ fontSize: 'var(--fs-label)', color: '#787878', marginTop: '0.5rem' }}>value created / total ESG spend</div>
            </Card>
            <Card>
              <Label>Implementation Cost</Label>
              {data.esgImplementationCost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {[
                    { label: 'Year 1 setup',    val: fmt(data.esgImplementationCost.year1Setup, company.currency) },
                    { label: 'Annual ongoing',  val: fmt(data.esgImplementationCost.annualOngoing, company.currency) }
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--fs-label)', color: '#787878' }}>{label}</span>
                      <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: '#787878' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1a1a2e', paddingTop: '0.625rem' }}>
                    <span style={{ fontSize: 'var(--fs-label)', color: '#787878', fontWeight: 500 }}>{company.peInvestmentContext?.holdingPeriod ?? 5}-year total</span>
                    <span className="data-mono" style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: '#fff' }}>{fmt(data.esgImplementationCost.totalFiveYear, company.currency)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Scenario Analysis Table — Bear / Base / Bull */}
          {data.withEsgInterventions && (() => {
            const irrUplift = data.withEsgInterventions.irrUplift ?? 0;
            const addlVal   = data.withEsgInterventions.additionalValueCreated ?? 0;
            const baseEv    = data.baseCase?.exitEv ?? 0;
            const netRoiRaw = parseFloat(String(data.netRoiOnEsgInvestment ?? '0').replace(/[^0-9.]/g, '')) || 0;

            const cols = [
              { key: 'bear', label: 'Bear', sub: '30th pct · BCG lower bound',    color: '#888888', mult: 0.6 },
              { key: 'base', label: 'Base', sub: 'Median · McKinsey / BCG',        color: '#00C896', mult: 1.0 },
              { key: 'bull', label: 'Bull', sub: '70th pct · Bain upper bound',    color: '#22d3ee', mult: 1.4 },
            ];
            const rows = [
              { label: 'IRR Uplift',    fn: m => `+${pct(irrUplift * m)}` },
              { label: "Add'l Value",   fn: m => fmt(addlVal * m, company.currency) },
              { label: 'Total Exit EV', fn: m => fmt(baseEv + addlVal * m, company.currency) },
              { label: 'Net ROI',       fn: m => `~${Math.round(netRoiRaw * m)}x` },
            ];

            const cellBase = { padding: '0.5rem 1rem', borderRight: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' };
            const labelCell = { ...cellBase, justifyContent: 'flex-start', fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' };

            const items = [];
            // header row
            items.push(<div key="h0" style={{ ...cellBase, justifyContent: 'flex-start', background: '#080808', borderBottom: '1px solid #1a1a2e' }} />);
            cols.forEach(col => items.push(
              <div key={`h-${col.key}`} style={{ ...cellBase, background: '#080808', flexDirection: 'column', gap: '0.1rem', borderBottom: `2px solid ${col.color}` }}>
                <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.label}</span>
                <span style={{ fontSize: 'var(--fs-label)', color: '#444', letterSpacing: '0.04em' }}>{col.sub}</span>
              </div>
            ));
            // data rows
            rows.forEach((row, ri) => {
              items.push(<div key={`r${ri}-l`} style={{ ...labelCell, borderTop: '1px solid #1a1a2e', background: '#0A0A0A' }}>{row.label}</div>);
              cols.forEach(col => items.push(
                <div key={`r${ri}-${col.key}`} style={{ ...cellBase, borderTop: '1px solid #1a1a2e' }}>
                  <span className="data-mono" style={{ fontSize: 'var(--fs-body)', fontWeight: col.mult === 1.0 ? 700 : 500, color: col.mult === 1.0 ? '#00C896' : '#555' }}>
                    {row.fn(col.mult)}
                  </span>
                </div>
              ));
            });

            return (
              <div className="fade-up fade-up-2" style={{ background: '#0A0A0A', border: '1px solid #1a1a2e', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>Scenario Analysis</div>
                  <div style={{ fontSize: 'var(--fs-label)', color: '#333', letterSpacing: '0.04em' }}>BCG PE Sustainability 2025 · Bain 2024 · McKinsey Net Zero PE Playbook</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '8rem 1fr 1fr 1fr' }}>{items}</div>
                <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #1a1a2e', fontSize: 'var(--fs-label)', color: '#555', letterSpacing: '0.04em' }}>
                  <span style={{ color: '#888888', fontWeight: 700 }}>Bear</span> = 30th-percentile of industry ESG value creation range — even the conservative case delivers positive ROI
                </div>
              </div>
            );
          })()}

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
                    <div key={i} style={{ background: '#0D0D0D', border: '1px solid #1a1a2e', borderRadius: '0.5rem', overflow: 'hidden' }}>
                      {/* Top: initiative name + cost/savings/payback */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', padding: '0.875rem 1rem', alignItems: 'start' }}>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>
                          {item.intervention}
                        </div>
                        <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'flex-start', flexShrink: 0 }}>
                          {[
                            { label: 'Cost',    val: fmt(item.totalCost, company.currency),    color: '#555555' },
                            { label: 'Savings', val: fmt(item.annualSavings, company.currency), color: '#FFFFFF' },
                            { label: 'Payback', val: item.paybackMonths ? `${item.paybackMonths}mo` : '—', color: '#c8c8c4' },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
                              <div className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Bottom: IRR | Exit Multiple */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #1a1a2e' }}>
                        <div style={{ padding: '0.625rem 1rem', borderRight: '1px solid #1a1a2e' }}>
                          <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>IRR Contribution</div>
                          <div className="data-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#00C896', marginBottom: irrDetail ? '0.25rem' : 0 }}>{irrHero}</div>
                          {irrDetail && (
                            <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }} dangerouslySetInnerHTML={{ __html: richText(irrDetail) }} />
                          )}
                        </div>
                        <div style={{ padding: '0.625rem 1rem' }}>
                          <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Exit Multiple</div>
                          <div className="data-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#00C896', marginBottom: exitDetail ? '0.25rem' : 0 }}>{exitHero}</div>
                          {exitDetail && (
                            <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }} dangerouslySetInnerHTML={{ __html: richText(exitDetail) }} />
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
                      { label: 'Before ESG', val: `${data.riskMitigation.greenwashingRiskBefore}/10`, color: '#FF4444' },
                      { label: 'After ESG',  val: `${data.riskMitigation.greenwashingRiskAfter}/10`,  color: '#FFFFFF' }
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                        <div className="data-mono" style={{ fontSize: '2.25rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', marginBottom: '0.4rem' }}>Greenwashing Risk Score</div>
                  </div>
                  <div style={{ height: '1px', background: '#1a1a2e' }} />
                  <div style={{ fontSize: 'var(--fs-label)', color: '#c8c8c4', lineHeight: 1.55 }}
                    dangerouslySetInnerHTML={{ __html: richText(data.riskMitigation.regulatoryRiskReduction) }}
                  />
                </div>
              )}
            </Card>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <Label style={{ marginBottom: 0 }}>Exit Narrative for Buyers</Label>
                <CopyButton text={data.exitNarrative ?? ''} />
              </div>
              {(() => {
                const sentences = (data.exitNarrative ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sentences.slice(0, expanded ? undefined : 4).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#00C896', fontWeight: 700, flexShrink: 0, fontSize: 'var(--fs-label)', marginTop: '0.25rem', width: '4px', height: '4px', borderRadius: '50%', background: '#00C896', display: 'inline-block' }} />
                        <span style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: richText(s.trim()) }} />
                      </div>
                    ))}
                    {!expanded && sentences.length > 4 && (
                      <span style={{ fontSize: 'var(--fs-micro)', color: '#444444', paddingLeft: '1rem' }}>+{sentences.length - 4} more — expand to read all</span>
                    )}
                  </div>
                );
              })()}
            </Card>
          </div>

        </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #00C89628', borderRadius: '0.5rem', padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, #001a10 0%, #080808 100%)' }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h2)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Ready to model {company.name}
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: '#555555', marginBottom: '2rem' }}>
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
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#333333' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
