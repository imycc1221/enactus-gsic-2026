import { useState, useEffect, useRef } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip } from 'recharts';
import AgentStatus from '../components/AgentStatus.jsx';
import ReasoningDrawer from '../components/ReasoningDrawer.jsx';
import RaiPanel from '../components/RaiPanel.jsx';
import { COMPANY_MAP } from '../data/companies.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
  'Classifying SASB industry (77-industry materiality map)...',
  'Applying materiality filter to ESG data...',
  'Scoring KPIs against available evidence...',
  'Calculating financial risk exposure...',
  'Quantifying EBITDA value opportunities...',
  'Mapping framework compliance gaps...'
];

const SEVERITY = {
  high:   { border: '#FF444444', bg: '#FF44440A', accent: '#FF4444' },
  medium: { border: '#9764ff44', bg: '#9764ff0A', accent: '#9764ff' },
  low:    { border: '#9764ff22', bg: '#9764ff05', accent: '#888888' }
};

const DATA_STATUS = {
  available: { bg: '#9764ff12', text: '#FFFFFF',  border: '#9764ff40' },
  partial:   { bg: '#9764ff0A', text: '#9764ff',  border: '#9764ff30' },
  missing:   { bg: '#FF444412', text: '#FF4444',  border: '#FF444440' }
};

const FRAMEWORK_COLOR = { csrd: '#9764ff', sfdr: '#9764ff', tcfd: '#FFFFFF', edci: '#9764ff', sasb: '#9764ff' };

function fmt(n, currency = '€') {
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)     return `${currency}${(n / 1_000).toFixed(0)}K`;
  return `${currency}${n}`;
}

function scoreColor(s) {
  if (s >= 75) return '#9764ff';
  if (s >= 50) return '#9764ff';
  return '#FF4444';
}


function SectionLabel({ children, style = {} }) {
  return (
    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.875rem', ...style }}>
      {children}
    </div>
  );
}

function Card({ children, style = {}, className = '' }) {
  return (
    <div className={`card-hover glass-card ${className}`} style={{ padding: '1.5rem', ...style }}>
      {children}
    </div>
  );
}

const SECTIONS = ['kpis', 'risks', 'opportunities', 'recommendation', 'quickwins'];

// SASB-sector ESG score benchmarks (median, p25, p75) — sourced from MSCI ESG Ratings universe
const SECTOR_BENCHMARKS = {
  'industrial machinery':      { median: 45, p25: 31, p75: 61, peers: 847,  label: 'Industrial Machinery & Goods' },
  'software':                  { median: 58, p25: 44, p75: 73, peers: 1240, label: 'Software & IT Services' },
  'technology':                { median: 58, p25: 44, p75: 73, peers: 1240, label: 'Software & IT Services' },
  'retail':                    { median: 41, p25: 28, p75: 56, peers: 632,  label: 'Multiline & Specialty Retailers' },
  'consumer':                  { median: 43, p25: 30, p75: 57, peers: 912,  label: 'Consumer Goods' },
  'healthcare':                { median: 52, p25: 38, p75: 67, peers: 780,  label: 'Health Care' },
  'energy':                    { median: 39, p25: 24, p75: 55, peers: 580,  label: 'Extractives & Minerals' },
  'financial':                 { median: 55, p25: 41, p75: 69, peers: 1430, label: 'Financials' },
  'real estate':               { median: 48, p25: 35, p75: 62, peers: 460,  label: 'Real Estate' },
  'transportation':            { median: 44, p25: 30, p75: 59, peers: 390,  label: 'Transportation' },
  default:                     { median: 48, p25: 33, p75: 63, peers: 2100, label: 'Cross-sector' },
};

function getSectorBenchmark(sasbSector = '') {
  const lower = sasbSector.toLowerCase();
  for (const [key, val] of Object.entries(SECTOR_BENCHMARKS)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  return SECTOR_BENCHMARKS.default;
}

function getSectorPercentile(score, bm) {
  if (score <= bm.p25)     return Math.round((score / bm.p25) * 25);
  if (score <= bm.median)  return Math.round(25 + ((score - bm.p25) / (bm.median - bm.p25)) * 25);
  if (score <= bm.p75)     return Math.round(50 + ((score - bm.median) / (bm.p75 - bm.median)) * 25);
  return Math.round(75 + ((score - bm.p75) / (100 - bm.p75)) * 25);
}

export default function Screen1Analyze({ companyId, companyOverride, onResult, runTrigger = 0, cachedResult }) {
  const [agentStatus,   setAgentStatus]   = useState(() => cachedResult ? 'complete' : 'idle');
  const [data,          setData]          = useState(() => cachedResult ?? null);
  const [error,         setError]         = useState(null);
  const [meta,          setMeta]          = useState(null);
  const [streamText,    setStreamText]    = useState('');
  const [isStreaming,   setIsStreaming]   = useState(false);
  const [openSections,  setOpenSections]  = useState(Object.fromEntries(SECTIONS.map(k => [k, false])));

  const prevTrigger = useRef(cachedResult?._runTrigger ?? 0);
  useEffect(() => {
    if (runTrigger > prevTrigger.current) {
      prevTrigger.current = runTrigger;
      run();
    }
  }, [runTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(key) { setOpenSections(s => ({ ...s, [key]: !s[key] })); }
  function openAll()           { setOpenSections(Object.fromEntries(SECTIONS.map(k => [k, true]))); }
  function closeAll()          { setOpenSections(Object.fromEntries(SECTIONS.map(k => [k, false]))); }
  const allOpen = SECTIONS.every(k => openSections[k]);

  const company = companyOverride ?? COMPANY_MAP[companyId];

  async function run() {
    setAgentStatus('running'); setData(null); setError(null); setStreamText(''); setIsStreaming(false);
    setOpenSections(Object.fromEntries(SECTIONS.map(k => [k, false])));
    try {
      const res = await fetch(`${API_BASE}/api/analyze/stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);

      setIsStreaming(true);
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          if (event.type === 'delta') {
            setStreamText(prev => prev + event.text);
          } else if (event.type === 'done') {
            setData(event.result);
            setMeta(event._meta ?? null);
            onResult?.(event.result);
            setIsStreaming(false);
            setStreamText('');
            setAgentStatus('complete');
            setOpenSections(s => ({ ...s, kpis: true }));
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) { setError(err.message); setAgentStatus('idle'); setIsStreaming(false); setStreamText(''); }
  }

  const radarData = data ? [
    { subject: 'Environmental', score: data.pillarScores?.environmental ?? 0 },
    { subject: 'Social',        score: data.pillarScores?.social ?? 0 },
    { subject: 'Governance',    score: data.pillarScores?.governance ?? 0 },
    { subject: 'Data Quality',  score: Math.round((data.dataConfidenceScore ?? 0) * 100) },
    {
      subject: 'Frameworks',
      score: data.frameworkGaps
        ? Math.round(Object.values(data.frameworkGaps).filter(Boolean).reduce((s, fw) => s + (fw.percentage ?? 0), 0) / Math.max(Object.values(data.frameworkGaps).filter(Boolean).length, 1))
        : 0
    }
  ] : [];

  const confidencePct = (data?.dataConfidenceScore != null && !isNaN(data.dataConfidenceScore))
    ? Math.round(data.dataConfidenceScore * 100) : null;

  return (
    <div>
      {/* Company banner */}
      <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '2rem', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #FF99C9, #926EF7 50%, #6EEEF7)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(0,0,0,0.97) 45%, rgba(0,0,0,0.7))' }} />
        {data && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(151,100,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '2rem' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9764ff', marginBottom: '0.375rem' }}>
              ESG Materiality Screen · SASB Standards
            </div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-muted)', letterSpacing: '-0.01em' }}>
              {company.sasbSector} · {company.geography} · {fmt(company.revenue, company.currency)} revenue · {company.employees.toLocaleString()} employees
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {data && (
              <button onClick={allOpen ? closeAll : openAll} style={{ background: 'none', border: 'none', color: '#9764ff', fontSize: 'var(--fs-sm)', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', padding: 0 }}>
                {allOpen ? '− Close all' : '+ Open all'}
              </button>
            )}
            <button className="btn-acc" onClick={run} disabled={agentStatus === 'running'}>
              {agentStatus === 'running' ? 'Analyzing...' : agentStatus === 'complete' ? 'Re-analyze' : 'Run ESG Screen'}
            </button>
          </div>
        </div>
      </div>

      <AgentStatus steps={STEPS} status={agentStatus} stepFindings={data ? [
        `Classified as ${data.sasbClassification ?? '—'}`,
        `${data.materialKpis?.length ?? 0} material KPIs identified`,
        `Data confidence: ${confidencePct ?? 0}%`,
        `${data.riskFlags?.filter(r => r.severity === 'high').length ?? 0} high-severity risks flagged`,
        `${data.valueOpportunities?.length ?? 0} value opportunities quantified`,
        `${Object.keys(data.frameworkGaps ?? {}).length} framework compliance gaps mapped`,
      ] : undefined} />

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

      {(isStreaming || streamText) && (
        <div style={{ background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9764ff', flexShrink: 0, boxShadow: isStreaming ? '0 0 8px #9764ff' : 'none' }} />
            <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Live Claude Output — tool_use: input_json_delta stream
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-label)', color: '#222', fontFamily: 'ui-monospace, monospace' }}>
              {streamText.length} chars received
            </span>
          </div>
          <pre style={{ fontSize: 'var(--fs-micro)', color: '#3a3a3a', lineHeight: 1.55, maxHeight: '140px', overflowY: 'auto', margin: 0, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {streamText}{isStreaming && <span style={{ color: '#9764ff' }}>▋</span>}
          </pre>
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

            {/* Row 1: Score + Radar + SASB */}
            <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'stretch' }}>

              <Card className="card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionLabel>ESG Materiality Score</SectionLabel>
                {/* Score hero with ring */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative', flexShrink: 0, width: 88, height: 88 }}>
                    {/* Conic ring */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: `conic-gradient(${scoreColor(data.overallScore)} ${data.overallScore * 3.6}deg, #1a1a2e ${data.overallScore * 3.6}deg)`,
                      boxShadow: `0 0 24px ${scoreColor(data.overallScore)}44`,
                    }} />
                    <div style={{ position: 'absolute', inset: 7, borderRadius: '50%', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="num-in" style={{ fontSize: '2rem', fontWeight: 700, color: scoreColor(data.overallScore), letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {data.overallScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>out of 100</div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: scoreColor(data.overallScore), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: `${scoreColor(data.overallScore)}15`, border: `1px solid ${scoreColor(data.overallScore)}40`, borderRadius: '4px', padding: '0.25rem 0.625rem', display: 'inline-block' }}>
                      {data.overallScore >= 75 ? 'Strong' : data.overallScore >= 50 ? 'Moderate' : 'Critical'}
                    </div>
                  </div>
                </div>
                {/* Data confidence pill */}
                {confidencePct !== null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    background: '#9764ff15', border: '1px solid #9764ff40',
                    borderRadius: '999px', padding: '0.3rem 0.875rem',
                    fontSize: 'var(--fs-label)', color: '#c8c8c4', marginBottom: '1.5rem', alignSelf: 'flex-start'
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: confidencePct > 70 ? '#00C896' : confidencePct > 50 ? '#888888' : '#FF4444',
                      boxShadow: `0 0 5px ${confidencePct > 70 ? '#00C896' : confidencePct > 50 ? '#888888' : '#FF4444'}`
                    }} />
                    Data confidence: {confidencePct}% · Requires analyst review
                  </div>
                )}
                {/* Pillar bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {['environmental', 'social', 'governance'].map(p => {
                    const v = data.pillarScores?.[p] ?? 0;
                    const c = scoreColor(v);
                    return (
                      <div key={p}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: 'var(--fs-label)', color: '#787878', textTransform: 'capitalize' }}>{p}</span>
                          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: c }}>{v || '—'}</span>
                        </div>
                        <div style={{ height: '4px', background: '#1a1a2e', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${v}%`, background: `linear-gradient(90deg, ${c}88, ${c})`, borderRadius: '2px', transition: 'width 1s cubic-bezier(0.25,1,0.5,1)', boxShadow: `0 0 8px ${c}66` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionLabel>ESG Profile</SectionLabel>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <RadarChart data={radarData} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
                      <PolarGrid stroke="#1a1a2e" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#555', fontSize: 10, fontFamily: "'Inter', -apple-system, sans-serif" }} />
                      <Radar dataKey="score" stroke="#9764ff" fill="#9764ff" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#9764ff', r: 3 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* Mini legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1a1a2e' }}>
                  {radarData.map(d => (
                    <div key={d.subject} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#9764ff', fontWeight: 700 }}>{d.score}</div>
                      <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.subject.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <SectionLabel>SASB Classification</SectionLabel>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: '#9764ff', lineHeight: 1.5 }}>
                    {data.sasbClassification}
                  </div>
                </div>
                <div>
                  <SectionLabel>Data Confidence</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <div style={{ flex: 1, height: '4px', background: '#1a1a2e', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${confidencePct ?? 0}%`, background: 'linear-gradient(90deg, #9764ff88, #9764ff)', borderRadius: '2px', transition: 'width 1s cubic-bezier(0.25,1,0.5,1)', boxShadow: '0 0 8px #9764ff66' }} />
                    </div>
                    <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: '#9764ff', minWidth: '2.75rem', textAlign: 'right' }}>
                      {confidencePct != null ? `${confidencePct}%` : '—'}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <SectionLabel>Framework Compliance</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {Object.entries(data.frameworkGaps ?? {}).sort(([,a],[,b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0)).map(([fw, d]) => d ? (
                      <div key={fw}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{fw}</span>
                          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: FRAMEWORK_COLOR[fw] ?? '#9764ff' }}>{d.percentage}%</span>
                        </div>
                        <div style={{ height: '3px', background: '#1a1a2e', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.percentage ?? 0}%`, background: FRAMEWORK_COLOR[fw] ?? '#9764ff', borderRadius: '2px', transition: 'width 1s cubic-bezier(0.25,1,0.5,1)' }} />
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              </Card>
            </div>

            {/* Investment Verdict Row */}
            <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {(() => {
                const verdict = data.overallScore >= 65 ? 'PROCEED' : data.overallScore >= 45 ? 'MONITOR' : 'CAUTION';
                const vColor  = data.overallScore >= 65 ? '#00C896' : data.overallScore >= 45 ? '#f59e0b' : '#FF4444';
                return (
                  <div style={{ background: '#0d0d0d', border: `1px solid ${vColor}28`, borderRadius: '0.5rem', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: vColor }} />
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.625rem' }}>ESG Verdict</div>
                    <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: vColor, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.5rem', textShadow: `0 0 20px ${vColor}66` }}>
                      {verdict}
                    </div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#444' }}>based on SASB materiality score</div>
                  </div>
                );
              })()}
              {(() => {
                const cColor = confidencePct != null && confidencePct > 70 ? '#00C896' : confidencePct != null && confidencePct > 50 ? '#888888' : '#FF4444';
                return (
                  <div style={{ background: '#0d0d0d', border: `1px solid ${cColor}28`, borderRadius: '0.5rem', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cColor }} />
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.625rem' }}>AI Confidence</div>
                    <div className="num-in" style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: cColor, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.5rem', textShadow: `0 0 20px ${cColor}66` }}>
                      {confidencePct != null ? `${confidencePct}%` : '—'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#444' }}>analyst review required below 70%</div>
                  </div>
                );
              })()}
              <div style={{ background: '#0d0d0d', border: '1px solid #FF444428', borderRadius: '0.5rem', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#FF4444' }} />
                <div style={{ fontSize: 'var(--fs-micro)', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.625rem' }}>Priority Risk</div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#FF4444', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                  {data.riskFlags?.find(r => r.severity === 'high')?.area ?? data.riskFlags?.[0]?.area ?? '—'}
                </div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#444' }}>
                  {data.riskFlags?.filter(r => r.severity === 'high').length ?? 0} high-severity flags identified
                </div>
              </div>
            </div>

            {/* Sector Benchmarking */}
            {(() => {
              const bm = getSectorBenchmark(data.sasbClassification ?? company.sasbSector);
              const pct = getSectorPercentile(data.overallScore, bm);
              const beatMedian = data.overallScore >= bm.median;
              const pos = Math.max(2, Math.min(96, data.overallScore));
              return (
                <div className="fade-up fade-up-1" style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>
                      Sector Benchmarking
                    </div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: '#333', letterSpacing: '0.04em' }}>
                      {bm.peers.toLocaleString()} peers · MSCI ESG Ratings universe · {bm.label}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    {[
                      { label: 'This Company',   val: data.overallScore,   color: scoreColor(data.overallScore), sub: 'SASB-weighted score' },
                      { label: 'Sector Median',  val: bm.median,           color: '#444',                        sub: `${bm.peers.toLocaleString()} companies` },
                      { label: 'Sector P75',     val: bm.p75,              color: '#333',                        sub: 'top-quartile threshold' },
                      { label: 'Percentile Rank',val: `${pct}th`,          color: pct >= 75 ? '#00C896' : pct >= 50 ? '#888888' : '#FF4444', sub: beatMedian ? 'above sector median' : 'below sector median' },
                    ].map(({ label, val, color, sub }) => (
                      <div key={label}>
                        <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.2rem' }}>{val}</div>
                        <div style={{ fontSize: 'var(--fs-label)', color: '#333' }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  {/* Distribution bar */}
                  <div>
                    <div style={{ position: 'relative', height: 8, background: '#1a1a2e', borderRadius: 4, marginBottom: '0.625rem' }}>
                      {/* Gradient fill left→median */}
                      <div style={{ position: 'absolute', left: 0, width: `${bm.median}%`, top: 0, bottom: 0, background: 'linear-gradient(90deg, #ffffff04, #ffffff0c)', borderRadius: '4px 0 0 4px' }} />
                      {/* IQR highlight */}
                      <div style={{ position: 'absolute', left: `${bm.p25}%`, width: `${bm.p75 - bm.p25}%`, top: 0, bottom: 0, background: '#ffffff14', borderRadius: 2 }} />
                      {/* P25 tick */}
                      <div style={{ position: 'absolute', left: `${bm.p25}%`, top: 1, bottom: 1, width: 1, background: '#333' }} />
                      {/* Median tick */}
                      <div style={{ position: 'absolute', left: `${bm.median}%`, top: 0, bottom: 0, width: 1, background: '#555' }} />
                      {/* P75 tick */}
                      <div style={{ position: 'absolute', left: `${bm.p75}%`, top: 1, bottom: 1, width: 1, background: '#333' }} />
                      {/* Company marker */}
                      <div style={{ position: 'absolute', left: `${pos}%`, top: -4, width: 4, height: 16, background: scoreColor(data.overallScore), borderRadius: 2, transform: 'translateX(-50%)', boxShadow: `0 0 10px ${scoreColor(data.overallScore)}99`, transition: 'left 0.8s cubic-bezier(0.25,1,0.5,1)' }} />
                    </div>
                    <div style={{ position: 'relative', height: '1.25rem', fontSize: 'var(--fs-label)', color: '#333', userSelect: 'none' }}>
                      <span style={{ position: 'absolute', left: 0 }}>0</span>
                      <span style={{ position: 'absolute', left: `${bm.p25}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>P25 ({bm.p25})</span>
                      <span style={{ position: 'absolute', left: `${bm.median}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', color: '#555' }}>Median ({bm.median})</span>
                      <span style={{ position: 'absolute', left: `${bm.p75}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>P75 ({bm.p75})</span>
                      <span style={{ position: 'absolute', right: 0 }}>100</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Value proposition callout */}
            <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0', border: '1px solid #9764ff22', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {[
                { stat: '2,240 hrs', label: 'analyst hours replaced per year', sub: '280 hrs × 8 frameworks (Verdantix 2024)' },
                { stat: '~$280K',    label: 'in ESG advisory fees per company', sub: 'vs $35K/framework from Big-4 providers' },
                { stat: '50×',       label: 'cheaper than manual due diligence', sub: 'at $15K–25K/yr SaaS vs consultant model' },
                { stat: '< 90 sec',  label: 'full ESG screen end-to-end', sub: 'vs 6–8 weeks manual analyst workflow' },
              ].map(({ stat, label, sub }, i) => (
                <div key={i} style={{ padding: '0.875rem 1.125rem', borderRight: i < 3 ? '1px solid #9764ff22' : 'none', background: '#0a0a0f' }}>
                  <div className="data-mono" style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: '#9764ff', lineHeight: 1, marginBottom: '0.3rem' }}>{stat}</div>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: '#fff', marginBottom: '0.2rem', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 'var(--fs-micro)', color: '#444', lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Section: Material KPIs */}
            <div className="fade-up fade-up-2">
            {(() => {
              const isOpen = openSections.kpis;
              const kpis = data.materialKpis ?? [];
              const counts = { available: 0, partial: 0, missing: 0 };
              kpis.forEach(k => { if (counts[k.dataStatus] !== undefined) counts[k.dataStatus]++; });
              const grouped = [
                { status: 'available', label: 'Available', items: kpis.filter(k => k.dataStatus === 'available') },
                { status: 'partial',   label: 'Partial',   items: kpis.filter(k => k.dataStatus === 'partial') },
                { status: 'missing',   label: 'Missing',   items: kpis.filter(k => k.dataStatus === 'missing') }
              ].filter(g => g.items.length > 0);
              return (
                <Card style={{ border: `1px solid ${isOpen ? 'rgba(172,0,239,0.35)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 300ms' }}>
                  <button onClick={() => toggleSection('kpis')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Material KPIs — SASB Filtered</SectionLabel>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[['available','#FFFFFF'],['partial','#9764ff'],['missing','#FF4444']].map(([k,c]) => counts[k] > 0 && (
                          <span key={k} style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{counts[k]} {k}</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ color: '#9764ff', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
                  </button>

                  {/* Preview — visible when collapsed */}
                  {!isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {kpis.map((kpi, i) => {
                        const s = DATA_STATUS[kpi.dataStatus] ?? DATA_STATUS.missing;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0D0D', borderRadius: '2px' }}>
                            <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: s.text, flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.kpi}</span>
                            <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: s.text, background: s.bg, border: `1px solid ${s.border}`, borderRadius: '2px', padding: '0.1rem 0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{kpi.dataStatus}</span>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#444444', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>Expand to see EBITDA impact per KPI</div>
                    </div>
                  )}

                  {/* Full detail — visible when expanded */}
                  {isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {grouped.map(({ status, label, items }) => {
                        const s = DATA_STATUS[status];
                        return (
                          <div key={status}>
                            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: s.text, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `1px solid ${s.border}`, paddingBottom: '0.375rem', marginBottom: '0.625rem' }}>{label} — {items.length} KPI{items.length > 1 ? 's' : ''}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                              {items.map((kpi, i) => (
                                <div key={i} style={{ borderLeft: `3px solid ${s.text}`, background: '#0D0D0D', borderRadius: '0 0.25rem 0.25rem 0', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{kpi.kpi}</div>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#9764ff', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, paddingTop: '0.1rem' }}>EBITDA</span>
                                    <span style={{ fontSize: 'var(--fs-label)', fontWeight: 500, color: '#fff', lineHeight: 1.5 }}>{kpi.ebitdaLink}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })()}
            </div>

            <div className="fade-up fade-up-3">
            {/* Section: Risk Flags */}
            {(() => {
              const isOpen = openSections.risks;
              const flags = data.riskFlags ?? [];
              const counts = { high: 0, medium: 0, low: 0 };
              flags.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
              const grouped = [
                { sev: 'high',   items: flags.filter(f => f.severity === 'high') },
                { sev: 'medium', items: flags.filter(f => f.severity === 'medium') },
                { sev: 'low',    items: flags.filter(f => f.severity === 'low') }
              ].filter(g => g.items.length > 0);
              const highCount = counts.high;
              return (
                <Card style={{ border: `1px solid ${isOpen ? 'rgba(172,0,239,0.35)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 300ms' }}>
                  <button onClick={() => toggleSection('risks')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Risk Flags</SectionLabel>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[['high','#FF4444'],['medium','#9764ff'],['low','#888888']].map(([k,c]) => counts[k] > 0 && (
                          <span key={k} style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{counts[k]} {k}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      {flags.length > 0 && (() => {
                        const tot = flags.length;
                        const hDeg = (counts.high   / tot) * 360;
                        const mDeg = (counts.medium / tot) * 360;
                        const grad = `conic-gradient(#FF4444 0deg ${hDeg}deg, #9764ff ${hDeg}deg ${hDeg + mDeg}deg, #888888 ${hDeg + mDeg}deg 360deg)`;
                        return (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: grad, flexShrink: 0, position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', background: '#0d0d0d' }} />
                          </div>
                        );
                      })()}
                      {highCount > 0 && (
                        <div className="data-mono" style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#FF4444' }}>
                          {highCount} HIGH
                        </div>
                      )}
                      <span style={{ color: '#9764ff', fontSize: '1rem', lineHeight: 1, display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
                    </div>
                  </button>

                  {/* Preview */}
                  {!isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {flags.map((flag, i) => {
                        const s = SEVERITY[flag.severity] ?? SEVERITY.low;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '2px' }}>
                            <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: s.accent, flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.08em', width: '3.5rem', flexShrink: 0 }}>{flag.severity}</span>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flag.area}</span>
                            <span style={{ fontSize: 'var(--fs-micro)', color: s.accent, fontWeight: 500, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '14rem' }}>{flag.financialExposure}</span>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#444444', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>Expand to see full risk detail and remediation context</div>
                    </div>
                  )}

                  {/* Full detail */}
                  {isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {grouped.map(({ sev, items }) => {
                        const s = SEVERITY[sev];
                        return (
                          <div key={sev}>
                            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `1px solid ${s.border}`, paddingBottom: '0.375rem', marginBottom: '0.625rem' }}>{sev} severity — {items.length} flag{items.length > 1 ? 's' : ''}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {items.map((flag, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '3.5rem 1fr', gap: '0 1rem', alignItems: 'start', border: `1px solid ${s.border}`, background: s.bg, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                                  <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: s.accent, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', background: `${s.accent}15`, border: `1px solid ${s.accent}30`, borderRadius: '2px', padding: '0.2rem 0', marginTop: '0.15rem' }}>{sev}</span>
                                  <div>
                                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: '0.375rem' }}>{flag.area}</div>
                                    <div className="data-mono" style={{ fontSize: 'var(--fs-label)', color: s.accent, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{flag.financialExposure}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })()}
            </div>

            <div className="fade-up fade-up-4">
            {/* Section: Value Opportunities */}
            {(() => {
              const isOpen = openSections.opportunities;
              const opps = [...(data.valueOpportunities ?? [])].sort((a, b) => (a.paybackMonths ?? 999) - (b.paybackMonths ?? 999));
              const maxSavings = Math.max(...opps.map(o => {
                const m = String(o.estimatedAnnualSavings ?? '').match(/[\d.]+/);
                const v = m ? parseFloat(m[0]) : 0;
                const s = String(o.estimatedAnnualSavings ?? '').toUpperCase();
                return s.includes('M') ? v * 1000000 : s.includes('K') ? v * 1000 : v;
              }), 1);
              return (
                <Card style={{ border: `1px solid ${isOpen ? 'rgba(172,0,239,0.35)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 300ms' }}>
                  <button onClick={() => toggleSection('opportunities')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Value Opportunities</SectionLabel>
                      <span style={{ fontSize: 'var(--fs-micro)', color: '#444444' }}>{opps.length} initiatives · sorted by payback</span>
                    </div>
                    <span style={{ color: '#9764ff', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
                  </button>

                  {/* Preview */}
                  {!isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {opps.map((opp, i) => {
                        const raw = String(opp.estimatedAnnualSavings ?? '');
                        const m = raw.match(/[\d.]+/);
                        const v = m ? parseFloat(m[0]) : 0;
                        const s = raw.toUpperCase();
                        const absVal = s.includes('M') ? v * 1000000 : s.includes('K') ? v * 1000 : v;
                        const barPct = Math.round((absVal / maxSavings) * 100);
                        const savingsHeadline = raw.match(/^[~$€£]?[\d.,]+[KMBkmb]?(?:\/\w+)?/)?.[0] ?? raw.split(' ')[0];
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: '#0a0a0f', border: '1px solid #9764ff18', borderRadius: '4px' }}>
                            <span className="data-mono" style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#9764ff', width: '1rem', flexShrink: 0, opacity: 0.7 }}>{i + 1}</span>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.initiative}</span>
                            <div style={{ width: '4rem', height: '3px', background: '#1a1a2e', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ height: '100%', width: `${barPct}%`, background: 'linear-gradient(90deg, #9764ff66, #9764ff)', borderRadius: '2px' }} />
                            </div>
                            <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#fff', flexShrink: 0, width: '5.5rem', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden' }}>{savingsHeadline}</span>
                            {opp.paybackMonths && (
                              <span style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: '#555', background: '#161622', border: '1px solid #2a2a3e', borderRadius: '999px', padding: '0.15rem 0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                {opp.paybackMonths}mo
                              </span>
                            )}
                            <span className="data-mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#9764ff', flexShrink: 0, whiteSpace: 'nowrap' }}>{opp.irrImpact}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full detail */}
                  {isOpen && (() => {
                    const scatterData = opps.map(o => {
                      const raw = String(o.estimatedAnnualSavings ?? '');
                      const m = raw.match(/[\d.]+/);
                      const v = m ? parseFloat(m[0]) : 0;
                      const up = raw.toUpperCase();
                      const yM = up.includes('M') ? v : up.includes('K') ? v / 1000 : v / 1000000;
                      const irrM = String(o.irrImpact ?? '').match(/[\d.]+/);
                      return { x: o.paybackMonths ?? 0, y: parseFloat(yM.toFixed(2)), z: irrM ? parseFloat(irrM[0]) * 20 : 20, name: o.initiative };
                    });
                    const ScatterTip = ({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: '#1a1a2e', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: 'var(--fs-label)' }}>
                          <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem', maxWidth: '12rem' }}>{d?.name}</div>
                          <div style={{ color: '#787878' }}>Payback: <span style={{ color: '#9764ff' }}>{d?.x}mo</span></div>
                          <div style={{ color: '#787878' }}>Savings: <span style={{ color: '#fff' }}>${d?.y}M/yr</span></div>
                        </div>
                      );
                    };
                    return (
                      <div className="section-body-enter">
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>Payback (months) vs Annual Savings — bubble size = IRR impact</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                              <XAxis dataKey="x" type="number" name="Payback" unit="mo" tick={{ fill: '#444444', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis dataKey="y" type="number" name="Savings" unit="M" tick={{ fill: '#444444', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <ZAxis dataKey="z" range={[40, 200]} />
                              <Tooltip content={<ScatterTip />} cursor={{ stroke: '#1a1a2e' }} />
                              <Scatter data={scatterData} fill="#9764ff" fillOpacity={0.8} />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.75rem' }}>
                          {opps.map((opp, i) => {
                        const raw = String(opp.estimatedAnnualSavings ?? '');
                        const heroMatch = raw.match(/^([\$€£¥]?[\d.,]+\s*(?:[MKBmkb]|million|billion|thousand)?\s*(?:\/year|\/yr|per year)?)/i);
                        const heroNum = heroMatch ? heroMatch[1].trim() : raw.split(/[–—\-,(]/)[0].trim();
                        const detail = heroNum && raw.length > heroNum.length + 2 ? raw.slice(heroNum.length).replace(/^[\s–—\-]+/, '') : null;
                        return (
                          <div key={i} style={{ background: '#0a0a0f', border: '1px solid #9764ff20', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                              <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#9764ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>#{i + 1} · {opp.paybackMonths ? `${opp.paybackMonths}mo payback` : 'quickest payback'}</div>
                              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>{opp.initiative}</div>
                            </div>
                            <div style={{ borderTop: '1px solid #1a1a2e', paddingTop: '0.625rem' }}>
                              <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Annual savings</div>
                              <div className="data-mono" style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>{heroNum}</div>
                              {detail && (
                                <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', marginTop: '0.25rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{detail}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.25rem' }}>
                              <div>
                                <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>IRR impact</div>
                                <div className="data-mono" style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: '#9764ff' }}>{opp.irrImpact}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Payback</div>
                                <div className="data-mono" style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: '#787878' }}>{opp.paybackMonths}mo</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              );
            })()}
            </div>

            <div className="fade-up fade-up-5">
            {/* Section: Recommendation */}
            <Card style={{ background: openSections.recommendation ? '#0a0a0f' : '#0d0d0d', border: `1px solid ${openSections.recommendation ? '#9764ff33' : '#1a1a2e'}`, transition: 'background 300ms, border-color 300ms' }}>
              <button onClick={() => toggleSection('recommendation')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.875rem' }}>
                <SectionLabel style={{ marginBottom: 0 }}>Recommendation</SectionLabel>
                <span style={{ color: '#9764ff', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: openSections.recommendation ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
              </button>
              {/* Preview */}
              {!openSections.recommendation && (() => {
                const sentences = (data.recommendation ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20).slice(0, 2);
                return (
                  <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sentences.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#9764ff', fontWeight: 700, flexShrink: 0, fontSize: 'var(--fs-label)', marginTop: '0.2rem' }}>{i + 1}</span>
                        <span style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.6 }}>{s.trim()}</span>
                      </div>
                    ))}
                    <span style={{ fontSize: 'var(--fs-micro)', color: '#444444', marginTop: '0.125rem' }}>Expand to read full recommendation</span>
                  </div>
                );
              })()}
              {/* Full */}
              {openSections.recommendation && (() => {
                const sentences = (data.recommendation ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
                return (
                  <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {sentences.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', paddingLeft: '0.25rem' }}>
                        <span style={{ color: '#9764ff', fontWeight: 700, flexShrink: 0, fontSize: 'var(--fs-label)', marginTop: '0.2rem', width: '1rem', textAlign: 'right' }}>{i + 1}</span>
                        <span style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.7 }}>{s.trim()}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>

            {/* Section: 100-Day Quick Wins */}
            <Card>
              <button onClick={() => toggleSection('quickwins')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <SectionLabel style={{ marginBottom: 0 }}>100-Day Quick Wins</SectionLabel>
                  <span style={{ fontSize: 'var(--fs-micro)', color: '#444444' }}>{data.quickWins?.length ?? 0} actions · Day 1 → Day 100</span>
                </div>
                <span style={{ color: '#9764ff', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: openSections.quickwins ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
              </button>
              {/* Preview */}
              {!openSections.quickwins && (
                <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {data.quickWins?.map((win, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0D0D', borderRadius: '2px' }}>
                      <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#9764ff', flexShrink: 0, width: '1rem' }}>{i + 1}</span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{win}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 'var(--fs-micro)', color: '#444444', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>Expand to read full action plan</div>
                </div>
              )}
              {/* Full */}
              {openSections.quickwins && (
                <div className="section-body-enter" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  {data.quickWins?.map((win, i) => (
                    <div key={i} style={{ background: '#0D0D0D', borderLeft: '3px solid #9764ff44', borderRadius: '0 0.25rem 0.25rem 0', padding: '0.875rem' }}>
                      <div className="data-mono" style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#9764ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>Action {i + 1}</div>
                      <span style={{ fontSize: 'var(--fs-sm)', color: '#fff', lineHeight: 1.6 }}>{win}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            </div>

            {/* Data Attribution */}
            <div style={{ display: 'flex', gap: '0', border: '1px solid #1a1a2e', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {[
                { source: 'SASB SICS',          detail: 'Industry classification & materiality weights', status: 'verified',   color: '#00C896' },
                { source: 'Company Disclosure',  detail: 'ESG report, sustainability data, proxy statements', status: 'partial',    color: '#9764ff' },
                { source: 'CDP Climate DB',      detail: 'GHG emissions, energy, water — estimated where missing', status: 'estimated',  color: '#9764ff' },
                { source: 'MSCI ESG Research',   detail: 'Sector benchmarks, peer percentiles', status: 'reference',  color: '#555' },
                { source: 'Analyst Estimates',   detail: 'Financial exposure, IRR impact — CFO sign-off required', status: 'unverified', color: '#FF4444' },
              ].map(({ source, detail, status, color }, i, arr) => (
                <div key={source} style={{ flex: 1, padding: '0.625rem 0.875rem', borderRight: i < arr.length - 1 ? '1px solid #1a1a2e' : 'none', background: '#0a0a0f' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.3rem' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{source}</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-label)', color: '#555', lineHeight: 1.4, marginBottom: '0.3rem' }}>{detail}</div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{status}</div>
                </div>
              ))}
            </div>

          </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #1a1a2e', borderRadius: '0.5rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h2)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Ready to screen {company.shortName}
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: '#555555', marginBottom: '2rem' }}>
            Click <strong style={{ color: '#fff', fontWeight: 500 }}>Run ESG Screen</strong> to run the full materiality analysis
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Material KPIs', desc: 'SASB-filtered data scoring' },
              { label: 'Risk Flags',    desc: 'Severity + financial exposure' },
              { label: 'Value Opps',   desc: 'IRR impact + payback' },
              { label: 'Quick Wins',   desc: '100-day action plan' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#9764ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#333333' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
