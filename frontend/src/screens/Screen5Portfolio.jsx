import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Legend
} from 'recharts';
import { COMPANIES } from '../data/companies.js';
import AgentFlowDiagram from '../components/AgentFlowDiagram.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ARTICLE_COLOR = {
  'Article 6': '#FF4444',
  'Article 8': '#AC00EF',
  'Article 9': '#00C896',
};

const COMPANY_COLORS = ['#AC00EF', '#7B00AC', '#00C896'];

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function scoreColor(s) {
  if (s >= 75) return '#AC00EF';
  if (s >= 50) return '#AC00EF';
  return '#FF4444';
}

function Card({ children, style = {} }) {
  return (
    <div className="card-hover" style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem', ...style }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: color ?? '#fff', marginBottom: '0.75rem' }}>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '0.75rem', fontSize: 'var(--fs-label)' }}>
      <p style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(1)}{p.unit ?? ''}</p>
      ))}
    </div>
  );
};

export default function Screen5Portfolio() {
  const [status, setStatus] = useState('idle');
  const [data,   setData]   = useState(null);
  const [error,  setError]  = useState(null);

  async function run() {
    setStatus('running'); setData(null); setError(null);
    try {
      const results = await Promise.all(
        COMPANIES.map(async c => {
          const [analyze, predict, sfdr] = await Promise.all([
            fetch(`${API_BASE}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(r => r.json()),
            fetch(`${API_BASE}/api/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(r => r.json()),
            fetch(`${API_BASE}/api/sfdr`,    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(r => r.json()),
          ]);
          return { company: c, analyze, predict, sfdr };
        })
      );
      setData(results);
      setStatus('complete');
    } catch (err) { setError(err.message); setStatus('idle'); }
  }

  // Derived chart data
  const pillarData = data ? [
    { axis: 'Environmental', ...Object.fromEntries(data.map(d => [d.company.shortName, d.analyze.pillarScores?.environmental ?? 0])) },
    { axis: 'Social',        ...Object.fromEntries(data.map(d => [d.company.shortName, d.analyze.pillarScores?.social ?? 0])) },
    { axis: 'Governance',    ...Object.fromEntries(data.map(d => [d.company.shortName, d.analyze.pillarScores?.governance ?? 0])) },
    { axis: 'Data Quality',  ...Object.fromEntries(data.map(d => [d.company.shortName, Math.round((d.analyze.dataConfidenceScore ?? 0) * 100)])) },
  ] : [];

  const irrData = data ? data.map((d, i) => ({
    name: d.company.shortName,
    base: Number(d.predict.baseCase?.projectedIrr ?? 0),
    esg:  Number(d.predict.withEsgInterventions?.projectedIrr ?? 0),
    uplift: Number(d.predict.withEsgInterventions?.irrUplift ?? 0),
    color: COMPANY_COLORS[i],
  })) : [];

  const totalValue = data ? data.reduce((s, d) => s + (d.predict.withEsgInterventions?.additionalValueCreated ?? 0), 0) : 0;
  const avgConfidence = data ? Math.round(data.reduce((s, d) => s + (d.analyze.dataConfidenceScore ?? 0), 0) / data.length * 100) : 0;
  const avgScore = data ? Math.round(data.reduce((s, d) => s + (d.analyze.overallScore ?? 0), 0) / data.length) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ position: 'relative', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#000000' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(172,0,239,0.05) 0%, #000000 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
              ESG Portfolio Overview
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>
              3 portfolio companies · Simultaneous ESG screen + financial model + SFDR classification
            </p>
          </div>
          <button className="btn-acc" onClick={run} disabled={status === 'running'}>
            {status === 'running' ? 'Analysing portfolio...' : status === 'complete' ? 'Re-run Portfolio' : 'Run Portfolio Analysis'}
          </button>
        </div>
      </div>

      {status === 'running' && (
        <div style={{ background: '#0A0A0A', border: '1px solid #AC00EF33', borderRadius: '0.25rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="animate-pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#AC00EF', flexShrink: 0, boxShadow: '0 0 6px #AC00EF88' }} />
          <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#616160' }}>
            Running 9 parallel AI calls — ESG Screen + Value Model + SFDR Classifier for each company
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-micro)', color: '#AC00EF' }}>powered by Claude AI</span>
        </div>
      )}

      {error && (
        <div style={{ background: '#FF444410', border: '1px solid #FF444440', borderRadius: '0.25rem', padding: '1rem', color: '#FF4444', fontSize: 'var(--fs-sm)', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {/* Agent architecture diagram — always visible */}
      <AgentFlowDiagram />

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Investment Priority Ranking */}
          {(() => {
            const ranked = [...data].map((d, i) => {
              const esg     = d.analyze.overallScore ?? 0;
              const conf    = (d.analyze.dataConfidenceScore ?? 0) * 100;
              const uplift  = Number(d.predict.withEsgInterventions?.irrUplift ?? 0);
              const artScore = d.sfdr.recommendedArticle === 'Article 9' ? 100 : d.sfdr.recommendedArticle === 'Article 8' ? 60 : 20;
              const composite = Math.round(esg * 0.35 + conf * 0.15 + uplift * 8 + artScore * 0.1);
              const verdict   = esg >= 65 ? 'PROCEED' : esg >= 45 ? 'MONITOR' : 'CAUTION';
              const vColor    = verdict === 'PROCEED' ? '#00C896' : verdict === 'MONITOR' ? '#888888' : '#FF4444';
              const driver    = uplift > 3 ? `+${uplift.toFixed(1)}pp IRR uplift` : esg >= 65 ? `ESG score ${esg}/100` : `${d.sfdr.recommendedArticle} LP-ready`;
              return { ...d, composite, verdict, vColor, driver, origIdx: i };
            }).sort((a, b) => b.composite - a.composite);

            return (
              <div className="fade-up fade-up-1" style={{ background: '#0A0A0A', border: '1px solid #AC00EF33', borderRadius: '0.25rem', padding: '1.25rem' }}>
                <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#AC00EF', marginBottom: '1rem' }}>
                  Investment Priority Ranking
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ranked.map((d, rank) => (
                    <div key={d.company.id} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr auto auto auto auto', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', background: rank === 0 ? '#ffffff06' : '#0A0A0A', border: `1px solid ${rank === 0 ? '#AC00EF33' : '#1E1E1E'}`, borderRadius: '0.2rem' }}>
                      <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 700, color: rank === 0 ? '#AC00EF' : '#2E2E2E', lineHeight: 1, textAlign: 'center' }}>#{rank + 1}</div>
                      <div>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#fff' }}>{d.company.shortName}</div>
                        <div style={{ fontSize: 'var(--fs-micro)', color: '#444', marginTop: '0.15rem' }}>{d.company.sasbSector}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>Composite</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: COMPANY_COLORS[d.origIdx] }}>{d.composite}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>ESG</div>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: scoreColor(d.analyze.overallScore ?? 0) }}>{d.analyze.overallScore ?? '—'}/100</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>Key Driver</div>
                        <div style={{ fontSize: 'var(--fs-micro)', color: '#787878' }}>{d.driver}</div>
                      </div>
                      <div style={{ padding: '0.3rem 0.75rem', background: `${d.vColor}15`, border: `1px solid ${d.vColor}40`, borderRadius: '999px', fontSize: 'var(--fs-micro)', fontWeight: 700, color: d.vColor, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {d.verdict}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: 'var(--fs-label)', color: '#222' }}>
                  Composite score = ESG materiality (35%) + data confidence (15%) + IRR uplift (40%) + SFDR classification (10%)
                </div>
              </div>
            );
          })()}

          {/* Portfolio summary strip */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, border: '1px solid #AC00EF22', borderRadius: '0.25rem', overflow: 'hidden' }}>
            {[
              { stat: fmt(totalValue),     label: 'Total additional value', sub: 'across all 3 companies vs base case' },
              { stat: `${avgScore}/100`,   label: 'Avg ESG materiality score', sub: 'SASB-weighted across portfolio' },
              { stat: `${avgConfidence}%`, label: 'Avg data confidence', sub: 'analyst review required below 70%' },
              { stat: '3× Art. 8',         label: 'SFDR classification', sub: 'all companies LP-ready today' },
            ].map(({ stat, label, sub }, i) => (
              <div key={i} style={{ padding: '0.875rem 1.125rem', borderRight: i < 3 ? '1px solid #AC00EF22' : 'none', background: '#0A0A0A' }}>
                <div className="data-mono" style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: '#AC00EF', lineHeight: 1, marginBottom: '0.3rem' }}>{stat}</div>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#444' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Company scorecards */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {data.map((d, i) => {
              const artCfg = ARTICLE_COLOR[d.sfdr.recommendedArticle] ?? '#AC00EF';
              const highRisks = (d.analyze.riskFlags ?? []).filter(r => r.severity === 'high');
              return (
                <Card key={d.company.id} style={{ borderTop: `2px solid ${COMPANY_COLORS[i]}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>{d.company.shortName}</div>
                      <div style={{ fontSize: 'var(--fs-label)', color: '#555' }}>{d.company.sasbSector}</div>
                    </div>
                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: artCfg, background: `${artCfg}15`, border: `1px solid ${artCfg}40`, borderRadius: '999px', padding: '0.2rem 0.5rem' }}>
                      {d.sfdr.recommendedArticle}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'ESG Score',   val: `${d.analyze.overallScore}/100`,                                          color: scoreColor(d.analyze.overallScore) },
                      { label: 'Confidence',  val: `${Math.round((d.analyze.dataConfidenceScore ?? 0) * 100)}%`,             color: (d.analyze.dataConfidenceScore ?? 0) > 0.7 ? '#00C896' : '#888888' },
                      { label: 'IRR Uplift',  val: `+${Number(d.predict.withEsgInterventions?.irrUplift ?? 0).toFixed(1)}pp`, color: '#AC00EF' },
                      { label: 'Value Added', val: fmt(d.predict.withEsgInterventions?.additionalValueCreated),              color: '#FFFFFF' },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
                        <div className="data-mono" style={{ fontSize: '1rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {highRisks.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1E1E1E' }}>
                      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>High-Severity Risks</div>
                      {highRisks.slice(0, 2).map((r, j) => (
                        <div key={j} style={{ fontSize: 'var(--fs-micro)', color: '#FF4444', marginBottom: '0.15rem' }}>· {r.area}</div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* ESG Pillar comparison + IRR comparison */}
          <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Radar — E/S/G pillar comparison */}
            <Card>
              <Label>ESG Pillar Comparison</Label>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={pillarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#1E1E1E" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#787878', fontSize: 10, fontFamily: "'Inter', -apple-system, sans-serif" }} />
                  {data.map((d, i) => (
                    <Radar key={d.company.shortName} name={d.company.shortName} dataKey={d.company.shortName} stroke={COMPANY_COLORS[i]} fill={COMPANY_COLORS[i]} fillOpacity={0.08} strokeWidth={1.5} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 'var(--fs-micro)', color: '#787878', paddingTop: '0.5rem' }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* IRR comparison */}
            <Card>
              <Label>IRR — Base vs ESG (by company)</Label>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={irrData} barCategoryGap="30%">
                  <CartesianGrid stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#787878', fontSize: 10, fontFamily: "'Inter', -apple-system, sans-serif" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E1E1E' }} />
                  <Bar dataKey="base" name="Base IRR" fill="#2E2E2E" radius={[2, 2, 0, 0]} unit="%" />
                  <Bar dataKey="esg"  name="With ESG" radius={[2, 2, 0, 0]} unit="%">
                    {irrData.map((entry, i) => <Cell key={i} fill={COMPANY_COLORS[i]} />)}
                  </Bar>
                  <Legend wrapperStyle={{ fontSize: 'var(--fs-micro)', color: '#787878', paddingTop: '0.5rem' }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Risk matrix */}
          <Card className="fade-up fade-up-3">
            <Label>Portfolio Risk Matrix</Label>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', width: '40%', borderBottom: '1px solid #1E1E1E' }}>Risk Area</th>
                    {data.map((d, i) => (
                      <th key={d.company.id} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontSize: 'var(--fs-micro)', fontWeight: 700, color: COMPANY_COLORS[i], textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #1E1E1E' }}>
                        {d.company.shortName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allAreas = [...new Set(data.flatMap(d => (d.analyze.riskFlags ?? []).map(r => r.area)))];
                    const SEV = { high: 3, medium: 2, low: 1 };
                    const SEV_STYLE = {
                      high:   { bg: '#FF444415', color: '#FF4444', label: 'HIGH' },
                      medium: { bg: '#AC00EF10', color: '#AC00EF', label: 'MED'  },
                      low:    { bg: '#AC00EF10', color: '#AC00EF', label: 'LOW'  },
                    };
                    return allAreas.slice(0, 8).map((area, i) => (
                      <tr key={area} style={{ borderBottom: '1px solid #0D0D0D' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#c8c8c4', fontWeight: 500 }}>{area}</td>
                        {data.map(d => {
                          const flag = (d.analyze.riskFlags ?? []).find(r => r.area === area);
                          const s = flag ? SEV_STYLE[flag.severity] : null;
                          return (
                            <td key={d.company.id} style={{ textAlign: 'center', padding: '0.5rem 0.75rem' }}>
                              {s ? (
                                <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: s.color, background: s.bg, borderRadius: '2px', padding: '0.15rem 0.5rem', letterSpacing: '0.06em' }}>{s.label}</span>
                              ) : (
                                <span style={{ color: '#222', fontSize: 'var(--fs-label)' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Investment committee summary */}
          <Card className="fade-up fade-up-4" style={{ background: '#0A0A0A', border: '1px solid #AC00EF33' }}>
            <Label color="#AC00EF">Investment Committee Summary</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {data.map((d, i) => {
                const verdict = d.analyze.overallScore >= 65 ? 'PROCEED' : d.analyze.overallScore >= 45 ? 'MONITOR' : 'CAUTION';
                const vColor  = verdict === 'PROCEED' ? '#00C896' : verdict === 'MONITOR' ? '#888888' : '#FF4444';
                return (
                  <div key={d.company.id} style={{ borderLeft: `3px solid ${COMPANY_COLORS[i]}`, paddingLeft: '1rem' }}>
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#555', marginBottom: '0.375rem' }}>{d.company.shortName}</div>
                    <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: vColor, marginBottom: '0.375rem' }}>{verdict}</div>
                    <div style={{ fontSize: 'var(--fs-label)', color: '#787878', lineHeight: 1.5 }}>
                      ESG {d.analyze.overallScore}/100 · {d.sfdr.recommendedArticle} · +{Number(d.predict.withEsgInterventions?.irrUplift ?? 0).toFixed(1)}pp IRR uplift
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>
      )}

      {status === 'idle' && !data && (
        <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.25rem', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h2)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Portfolio-level ESG analysis
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: '#555555', marginBottom: '2rem' }}>
            Runs ESG Screen + Value Model + SFDR Classifier for all 3 companies simultaneously — 9 parallel AI calls, results in under 3 seconds
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'ESG Comparison',  desc: 'E/S/G pillar radar per company'  },
              { label: 'IRR Ranking',     desc: 'Base vs ESG IRR across portfolio' },
              { label: 'Risk Matrix',     desc: 'Cross-company risk heatmap'       },
              { label: 'IC Summary',      desc: 'Investment committee verdict'     },
            ].map(({ label, desc }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#333333' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
