import { useState, useEffect, useRef } from 'react';
import AgentStatus from '../components/AgentStatus.jsx';
import ReasoningDrawer from '../components/ReasoningDrawer.jsx';
import RaiPanel from '../components/RaiPanel.jsx';
import { COMPANY_MAP } from '../data/companies.js';
import { richText } from '../utils/richText.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
  'Loading company ESG profile and regulatory context...',
  'Assessing 14 Principal Adverse Impact (PAI) indicators...',
  'Evaluating Article 6 / 8 / 9 qualifying criteria...',
  'Checking DNSH (Do No Significant Harm) compliance...',
  'Modelling upgrade pathway to next classification...',
  'Generating LP-ready disclosure narrative...'
];

const ARTICLE_CONFIG = {
  'Article 6': { color: '#FF4444', bg: '#FF444412', border: '#FF444440', label: 'No ESG Claim',         short: '6' },
  'Article 8': { color: '#01c9cc', bg: '#01c9cc12', border: '#01c9cc40', label: 'Promotes E/S Chars',   short: '8' },
  'Article 9': { color: '#00C896', bg: '#00C89612', border: '#00C89640', label: 'Sustainable Objective', short: '9' },
};

const SFDR2_CONFIG = {
  'Sustainable':      { color: '#00C896', bg: '#00C89612', border: '#00C89640', icon: '●●●', desc: 'Full sustainable objective'   },
  'Transition':       { color: '#01c9cc', bg: '#01c9cc12', border: '#01c9cc40', icon: '●●○', desc: '1.5°C transition pathway'     },
  'ESG Basics':       { color: '#888888', bg: '#88888812', border: '#88888840', icon: '●○○', desc: 'Baseline exclusions floor'    },
  'Non-categorised':  { color: '#FF4444', bg: '#FF444412', border: '#FF444440', icon: '○○○', desc: 'No ESG claims permitted'      },
};

const UNGC_CONFIG = {
  pass:    { color: '#00C896', label: 'Pass'    },
  at_risk: { color: '#888888', label: 'At Risk' },
  fail:    { color: '#FF4444', label: 'Fail'    },
};

const MKTG_CONFIG = {
  safe:       { color: '#00C896', label: 'Safe',       bg: '#00C89612', border: '#00C89640' },
  restricted: { color: '#888888', label: 'Restricted', bg: '#88888812', border: '#88888840' },
  at_risk:    { color: '#FF4444', label: 'At Risk',    bg: '#FF444412', border: '#FF444440' },
  banned:     { color: '#FF4444', label: 'Banned',     bg: '#FF444412', border: '#FF444440' },
};

const STATUS_CONFIG = {
  met:      { color: '#00C896', label: 'Met',     icon: '✓' },
  partial:  { color: '#888888', label: 'Partial', icon: '◐' },
  not_met:  { color: '#FF4444', label: 'Not Met', icon: '✗' },
};

const DISC_CONFIG = {
  compliant: { color: '#00C896', label: 'Compliant' },
  partial:   { color: '#888888', label: 'Partial'   },
  missing:   { color: '#FF4444', label: 'Missing'   },
};

const CONF_CONFIG = {
  high:   { color: '#00C896', label: 'High confidence'   },
  medium: { color: '#888888', label: 'Medium confidence' },
  low:    { color: '#FF4444', label: 'Low confidence'    },
};

function Card({ children, style = {}, className = '' }) {
  return (
    <div className={`card-hover ${className}`} style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '1.25rem', ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, color, style = {} }) {
  const c = color ?? '#01c9cc';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', ...style }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: `linear-gradient(180deg, ${c}, #9764ff)`, flexShrink: 0 }} />
      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: c }}>
        {children}
      </div>
    </div>
  );
}

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

export default function Screen4Sfdr({ companyId, companyOverride, screen1Result, onResult, runTrigger = 0, cachedResult }) {
  const [agentStatus, setAgentStatus] = useState(() => cachedResult ? 'complete' : 'idle');
  const [data,        setData]        = useState(() => cachedResult ?? null);
  const [error,       setError]       = useState(null);
  const [meta,        setMeta]        = useState(null);

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
      const res = await fetch(`${API_BASE}/api/sfdr`, {
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

  const articleCfg = data ? (ARTICLE_CONFIG[data.recommendedArticle] ?? ARTICLE_CONFIG['Article 8']) : null;
  const confCfg    = data ? (CONF_CONFIG[data.confidence] ?? CONF_CONFIG['medium']) : null;

  const metCount     = data?.qualifyingFactors?.filter(f => f.status === 'met').length ?? 0;
  const totalCount   = data?.qualifyingFactors?.length ?? 0;
  const paiAvailable = data?.principalAdverseImpacts?.filter(p => p.available).length ?? 0;
  const paiTotal     = data?.principalAdverseImpacts?.length ?? 0;
  const discMissing  = data?.disclosureRequirements?.filter(r => r.status === 'missing').length ?? 0;

  return (
    <div>
      {/* Banner */}
      <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#000000', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #FF99C9, #926EF7 50%, #6EEEF7)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.6))' }} />
        {data && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(1,201,204,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#01c9cc', marginBottom: '0.375rem' }}>
              SFDR Article Classification · Regulation (EU) 2019/2088
            </div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>
              {company.geography} · Sustainable Finance Disclosure Regulation · Article 6 / 8 / 9
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
                ESG Screen context loaded
              </div>
            )}
            <button className="btn-acc" onClick={run} disabled={agentStatus === 'running'}>
              {agentStatus === 'running' ? 'Classifying...' : agentStatus === 'complete' ? 'Re-classify' : 'Run SFDR Classifier'}
            </button>
          </div>
        </div>
      </div>

      <AgentStatus steps={STEPS} status={agentStatus} stepFindings={data ? [
        `Reviewing ${company.name} — ${company.geography}`,
        `${paiAvailable} of ${paiTotal} PAI indicators available`,
        `${metCount} of ${totalCount} qualifying criteria met`,
        `DNSH: ${data.qualifyingFactors?.find(f => f.factor.includes('DNSH'))?.status?.replace('_', ' ') ?? 'assessed'}`,
        `Upgrade to ${data.upgradePath?.nextArticle}: ${data.upgradePath?.estimatedTimeToUpgrade}`,
        `${discMissing} disclosure gaps require action before LP close`,
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

          {/* Row 1: Article verdict + confidence + score stats */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>

            {/* Article hero */}
            <Card style={{ background: articleCfg.bg, border: `1px solid ${articleCfg.border}`, gridColumn: 'span 1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <SectionLabel style={{ color: articleCfg.color }}>SFDR Classification</SectionLabel>
              <div>
                <div className="num-in stat-hero" style={{ fontSize: '5rem', color: articleCfg.color, lineHeight: 1, letterSpacing: '-0.04em' }}>
                  Art. {articleCfg.short}
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: articleCfg.color, marginTop: '0.375rem' }}>
                  {articleCfg.label}
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: `${confCfg.color}15`, border: `1px solid ${confCfg.color}40`, borderRadius: '999px', padding: '0.2rem 0.625rem', marginTop: '0.75rem' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: confCfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--fs-micro)', color: confCfg.color, fontWeight: 500 }}>{confCfg.label}</span>
              </div>
            </Card>

            {/* Quick stats */}
            {[
              { label: 'Criteria Met',        val: `${metCount}/${totalCount}`,     sub: 'qualifying factors',       color: metCount === totalCount ? '#00C896' : metCount >= totalCount / 2 ? '#888888' : '#FF4444' },
              { label: 'PAI Data Available',  val: `${paiAvailable}/${paiTotal}`,   sub: 'adverse impact indicators', color: paiAvailable >= paiTotal * 0.7 ? '#00C896' : '#888888' },
              { label: 'Disclosure Gaps',     val: discMissing,                     sub: 'items needed before close', color: discMissing === 0 ? '#00C896' : discMissing <= 2 ? '#888888' : '#FF4444' },
            ].map(({ label, val, sub, color }) => (
              <Card key={label}>
                <SectionLabel>{label}</SectionLabel>
                <div className="num-in data-mono" style={{ fontSize: '2.75rem', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.375rem' }}>{val}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#444' }}>{sub}</div>
              </Card>
            ))}
          </div>

          {/* Row 2: Qualifying factors + PAI indicators */}
          <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Qualifying factors */}
            <Card>
              <SectionLabel>Article Qualifying Criteria</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.qualifyingFactors?.map((f, i) => {
                  const s = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.partial;
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5rem 1fr', gap: '0.75rem', alignItems: 'start', padding: '0.625rem 0.75rem', background: `${s.color}08`, border: `1px solid ${s.color}25`, borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: s.color, fontWeight: 700, textAlign: 'center', paddingTop: '0.1rem' }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }} dangerouslySetInnerHTML={{ __html: richText(f.factor) }} />
                        <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: richText(f.assessment) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* PAI indicators */}
            <Card>
              <SectionLabel>Principal Adverse Impacts</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {data.principalAdverseImpacts?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0D0D0D', borderRadius: '2px', borderLeft: `2px solid ${p.available ? '#00C896' : '#FF4444'}` }}>
                    <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: p.available ? '#00C896' : '#FF4444', flexShrink: 0, marginTop: '0.15rem', width: '3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {p.available ? 'Avail.' : 'Missing'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: '#fff', marginBottom: '0.15rem' }}>{p.indicator}</div>
                      {p.available && p.value && (
                        <div className="data-mono" style={{ fontSize: 'var(--fs-micro)', color: '#00C896', marginBottom: '0.15rem' }}>{p.value}</div>
                      )}
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.4 }}>{p.gap}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 3: Upgrade path + Disclosure requirements */}
          <div className="fade-up fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Upgrade path */}
            <Card style={{ borderLeft: '3px solid #01c9cc' }}>
              <SectionLabel>Upgrade Pathway</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: ARTICLE_CONFIG[data.upgradePath?.currentArticle]?.color ?? '#888888', background: `${ARTICLE_CONFIG[data.upgradePath?.currentArticle]?.color ?? '#888888'}15`, border: `1px solid ${ARTICLE_CONFIG[data.upgradePath?.currentArticle]?.color ?? '#888888'}40`, borderRadius: '999px', padding: '0.25rem 0.75rem' }}>
                  {data.upgradePath?.currentArticle}
                </div>
                <span style={{ color: '#444', fontSize: '1rem' }}>→</span>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: ARTICLE_CONFIG[data.upgradePath?.nextArticle]?.color ?? '#00C896', background: `${ARTICLE_CONFIG[data.upgradePath?.nextArticle]?.color ?? '#00C896'}15`, border: `1px solid ${ARTICLE_CONFIG[data.upgradePath?.nextArticle]?.color ?? '#00C896'}40`, borderRadius: '999px', padding: '0.25rem 0.75rem' }}>
                  {data.upgradePath?.nextArticle}
                </div>
                <span style={{ fontSize: 'var(--fs-micro)', color: '#555', marginLeft: 'auto' }}>{data.upgradePath?.estimatedTimeToUpgrade}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {data.upgradePath?.requiredActions?.map((action, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.5 }}>
                    <span style={{ color: '#01c9cc', fontWeight: 700, flexShrink: 0, fontSize: 'var(--fs-label)', marginTop: '0.15rem' }}>{i + 1}</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Disclosure requirements */}
            <Card>
              <SectionLabel>Disclosure Requirements</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.disclosureRequirements?.map((r, i) => {
                  const d = DISC_CONFIG[r.status] ?? DISC_CONFIG.missing;
                  return (
                    <div key={i} style={{ background: '#0D0D0D', border: `1px solid ${d.color}25`, borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', flex: 1, marginRight: '0.75rem' }}>{r.requirement}</div>
                        <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: d.color, background: `${d.color}15`, border: `1px solid ${d.color}30`, borderRadius: '2px', padding: '0.15rem 0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{d.label}</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.4 }}>{r.action}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Row 4: LP narrative + Regulatory risk */}
          <div className="fade-up fade-up-4" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Card style={{ background: '#0a0a0f', border: `1px solid ${articleCfg.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <SectionLabel style={{ color: articleCfg.color, marginBottom: 0 }}>LP-Ready Narrative</SectionLabel>
                <CopyButton text={data.lpNarrative ?? ''} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(data.lpNarrative ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: articleCfg.color, flexShrink: 0, marginTop: '0.55rem' }} />
                    <span style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: richText(s.trim()) }} />
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ background: '#0a0a0f', border: '1px solid #FF444433' }}>
              <SectionLabel style={{ color: '#FF4444' }}>Regulatory Risk</SectionLabel>
              <div style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: richText(data.regulatoryRisk) }}
              />
            </Card>
          </div>

          {/* Row 5: SFDR 2.0 Dual-Readiness */}
          {data.sfdr2 && (() => {
            const s2     = data.sfdr2;
            const s2cfg  = SFDR2_CONFIG[s2.category] ?? SFDR2_CONFIG['ESG Basics'];
            const ungcCfg = UNGC_CONFIG[s2.exclusionCompliance?.ungcOecd] ?? UNGC_CONFIG.at_risk;
            const excl   = s2.exclusionCompliance ?? {};
            const thr    = s2.threshold70pct ?? {};
            const tax    = s2.taxonomyShortcut ?? {};
            return (
              <div className="fade-up fade-up-5" style={{ border: '1px solid #01c9cc30', borderRadius: '0.5rem', overflow: 'hidden' }}>
                {/* Header bar */}
                <div style={{ background: '#0a0a0f', borderBottom: '1px solid #01c9cc30', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#01c9cc', flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#01c9cc' }}>
                    SFDR 2.0 Dual-Readiness
                  </span>
                  <span style={{ fontSize: 'var(--fs-micro)', color: '#444', marginLeft: '0.25rem' }}>EC Proposal Nov 2025 · Expected 2028–2029</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#01c9cc10', border: '1px solid #01c9cc30', borderRadius: '999px', padding: '0.2rem 0.625rem' }}>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#01c9cc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Future-Proof Analysis</span>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', background: '#0a0a0f', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* 1.0 → 2.0 comparison hero */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
                    {/* SFDR 1.0 */}
                    <div style={{ background: articleCfg.bg, border: `1px solid ${articleCfg.border}`, borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.5rem' }}>SFDR 1.0 (Current)</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: articleCfg.color, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: "'Georgia', serif" }}>
                        {data.recommendedArticle}
                      </div>
                      <div style={{ fontSize: 'var(--fs-label)', color: articleCfg.color, marginTop: '0.375rem', opacity: 0.8 }}>{articleCfg.label}</div>
                      <div style={{ fontSize: 'var(--fs-label)', color: '#444', marginTop: '0.25rem' }}>Regulation EU 2019/2088</div>
                    </div>

                    {/* Arrow */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                      <div style={{ fontSize: 'var(--fs-h1)', color: '#01c9cc' }}>→</div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#444', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>No grandfathering</div>
                    </div>

                    {/* SFDR 2.0 */}
                    <div style={{ background: s2cfg.bg, border: `1px solid ${s2cfg.border}`, borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.5rem' }}>SFDR 2.0 (Shadow)</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: s2cfg.color, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: "'Georgia', serif" }}>
                        {s2.category}
                      </div>
                      <div style={{ fontSize: 'var(--fs-label)', color: s2cfg.color, marginTop: '0.375rem', opacity: 0.8 }}>{s2cfg.icon}</div>
                      <div style={{ fontSize: 'var(--fs-label)', color: '#444', marginTop: '0.25rem' }}>EC Proposal Nov 2025</div>
                    </div>
                  </div>

                  {/* Rationale */}
                  <div style={{ background: '#0D0D0D', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.875rem' }}>
                    <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#01c9cc', marginBottom: '0.5rem' }}>Classification Rationale</div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.65 }}>{s2.rationale}</div>
                  </div>

                  {/* Three assessment panels */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>

                    {/* Mandatory Exclusions */}
                    <div style={{ background: '#0D0D0D', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', marginBottom: '0.625rem' }}>Mandatory Exclusions</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {[
                          { label: 'Controversial Weapons', ok: excl.weapons },
                          { label: 'Tobacco Production',    ok: excl.tobacco },
                          { label: 'Coal (≥1% revenue)',    ok: excl.coal },
                        ].map(({ label, ok }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: 'var(--fs-label)', color: ok ? '#00C896' : '#FF4444', fontWeight: 700, width: '0.875rem', textAlign: 'center' }}>{ok ? '✓' : '✗'}</span>
                            <span style={{ fontSize: 'var(--fs-micro)', color: ok ? '#c8c8c4' : '#FF4444' }}>{label}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                          <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: ungcCfg.color, background: `${ungcCfg.color}15`, border: `1px solid ${ungcCfg.color}40`, borderRadius: '2px', padding: '0.1rem 0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ungcCfg.label}</span>
                          <span style={{ fontSize: 'var(--fs-micro)', color: '#787878' }}>UNGC / OECD</span>
                        </div>
                      </div>
                    </div>

                    {/* 70% Threshold */}
                    <div style={{ background: '#0D0D0D', border: `1px solid ${thr.met ? '#00C89630' : '#88888830'}`, borderRadius: '0.5rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', marginBottom: '0.375rem' }}>70% Threshold</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: thr.met ? '#00C896' : '#FF4444', background: thr.met ? '#00C89615' : '#FF444415', border: `1px solid ${thr.met ? '#00C89640' : '#FF444440'}`, borderRadius: '2px', padding: '0.15rem 0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {thr.met ? 'Met' : 'Not Met'}
                        </span>
                        <span style={{ fontSize: 'var(--fs-micro)', color: '#787878' }}>{thr.currentEstimate}</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.5 }}>{thr.gap}</div>
                    </div>

                    {/* Taxonomy Shortcut */}
                    <div style={{ background: '#0D0D0D', border: `1px solid ${tax.applicable ? '#00C89630' : '#1a1a2e'}`, borderRadius: '0.5rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', marginBottom: '0.375rem' }}>Taxonomy Shortcut</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: tax.applicable ? '#00C896' : '#555', background: tax.applicable ? '#00C89615' : '#1a1a2e', border: `1px solid ${tax.applicable ? '#00C89640' : '#1a1a2e'}`, borderRadius: '2px', padding: '0.15rem 0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {tax.applicable ? 'Unlocked' : 'Not Available'}
                        </span>
                        <span style={{ fontSize: 'var(--fs-micro)', color: '#444' }}>≥15% aligned</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.5 }}>{tax.taxonomyAlignment}</div>
                    </div>
                  </div>

                  {/* Key Changes + Gaps + Timeline */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: '#0D0D0D', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#01c9cc', marginBottom: '0.5rem' }}>Key Classification Changes</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {(s2.keyChanges ?? []).map((c, i) => (
                          <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: 'var(--fs-micro)', color: '#c8c8c4', lineHeight: 1.5 }}>
                            <span style={{ color: '#01c9cc', fontWeight: 700, flexShrink: 0, marginTop: '0.05rem' }}>→</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: '#0D0D0D', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888888', marginBottom: '0.5rem' }}>Gaps to Close</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {(s2.gaps ?? []).map((g, i) => (
                          <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: 'var(--fs-micro)', color: '#c8c8c4', lineHeight: 1.5 }}>
                            <span style={{ color: '#888888', fontWeight: 700, flexShrink: 0, marginTop: '0.05rem' }}>!</span>
                            <span>{g}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Marketing & Naming Risk + PAI Obligations */}
                  {(s2.marketingRisk || s2.paiObligations) && (() => {
                    const mktg    = s2.marketingRisk ?? {};
                    const pai     = s2.paiObligations ?? {};
                    const mktgCfg = MKTG_CONFIG[mktg.level] ?? MKTG_CONFIG.restricted;
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                        {/* Marketing & Naming Risk */}
                        <div style={{ background: mktgCfg.bg, border: `1px solid ${mktgCfg.border}`, borderRadius: '0.5rem', padding: '0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Marketing & Naming Rights</div>
                            <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: mktgCfg.color, background: `${mktgCfg.color}20`, border: `1px solid ${mktgCfg.color}50`, borderRadius: '2px', padding: '0.15rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {mktgCfg.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.625rem' }}>
                            {[
                              { label: 'ESG terms in fund name',     ok: mktg.canUseEsgInName },
                              { label: 'Sustainability marketing claims', ok: mktg.canMakeMarketingClaims },
                            ].map(({ label, ok }) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: 'var(--fs-label)', color: ok ? '#00C896' : '#FF4444', fontWeight: 700, width: '0.875rem', textAlign: 'center' }}>{ok ? '✓' : '✗'}</span>
                                <span style={{ fontSize: 'var(--fs-micro)', color: ok ? '#c8c8c4' : '#FF4444' }}>{label}</span>
                              </div>
                            ))}
                          </div>
                          {mktg.nameRisk && (
                            <div style={{ background: '#00000030', borderRadius: '2px', padding: '0.5rem 0.625rem', fontSize: 'var(--fs-micro)', color: '#c8c8c4', lineHeight: 1.5, marginBottom: '0.375rem' }}>
                              <span style={{ fontWeight: 700, color: mktgCfg.color }}>Name risk: </span>{mktg.nameRisk}
                            </div>
                          )}
                          {(mktg.level === 'at_risk' || mktg.level === 'banned') && (() => {
                            const countryCount = (company.geography ?? '').split(/\s*\+\s*|,/).filter(Boolean).length || 1;
                            const low  = 500_000 + (countryCount - 1) * 150_000;
                            const high = 500_000 + (countryCount - 1) * 350_000 + 500_000;
                            const fmt  = n => n >= 1_000_000 ? `€${(n/1_000_000).toFixed(1)}M` : `€${Math.round(n/1000)}K`;
                            return (
                              <div style={{ background: `${mktgCfg.color}10`, border: `1px solid ${mktgCfg.color}30`, borderRadius: '2px', padding: '0.5rem 0.625rem', marginBottom: '0.375rem' }}>
                                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: mktgCfg.color, marginBottom: '0.2rem' }}>Estimated Rebranding Cost (if Non-categorised)</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                  <span className="data-mono" style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: mktgCfg.color }}>{fmt(low)}–{fmt(high)}</span>
                                  <span style={{ fontSize: 'var(--fs-micro)', color: '#555' }}>across {countryCount} operating geograph{countryCount === 1 ? 'y' : 'ies'}</span>
                                </div>
                                <div style={{ fontSize: 'var(--fs-micro)', color: '#444', marginTop: '0.2rem' }}>Legal + marketing + signage + digital assets — forced rebranding if fund name prohibited under SFDR 2.0 (2028)</div>
                              </div>
                            );
                          })()}
                          {mktg.implication && (
                            <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.5, fontStyle: 'italic' }}>{mktg.implication}</div>
                          )}
                        </div>

                        {/* PAI Obligations */}
                        <div style={{ background: '#0D0D0D', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '0.875rem' }}>
                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', marginBottom: '0.625rem' }}>PAI Obligations (2.0)</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.625rem' }}>
                            {[
                              { label: 'Entity-level PAI statement', required: pai.entityLevelRequired, note: 'abolished' },
                              { label: 'Product-level PAI reporting',  required: pai.productLevelRequired, note: 'Transition/Sustainable only' },
                            ].map(({ label, required, note }) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: 'var(--fs-label)', color: required ? '#888888' : '#00C896', fontWeight: 700, width: '0.875rem', textAlign: 'center' }}>{required ? '!' : '✓'}</span>
                                <span style={{ fontSize: 'var(--fs-micro)', color: '#c8c8c4', flex: 1 }}>{label}</span>
                                <span style={{ fontSize: 'var(--fs-micro)', color: required ? '#888888' : '#555', fontStyle: 'italic' }}>{note}</span>
                              </div>
                            ))}
                          </div>
                          {pai.flexibility && (
                            <div style={{ background: '#00000030', borderRadius: '2px', padding: '0.5rem 0.625rem', fontSize: 'var(--fs-micro)', color: '#c8c8c4', lineHeight: 1.5, marginBottom: '0.375rem' }}>
                              <span style={{ fontWeight: 700, color: '#01c9cc' }}>Indicator flexibility: </span>{pai.flexibility}
                            </div>
                          )}
                          {pai.complianceCostImpact && (
                            <div style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.5, fontStyle: 'italic' }}>{pai.complianceCostImpact}</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Migration timeline */}
                  <div style={{ background: '#0a0a0f', border: '1px solid #01c9cc30', borderRadius: '0.5rem', padding: '0.875rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 'var(--fs-sm)', flexShrink: 0, marginTop: '0.05rem' }}>🗓</span>
                    <div>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#01c9cc', marginBottom: '0.3rem' }}>Migration Timeline</div>
                      <div style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.6 }}>{s2.migrationTimeline}</div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #01c9cc28', borderRadius: '0.5rem', padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, #001018 0%, #080808 100%)' }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h2)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Ready to classify {company.shortName}
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: '#555555', marginBottom: '2rem' }}>
            Click <strong style={{ color: '#fff', fontWeight: 500 }}>Run SFDR Classifier</strong> to determine Article 6, 8, or 9 classification
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Article 6 / 8 / 9',   desc: 'SFDR 1.0 classification'         },
              { label: 'SFDR 2.0 Shadow',      desc: 'ESG Basics / Transition / Sustain'},
              { label: '70% Threshold',        desc: 'Binding investment gate check'   },
              { label: 'LP Narrative',         desc: 'Ready-to-send LP disclosure'     },
            ].map(({ label, desc }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#01c9cc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: '#333333' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
