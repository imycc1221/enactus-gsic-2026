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
  high:   { border: '#FF1F5A44', bg: '#FF1F5A0A', accent: '#FF1F5A' },
  medium: { border: '#F04FDB44', bg: '#F04FDB0A', accent: '#F04FDB' },
  low:    { border: '#AC00EF44', bg: '#AC00EF0A', accent: '#AC00EF' }
};

const DATA_STATUS = {
  available: { bg: '#AC00EF12', text: '#FFFFFF', border: '#AC00EF40' },
  partial:   { bg: '#F04FDB12', text: '#F04FDB', border: '#F04FDB40' },
  missing:   { bg: '#FF1F5A12', text: '#FF1F5A', border: '#FF1F5A40' }
};

const FRAMEWORK_COLOR = { csrd: '#AC00EF', sfdr: '#F04FDB', tcfd: '#FFFFFF', edci: '#7B00AC', sasb: '#AC00EF' };

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function scoreColor(s) {
  if (s >= 75) return '#AC00EF';
  if (s >= 50) return '#F04FDB';
  return '#FF1F5A';
}


function SectionLabel({ children, style = {} }) {
  return (
    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.875rem', ...style }}>
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

export default function Screen1Analyze({ companyId, companyOverride, onResult, runTrigger = 0 }) {
  const [agentStatus,   setAgentStatus]   = useState('idle');
  const [data,          setData]          = useState(null);
  const [error,         setError]         = useState(null);
  const [meta,          setMeta]          = useState(null);
  const [streamText,    setStreamText]    = useState('');
  const [isStreaming,   setIsStreaming]   = useState(false);
  const [openSections,  setOpenSections]  = useState(Object.fromEntries(SECTIONS.map(k => [k, false])));

  const prevTrigger = useRef(0);
  useEffect(() => {
    if (runTrigger > prevTrigger.current) {
      prevTrigger.current = runTrigger;
      run();
    }
  }, [runTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(key) { setOpenSections(s => ({ ...s, [key]: !s[key] })); }
  function openAll()           { setOpenSections(Object.fromEntries(SECTIONS.map(k => [k, true]))); }

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
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', marginBottom: '2rem', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(5,5,15,0.97) 45%, rgba(5,5,15,0.7))' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontWeight: 300, fontSize: '2rem', color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', letterSpacing: '-0.01em' }}>
              {company.sasbSector} · {company.geography} · {fmt(company.revenue)} revenue · {company.employees.toLocaleString()} employees
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {data && (
              <button onClick={openAll} style={{ background: 'none', border: 'none', color: '#AC00EF', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', padding: 0 }}>
                + Open all
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.625rem', color: '#333', marginBottom: '1rem' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.cached ? '#F0A500' : '#00C896', flexShrink: 0 }} />
          {meta.cached ? 'Cached result' : 'Live result'} · Generated {new Date(meta.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {meta.cached && (
            <button onClick={run} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.625rem', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: '0.25rem' }}>
              Re-run live →
            </button>
          )}
        </div>
      )}

      {(isStreaming || streamText) && (
        <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '0.25rem', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#AC00EF', flexShrink: 0, boxShadow: isStreaming ? '0 0 8px #AC00EF' : 'none' }} />
            <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Live Claude Output — tool_use: input_json_delta stream
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.5rem', color: '#222', fontFamily: 'ui-monospace, monospace' }}>
              {streamText.length} chars received
            </span>
          </div>
          <pre style={{ fontSize: '0.5625rem', color: '#3a3a3a', lineHeight: 1.55, maxHeight: '140px', overflowY: 'auto', margin: 0, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {streamText}{isStreaming && <span style={{ color: '#AC00EF' }}>▋</span>}
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
        <div style={{ background: '#ff575710', border: '1px solid #ff575740', borderRadius: '0.25rem', padding: '1rem', color: '#ff5757', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {data && (

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Row 1: Score + Radar + SASB */}
            <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>

              <Card className="card-hover">
                <SectionLabel>ESG Materiality Score</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <div className="num-in stat-hero" style={{ fontSize: '6rem', color: scoreColor(data.overallScore), letterSpacing: '-0.04em' }}>
                    {data.overallScore}
                  </div>
                  <div style={{ paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.5625rem', color: '#333333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.25rem' }}>/100</div>
                    <div style={{ fontSize: '0.625rem', color: scoreColor(data.overallScore), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: `${scoreColor(data.overallScore)}15`, border: `1px solid ${scoreColor(data.overallScore)}33`, borderRadius: '2px', padding: '0.15rem 0.375rem' }}>
                      {data.overallScore >= 75 ? 'Strong' : data.overallScore >= 50 ? 'Moderate' : 'Critical'}
                    </div>
                  </div>
                </div>
                {/* Data confidence pill */}
                {confidencePct !== null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    background: '#AC00EF15', border: '1px solid #AC00EF40',
                    borderRadius: '999px', padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem', color: '#c8c8c4', marginBottom: '0.75rem'
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: confidencePct > 70 ? '#00C896' : confidencePct > 50 ? '#F0A500' : '#FF1F5A'
                    }} />
                    Data confidence: {confidencePct}% · Requires analyst review
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {['environmental', 'social', 'governance'].map(p => (
                    <div key={p}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#787878', textTransform: 'capitalize' }}>{p}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: scoreColor(data.pillarScores?.[p] ?? 0) }}>{data.pillarScores?.[p] ?? '—'}</span>
                      </div>
                      <div style={{ height: '2px', background: '#1E1E1E', borderRadius: '1px' }}>
                        <div style={{ height: '100%', width: `${data.pillarScores?.[p] ?? 0}%`, background: scoreColor(data.pillarScores?.[p] ?? 0), borderRadius: '1px', transition: 'width 900ms cubic-bezier(0.25,1,0.5,1)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionLabel>ESG Profile</SectionLabel>
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                    <PolarGrid stroke="#1E1E1E" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#787878', fontSize: 10, fontFamily: 'Graphik, Arial, sans-serif' }} />
                    <Radar dataKey="score" stroke="#AC00EF" fill="#AC00EF" fillOpacity={0.12} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <SectionLabel>SASB Classification</SectionLabel>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#F04FDB' }}>
                    {data.sasbClassification}
                  </div>
                </div>
                <div>
                  <SectionLabel>Data Confidence</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, height: '2px', background: '#1E1E1E', borderRadius: '1px' }}>
                      <div style={{ height: '100%', width: `${confidencePct ?? 0}%`, background: '#AC00EF', borderRadius: '1px', transition: 'width 900ms cubic-bezier(0.25,1,0.5,1)' }} />
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F04FDB', minWidth: '2.5rem', textAlign: 'right' }}>
                      {confidencePct != null ? `${confidencePct}%` : '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <SectionLabel>Framework Compliance</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(data.frameworkGaps ?? {}).map(([fw, d]) => d ? (
                      <div key={fw} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#787878', textTransform: 'uppercase', letterSpacing: '0.05em', width: '2.5rem' }}>{fw}</span>
                        <div style={{ flex: 1, height: '2px', background: '#1E1E1E', borderRadius: '1px' }}>
                          <div style={{ height: '100%', width: `${d.percentage ?? 0}%`, background: FRAMEWORK_COLOR[fw] ?? '#AC00EF', borderRadius: '1px', transition: 'width 900ms cubic-bezier(0.25,1,0.5,1)' }} />
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#787878', width: '2.25rem', textAlign: 'right' }}>{d.percentage}%</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              </Card>
            </div>

            {/* Investment Verdict Card */}
            <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>ESG Verdict</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: data.overallScore >= 65 ? '#00C896' : data.overallScore >= 45 ? '#F0A500' : '#FF1F5A' }}>
                  {data.overallScore >= 65 ? 'PROCEED' : data.overallScore >= 45 ? 'MONITOR' : 'CAUTION'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#444', marginTop: '0.25rem' }}>based on SASB materiality score</div>
              </div>
              <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>AI Confidence</div>
                <div className="num-in" style={{ fontSize: '1.375rem', fontWeight: 700, color: confidencePct != null && confidencePct > 70 ? '#00C896' : confidencePct != null && confidencePct > 50 ? '#F0A500' : '#FF1F5A' }}>
                  {confidencePct != null ? `${confidencePct}%` : '—'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#444', marginTop: '0.25rem' }}>analyst review required below 70%</div>
              </div>
              <div style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Priority Risk</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#FF1F5A', lineHeight: 1.3, marginTop: '0.125rem' }}>
                  {data.riskFlags?.find(r => r.severity === 'high')?.area ?? data.riskFlags?.[0]?.area ?? '—'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#444', marginTop: '0.25rem' }}>
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
                <div className="fade-up fade-up-1" style={{ background: '#111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>
                      Sector Benchmarking
                    </div>
                    <div style={{ fontSize: '0.5625rem', color: '#333', letterSpacing: '0.04em' }}>
                      {bm.peers.toLocaleString()} peers · MSCI ESG Ratings universe · {bm.label}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    {[
                      { label: 'This Company',   val: data.overallScore,   color: scoreColor(data.overallScore), sub: 'SASB-weighted score' },
                      { label: 'Sector Median',  val: bm.median,           color: '#444',                        sub: `${bm.peers.toLocaleString()} companies` },
                      { label: 'Sector P75',     val: bm.p75,              color: '#333',                        sub: 'top-quartile threshold' },
                      { label: 'Percentile Rank',val: `${pct}th`,          color: pct >= 75 ? '#00C896' : pct >= 50 ? '#F0A500' : '#FF1F5A', sub: beatMedian ? 'above sector median' : 'below sector median' },
                    ].map(({ label, val, color, sub }) => (
                      <div key={label}>
                        <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.2rem' }}>{val}</div>
                        <div style={{ fontSize: '0.5rem', color: '#333' }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  {/* Distribution bar */}
                  <div>
                    <div style={{ position: 'relative', height: 8, background: '#1E1E1E', borderRadius: 4, marginBottom: '0.4rem' }}>
                      {/* P25 marker */}
                      <div style={{ position: 'absolute', left: `${bm.p25}%`, top: 0, bottom: 0, width: 1, background: '#2E2E2E' }} />
                      {/* Median marker */}
                      <div style={{ position: 'absolute', left: `${bm.median}%`, top: 0, bottom: 0, width: 1, background: '#444' }} />
                      {/* P75 marker */}
                      <div style={{ position: 'absolute', left: `${bm.p75}%`, top: 0, bottom: 0, width: 1, background: '#2E2E2E' }} />
                      {/* IQR fill */}
                      <div style={{ position: 'absolute', left: `${bm.p25}%`, width: `${bm.p75 - bm.p25}%`, top: 0, bottom: 0, background: '#ffffff08', borderRadius: 2 }} />
                      {/* Company marker */}
                      <div style={{ position: 'absolute', left: `${pos}%`, top: -3, width: 3, height: 14, background: scoreColor(data.overallScore), borderRadius: 2, transform: 'translateX(-50%)', boxShadow: `0 0 6px ${scoreColor(data.overallScore)}88` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.45rem', color: '#222' }}>
                      <span>0</span>
                      <span style={{ position: 'relative', left: `${bm.p25 - 4}%` }}>P25 ({bm.p25})</span>
                      <span style={{ position: 'relative', left: `${bm.median - 47}%` }}>Median ({bm.median})</span>
                      <span style={{ position: 'relative', right: `${100 - bm.p75 - 2}%` }}>P75 ({bm.p75})</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Value proposition callout */}
            <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0', border: '1px solid #AC00EF22', borderRadius: '0.25rem', overflow: 'hidden' }}>
              {[
                { stat: '2,240 hrs', label: 'analyst hours replaced per year', sub: '280 hrs × 8 frameworks (Verdantix 2024)' },
                { stat: '~$280K',    label: 'in ESG advisory fees per company', sub: 'vs $35K/framework from Big-4 providers' },
                { stat: '50×',       label: 'cheaper than manual due diligence', sub: 'at $15K–25K/yr SaaS vs consultant model' },
                { stat: '< 90 sec',  label: 'full ESG screen end-to-end', sub: 'vs 6–8 weeks manual analyst workflow' },
              ].map(({ stat, label, sub }, i) => (
                <div key={i} style={{ padding: '0.875rem 1.125rem', borderRight: i < 3 ? '1px solid #AC00EF22' : 'none', background: '#0D0018' }}>
                  <div className="data-mono" style={{ fontSize: '1.375rem', fontWeight: 700, color: '#AC00EF', lineHeight: 1, marginBottom: '0.3rem' }}>{stat}</div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#fff', marginBottom: '0.2rem', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: '0.5625rem', color: '#444', lineHeight: 1.4 }}>{sub}</div>
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
                <Card>
                  <button onClick={() => toggleSection('kpis')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Material KPIs — SASB Filtered</SectionLabel>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[['available','#FFFFFF'],['partial','#F04FDB'],['missing','#FF1F5A']].map(([k,c]) => counts[k] > 0 && (
                          <span key={k} style={{ fontSize: '0.625rem', fontWeight: 700, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{counts[k]} {k}</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ color: '#AC00EF', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
                  </button>

                  {/* Preview — visible when collapsed */}
                  {!isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {kpis.map((kpi, i) => {
                        const s = DATA_STATUS[kpi.dataStatus] ?? DATA_STATUS.missing;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0D0D', borderRadius: '2px' }}>
                            <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: s.text, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.kpi}</span>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: s.text, background: s.bg, border: `1px solid ${s.border}`, borderRadius: '2px', padding: '0.1rem 0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{kpi.dataStatus}</span>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: '0.6875rem', color: '#444444', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>Expand to see EBITDA impact per KPI</div>
                    </div>
                  )}

                  {/* Full detail — visible when expanded */}
                  {isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {grouped.map(({ status, label, items }) => {
                        const s = DATA_STATUS[status];
                        return (
                          <div key={status}>
                            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: s.text, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `1px solid ${s.border}`, paddingBottom: '0.375rem', marginBottom: '0.625rem' }}>{label} — {items.length} KPI{items.length > 1 ? 's' : ''}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                              {items.map((kpi, i) => (
                                <div key={i} style={{ borderLeft: `3px solid ${s.text}`, background: '#0D0D0D', borderRadius: '0 0.25rem 0.25rem 0', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{kpi.kpi}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>EBITDA</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#fff', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{kpi.ebitdaLink}</span>
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
                <Card>
                  <button onClick={() => toggleSection('risks')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Risk Flags</SectionLabel>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[['high','#FF1F5A'],['medium','#F04FDB'],['low','#AC00EF']].map(([k,c]) => counts[k] > 0 && (
                          <span key={k} style={{ fontSize: '0.625rem', fontWeight: 700, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{counts[k]} {k}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      {flags.length > 0 && (() => {
                        const tot = flags.length;
                        const hDeg = (counts.high   / tot) * 360;
                        const mDeg = (counts.medium / tot) * 360;
                        const grad = `conic-gradient(#FF1F5A 0deg ${hDeg}deg, #F04FDB ${hDeg}deg ${hDeg + mDeg}deg, #AC00EF ${hDeg + mDeg}deg 360deg)`;
                        return (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: grad, flexShrink: 0, position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', background: '#111111' }} />
                          </div>
                        );
                      })()}
                      {highCount > 0 && (
                        <div className="data-mono" style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#FF1F5A' }}>
                          {highCount} HIGH
                        </div>
                      )}
                      <span style={{ color: '#AC00EF', fontSize: '1rem', lineHeight: 1, display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
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
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.08em', width: '3.5rem', flexShrink: 0 }}>{flag.severity}</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flag.area}</span>
                            <span style={{ fontSize: '0.6875rem', color: s.accent, fontWeight: 500, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '14rem' }}>{flag.financialExposure}</span>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: '0.6875rem', color: '#444444', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>Expand to see full risk detail and remediation context</div>
                    </div>
                  )}

                  {/* Full detail */}
                  {isOpen && (
                    <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {grouped.map(({ sev, items }) => {
                        const s = SEVERITY[sev];
                        return (
                          <div key={sev}>
                            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `1px solid ${s.border}`, paddingBottom: '0.375rem', marginBottom: '0.625rem' }}>{sev} severity — {items.length} flag{items.length > 1 ? 's' : ''}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {items.map((flag, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '3.5rem 1fr', gap: '0 1rem', alignItems: 'start', border: `1px solid ${s.border}`, background: s.bg, borderRadius: '0.25rem', padding: '0.75rem 1rem' }}>
                                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: s.accent, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', background: `${s.accent}15`, border: `1px solid ${s.accent}30`, borderRadius: '2px', padding: '0.2rem 0', marginTop: '0.15rem' }}>{sev}</span>
                                  <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: '0.375rem' }}>{flag.area}</div>
                                    <div className="data-mono" style={{ fontSize: '0.75rem', color: s.accent, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{flag.financialExposure}</div>
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
                <Card>
                  <button onClick={() => toggleSection('opportunities')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Value Opportunities</SectionLabel>
                      <span style={{ fontSize: '0.6875rem', color: '#444444' }}>{opps.length} initiatives · sorted by payback</span>
                    </div>
                    <span style={{ color: '#AC00EF', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
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
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0018', border: '1px solid #AC00EF15', borderRadius: '2px' }}>
                            <span className="data-mono" style={{ fontSize: '0.625rem', fontWeight: 700, color: '#AC00EF', width: '1rem', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.initiative}</span>
                            <div style={{ width: '4rem', height: '2px', background: '#1E1E1E', borderRadius: '1px', flexShrink: 0 }}>
                              <div style={{ height: '100%', width: `${barPct}%`, background: '#AC00EF', borderRadius: '1px' }} />
                            </div>
                            <span className="data-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', flexShrink: 0, maxWidth: '6rem', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.estimatedAnnualSavings}</span>
                            <span className="data-mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F04FDB', flexShrink: 0, width: '3.5rem', textAlign: 'right' }}>{opp.irrImpact}</span>
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
                        <div style={{ background: '#1E1E1E', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '0.625rem 0.875rem', fontSize: '0.75rem' }}>
                          <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem', maxWidth: '12rem' }}>{d?.name}</div>
                          <div style={{ color: '#787878' }}>Payback: <span style={{ color: '#F04FDB' }}>{d?.x}mo</span></div>
                          <div style={{ color: '#787878' }}>Savings: <span style={{ color: '#fff' }}>${d?.y}M/yr</span></div>
                        </div>
                      );
                    };
                    return (
                      <div className="section-body-enter">
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>Payback (months) vs Annual Savings — bubble size = IRR impact</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                              <XAxis dataKey="x" type="number" name="Payback" unit="mo" tick={{ fill: '#444444', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis dataKey="y" type="number" name="Savings" unit="M" tick={{ fill: '#444444', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <ZAxis dataKey="z" range={[40, 200]} />
                              <Tooltip content={<ScatterTip />} cursor={{ stroke: '#2E2E2E' }} />
                              <Scatter data={scatterData} fill="#AC00EF" fillOpacity={0.8} />
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
                          <div key={i} style={{ background: '#0D0018', border: '1px solid #AC00EF20', borderRadius: '0.25rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                              <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>#{i + 1} · {opp.paybackMonths ? `${opp.paybackMonths}mo payback` : 'quickest payback'}</div>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>{opp.initiative}</div>
                            </div>
                            <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '0.625rem' }}>
                              <div style={{ fontSize: '0.5625rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Annual savings</div>
                              <div className="data-mono" style={{ fontSize: '1.375rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>{heroNum}</div>
                              {detail && (
                                <div style={{ fontSize: '0.6875rem', color: '#787878', marginTop: '0.25rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{detail}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.25rem' }}>
                              <div>
                                <div style={{ fontSize: '0.5625rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>IRR impact</div>
                                <div className="data-mono" style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#F04FDB' }}>{opp.irrImpact}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.5625rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Payback</div>
                                <div className="data-mono" style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#787878' }}>{opp.paybackMonths}mo</div>
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
            <Card style={{ background: openSections.recommendation ? '#0D0018' : '#111111', border: `1px solid ${openSections.recommendation ? '#AC00EF33' : '#2E2E2E'}`, transition: 'background 300ms, border-color 300ms' }}>
              <button onClick={() => toggleSection('recommendation')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.875rem' }}>
                <SectionLabel style={{ marginBottom: 0 }}>Recommendation</SectionLabel>
                <span style={{ color: '#AC00EF', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: openSections.recommendation ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
              </button>
              {/* Preview */}
              {!openSections.recommendation && (() => {
                const sentences = (data.recommendation ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20).slice(0, 2);
                return (
                  <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sentences.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#AC00EF', fontWeight: 700, flexShrink: 0, fontSize: '0.75rem', marginTop: '0.2rem' }}>{i + 1}</span>
                        <span style={{ fontSize: '0.875rem', color: '#c8c8c4', lineHeight: 1.6 }}>{s.trim()}</span>
                      </div>
                    ))}
                    <span style={{ fontSize: '0.6875rem', color: '#444444', marginTop: '0.125rem' }}>Expand to read full recommendation</span>
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
                        <span style={{ color: '#AC00EF', fontWeight: 700, flexShrink: 0, fontSize: '0.75rem', marginTop: '0.2rem', width: '1rem', textAlign: 'right' }}>{i + 1}</span>
                        <span style={{ fontSize: '0.875rem', color: '#c8c8c4', lineHeight: 1.7 }}>{s.trim()}</span>
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
                  <span style={{ fontSize: '0.6875rem', color: '#444444' }}>{data.quickWins?.length ?? 0} actions · Day 1 → Day 100</span>
                </div>
                <span style={{ color: '#AC00EF', fontSize: '1rem', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: openSections.quickwins ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)' }}>+</span>
              </button>
              {/* Preview */}
              {!openSections.quickwins && (
                <div className="section-body-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {data.quickWins?.map((win, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0D0D', borderRadius: '2px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#AC00EF', flexShrink: 0, width: '1rem' }}>{i + 1}</span>
                      <span style={{ fontSize: '0.8125rem', color: '#c8c8c4', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{win}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: '0.6875rem', color: '#444444', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>Expand to read full action plan</div>
                </div>
              )}
              {/* Full */}
              {openSections.quickwins && (
                <div className="section-body-enter" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  {data.quickWins?.map((win, i) => (
                    <div key={i} style={{ background: '#0D0D0D', borderLeft: '3px solid #AC00EF44', borderRadius: '0 0.25rem 0.25rem 0', padding: '0.875rem' }}>
                      <div className="data-mono" style={{ fontSize: '0.625rem', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>Action {i + 1}</div>
                      <span style={{ fontSize: '0.8125rem', color: '#fff', lineHeight: 1.6 }}>{win}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            </div>

            {/* Data Attribution */}
            <div style={{ display: 'flex', gap: '0', border: '1px solid #1E1E1E', borderRadius: '0.25rem', overflow: 'hidden' }}>
              {[
                { source: 'SASB SICS',          detail: 'Industry classification & materiality weights', status: 'verified',  color: '#00C896' },
                { source: 'Company Disclosure',  detail: 'ESG report, sustainability data, proxy statements', status: 'partial', color: '#F0A500' },
                { source: 'CDP Climate DB',      detail: 'GHG emissions, energy, water — estimated where missing', status: 'estimated', color: '#F0A500' },
                { source: 'MSCI ESG Research',   detail: 'Sector benchmarks, peer percentiles', status: 'reference', color: '#555' },
                { source: 'Analyst Estimates',   detail: 'Financial exposure, IRR impact — CFO sign-off required', status: 'unverified', color: '#FF1F5A' },
              ].map(({ source, detail, status, color }, i, arr) => (
                <div key={source} style={{ flex: 1, padding: '0.5rem 0.75rem', borderRight: i < arr.length - 1 ? '1px solid #1E1E1E' : 'none', background: '#0A0A0A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.2rem' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{source}</span>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: '#2E2E2E', lineHeight: 1.4 }}>{detail}</div>
                  <div style={{ fontSize: '0.45rem', color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.2rem' }}>{status}</div>
                </div>
              ))}
            </div>

          </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.25rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontSize: '1.25rem', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Ready to screen {company.shortName}
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#555555', marginBottom: '2rem' }}>
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
