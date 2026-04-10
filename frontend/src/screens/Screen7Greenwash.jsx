/**
 * Screen7Greenwash — Greenwashing Forensics Agent
 * Cross-references ESG claims against available data.
 * Identifies disclosure gaps, regulatory exposure, and remediation actions.
 * Accenture GSIC 2026 — Team Da House
 */

import { useState, useEffect, useRef } from 'react';
import AgentStatus from '../components/AgentStatus.jsx';
import ReasoningDrawer from '../components/ReasoningDrawer.jsx';
import RaiPanel from '../components/RaiPanel.jsx';
import { COMPANY_MAP } from '../data/companies.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
  'Parsing ESG claims from company profile and LP materials...',
  'Cross-referencing claims against disclosed data availability...',
  'Applying scope-shifting and selective disclosure tests...',
  'Checking regulatory framework compliance (CSRD, EUDR, UK FCA)...',
  'Quantifying evidence gaps and regulatory exposure...',
  'Generating remediation and disclosure recommendations...',
];

const RISK_CONFIG = {
  low:      { color: '#00C896', bg: '#00C89612', border: '#00C89640', label: 'LOW RISK',      desc: 'Claims broadly supported by evidence' },
  medium:   { color: '#888888', bg: '#88888812', border: '#88888840', label: 'MEDIUM RISK',   desc: 'Material gaps require remediation' },
  high:     { color: '#FF4444', bg: '#FF444412', border: '#FF444440', label: 'HIGH RISK',     desc: 'Significant claim-evidence mismatch' },
  critical: { color: '#FF4444', bg: '#FF444412', border: '#FF444440', label: 'CRITICAL RISK', desc: 'Active regulatory exposure likely' },
};

const SEV_CONFIG = {
  minor:    { color: '#AC00EF', label: 'MINOR' },
  moderate: { color: '#888888', label: 'MODERATE' },
  material: { color: '#FF4444', label: 'MATERIAL' },
  critical: { color: '#FF4444', label: 'CRITICAL' },
};

function Card({ children, style = {} }) {
  return (
    <div className="card-hover" style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.25rem', padding: '1.25rem', ...style }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: color ?? '#fff', marginBottom: '0.75rem' }}>
      {children}
    </div>
  );
}

export default function Screen7Greenwash({ companyId, companyOverride, screen1Result, onResult, runTrigger = 0 }) {
  const [agentStatus, setAgentStatus] = useState('idle');
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);
  const [meta,        setMeta]        = useState(null);

  const prevTrigger = useRef(0);
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
      const res = await fetch(`${API_BASE}/api/greenwash`, {
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

  const riskCfg = data ? (RISK_CONFIG[data.riskLevel] ?? RISK_CONFIG.medium) : null;

  return (
    <div>
      {/* Banner */}
      <div style={{ position: 'relative', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#000000', backgroundImage: `url(/images/${companyId}-banner.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: data
          ? 'linear-gradient(120deg, rgba(0,0,0,0.95) 45%, rgba(0,20,12,0.75))'
          : 'linear-gradient(to right, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.6))',
          transition: 'background 600ms ease'
        }} />
        {data && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(0,200,150,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontWeight: 300, fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#787878' }}>
              Greenwashing Forensics · Claims vs Evidence · {company.geography}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {screen1Result && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: '#00C89615', border: '1px solid #00C89640', borderRadius: '999px', padding: '0.2rem 0.625rem', fontSize: '0.6875rem', color: '#00C896', fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00C896', flexShrink: 0 }} />
                ESG Screen context loaded · Score {screen1Result.overallScore}
              </div>
            )}
            <button className="btn-acc" onClick={run} disabled={agentStatus === 'running'}>
              {agentStatus === 'running' ? 'Analysing...' : agentStatus === 'complete' ? 'Re-run Forensics' : 'Run Greenwash Detector'}
            </button>
          </div>
        </div>
      </div>

      <AgentStatus steps={STEPS} status={agentStatus} stepFindings={data ? [
        `${data.flaggedClaims?.length ?? 0} claims flagged for review`,
        `${data.flaggedClaims?.filter(c => ['material','critical'].includes(c.severity)).length ?? 0} material/critical gaps identified`,
        `${data.riskLevel?.toUpperCase()} greenwash risk — score ${data.riskScore}/100`,
        `Regulatory exposure: ${data.regulatoryExposure?.split('—')[0]?.trim() ?? 'assessed'}`,
        `${data.recommendedDisclosures?.length ?? 0} disclosure actions recommended`,
        `${data.positiveIndicators?.length ?? 0} positive indicators confirmed`,
      ] : undefined} />

      {meta && agentStatus === 'complete' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.625rem', color: '#333', marginBottom: '1rem' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.cached ? '#888888' : '#00C896', flexShrink: 0 }} />
          {meta.cached ? 'Cached result' : 'Live result'} · Generated {new Date(meta.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {meta.cached && (
            <button onClick={run} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.625rem', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: '0.25rem' }}>
              Re-run live →
            </button>
          )}
        </div>
      )}

      <RaiPanel />
      {meta && <div style={{ marginBottom: '1rem' }}><ReasoningDrawer meta={meta} /></div>}

      {error && (
        <div style={{ background: '#FF444410', border: '1px solid #FF444440', borderRadius: '0.25rem', padding: '1rem', color: '#FF4444', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {data && riskCfg && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Row 1: Risk hero + stats */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>

            {/* Risk score */}
            <Card style={{ background: riskCfg.bg, border: `1px solid ${riskCfg.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Label color={riskCfg.color}>Greenwash Risk</Label>
              <div>
                <div style={{ fontSize: '5rem', fontWeight: 700, color: riskCfg.color, lineHeight: 1, letterSpacing: '-0.04em' }}>
                  {data.riskScore}
                </div>
                <div style={{ fontSize: '0.5625rem', color: riskCfg.color, fontWeight: 700, letterSpacing: '0.08em', marginTop: '0.25rem' }}>/100</div>
              </div>
              <div style={{ padding: '0.5rem 0.75rem', background: `${riskCfg.color}15`, border: `1px solid ${riskCfg.color}33`, borderRadius: '2px', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: riskCfg.color }}>{riskCfg.label}</div>
                <div style={{ fontSize: '0.5625rem', color: riskCfg.color, opacity: 0.7, marginTop: '0.1rem' }}>{riskCfg.desc}</div>
              </div>
            </Card>

            {/* Stats */}
            {[
              { label: 'Flagged Claims',       val: data.flaggedClaims?.length ?? 0,                                                                    color: '#FF4444',  sub: 'require evidence or remediation' },
              { label: 'Material / Critical',  val: data.flaggedClaims?.filter(c => ['material','critical'].includes(c.severity)).length ?? 0,          color: '#FF4444',  sub: 'immediate LP disclosure risk' },
              { label: 'Positive Indicators',  val: data.positiveIndicators?.length ?? 0,                                                               color: '#00C896',  sub: 'claims supported by data' },
            ].map(({ label, val, color, sub }) => (
              <Card key={label}>
                <Label>{label}</Label>
                <div style={{ fontSize: '4rem', fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: '0.375rem' }}>{val}</div>
                <div style={{ fontSize: '0.5625rem', color: '#444' }}>{sub}</div>
              </Card>
            ))}
          </div>

          {/* Overall assessment */}
          <Card className="fade-up fade-up-1">
            <Label>Forensic Assessment</Label>
            <div style={{ fontSize: '0.8125rem', color: '#c8c8c4', lineHeight: 1.7 }}>{data.overallAssessment}</div>
          </Card>

          {/* Row 2: Flagged claims */}
          {data.flaggedClaims?.length > 0 && (
            <Card className="fade-up fade-up-2">
              <Label>Flagged Claims — Evidence Gaps</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.flaggedClaims.map((claim, i) => {
                  const sev = SEV_CONFIG[claim.severity] ?? SEV_CONFIG.moderate;
                  return (
                    <div key={i} style={{ padding: '0.875rem 1rem', background: `${sev.color}08`, border: `1px solid ${sev.color}33`, borderRadius: '0.2rem', borderLeft: `3px solid ${sev.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.45rem', fontWeight: 700, color: sev.color, background: `${sev.color}20`, border: `1px solid ${sev.color}40`, borderRadius: '2px', padding: '0.1rem 0.4rem', letterSpacing: '0.08em', flexShrink: 0, marginTop: '0.15rem' }}>{sev.label}</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#444', background: '#111', border: '1px solid #1E1E1E', borderRadius: '2px', padding: '0.1rem 0.4rem', letterSpacing: '0.06em', flexShrink: 0, marginTop: '0.15rem', textTransform: 'uppercase' }}>{claim.claimType}</span>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', flex: 1, lineHeight: 1.4 }}>{claim.claim}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingLeft: '0.25rem' }}>
                        <div>
                          <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Evidence Gap</div>
                          <div style={{ fontSize: '0.6875rem', color: '#787878', lineHeight: 1.5 }}>{claim.evidenceGap}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Mitigation</div>
                          <div style={{ fontSize: '0.6875rem', color: '#00C896', lineHeight: 1.5 }}>{claim.mitigation}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Row 3: Red flags + Positive indicators */}
          <div className="fade-up fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <Label color="#FF4444">Red Flags</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(data.redFlags ?? []).map((flag, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.5rem 0.625rem', background: '#FF444408', border: '1px solid #FF444420', borderRadius: '0.2rem' }}>
                    <span style={{ color: '#FF4444', flexShrink: 0, fontSize: '0.625rem', marginTop: '0.05rem' }}>▲</span>
                    <span style={{ fontSize: '0.6875rem', color: '#c8c8c4', lineHeight: 1.5 }}>{flag}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Label color="#00C896">Positive Indicators</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(data.positiveIndicators ?? []).map((ind, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.5rem 0.625rem', background: '#00C89608', border: '1px solid #00C89620', borderRadius: '0.2rem' }}>
                    <span style={{ color: '#00C896', flexShrink: 0, fontSize: '0.625rem', marginTop: '0.05rem' }}>✓</span>
                    <span style={{ fontSize: '0.6875rem', color: '#c8c8c4', lineHeight: 1.5 }}>{ind}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 4: Recommended disclosures + Regulatory exposure */}
          <div className="fade-up fade-up-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <Label>Recommended Disclosures</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {(data.recommendedDisclosures ?? []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.4rem 0.625rem', background: '#AC00EF08', borderLeft: '2px solid #AC00EF40', borderRadius: '0 2px 2px 0' }}>
                    <span style={{ color: '#AC00EF', fontWeight: 700, fontSize: '0.5625rem', flexShrink: 0, marginTop: '0.1rem' }}>D{i + 1}</span>
                    <span style={{ fontSize: '0.6875rem', color: '#787878', lineHeight: 1.4 }}>{d}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ background: '#0A0A0A', border: '1px solid #FF444433' }}>
              <Label color="#FF4444">Regulatory Exposure</Label>
              <div style={{ fontSize: '0.75rem', color: '#c8c8c4', lineHeight: 1.7 }}>{data.regulatoryExposure}</div>
            </Card>
          </div>

        </div>
      )}

      {agentStatus === 'idle' && !data && (
        <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.25rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontSize: '1.25rem', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            Greenwashing Forensics
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#555', marginBottom: '2rem' }}>
            Cross-references ESG claims against disclosed data using EU Green Claims Directive, CSRD, SFDR, and EUDR frameworks
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Claim Forensics',    desc: 'Claims vs evidence gap analysis' },
              { label: 'Scope Shifting',      desc: 'Scope 1/2 vs Scope 3 disparity' },
              { label: 'Reg Exposure',        desc: 'CSRD · EUDR · UK FCA · SFDR' },
              { label: 'Remediation Plan',    desc: 'Specific disclosure actions' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '0.6875rem', color: '#333' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
