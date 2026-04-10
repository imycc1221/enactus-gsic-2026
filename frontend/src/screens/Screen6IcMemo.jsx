/**
 * Screen6IcMemo — Investment Committee Memorandum
 * Synthesises ESG Screen + Value Prediction + SFDR Classification into a
 * formatted IC memo ready for LP data room. Accenture GSIC 2026 — Team Da House.
 *
 * Requires: analyzeResult, predictResult, sfdrResult from upstream agents.
 */

import { COMPANY_MAP } from '../data/companies.js';

const TODAY = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
function pct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function x(n)   { return n != null ? `${Number(n).toFixed(2)}x` : '—'; }

function scoreColor(s) {
  if (s >= 75) return '#AC00EF';
  if (s >= 50) return '#AC00EF';
  return '#FF4444';
}

function Divider() {
  return <div style={{ height: 1, background: '#1E1E1E', margin: '1.25rem 0' }} />;
}

function SectionHeader({ num, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
      <div style={{ width: 20, height: 20, borderRadius: '2px', background: '#AC00EF22', border: '1px solid #AC00EF44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#AC00EF' }}>{num}</span>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</span>
    </div>
  );
}

function StatusPending({ agents }) {
  return (
    <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.25rem', padding: '3rem 2rem', textAlign: 'center' }}>
      <div style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontSize: '1.25rem', fontWeight: 300, color: '#fff', marginBottom: '0.75rem' }}>
        Investment Committee Memo
      </div>
      <p style={{ fontSize: '0.8125rem', color: '#555', marginBottom: '2rem' }}>
        Run the agents below to populate the memo. Results are combined automatically.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        {agents.map(({ label, done, tab }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#00C896' : '#1E1E1E', border: `1px solid ${done ? '#00C896' : '#2E2E2E'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {done && <span style={{ fontSize: '0.5rem', color: '#000', fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: '0.75rem', color: done ? '#00C896' : '#555' }}>
              {label}{!done && <span style={{ color: '#333', fontSize: '0.6875rem' }}> — go to "{tab}" tab</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Screen6IcMemo({ companyId, companyOverride, analyzeResult, predictResult, sfdrResult }) {
  const company = companyOverride ?? COMPANY_MAP[companyId];
  const hasAll = analyzeResult && predictResult && sfdrResult;
  const hasAny = analyzeResult || predictResult || sfdrResult;

  const agentStatus = [
    { label: 'ESG Screener (Agent 1)',   done: !!analyzeResult, tab: 'ESG Screener' },
    { label: 'Value Predictor (Agent 2)', done: !!predictResult, tab: 'Value Predictor' },
    { label: 'SFDR Classifier (Agent 3)', done: !!sfdrResult,   tab: 'SFDR Classifier' },
  ];

  if (!hasAny) return (
    <div>
      <div style={{ position: 'relative', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#0A0A0A', border: '1px solid #AC00EF22', padding: '1.5rem' }}>
        <h1 style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontWeight: 300, fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
          IC Memorandum
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#787878' }}>
          Investment Committee · Accenture ESG Value Engine · {company.name}
        </p>
      </div>
      <StatusPending agents={agentStatus} />
    </div>
  );

  const a = analyzeResult ?? {};
  const p = predictResult ?? {};
  const s = sfdrResult ?? {};

  const confPct = a.dataConfidenceScore != null ? Math.round(a.dataConfidenceScore * 100) : null;
  const verdict = a.overallScore >= 65 ? 'PROCEED' : a.overallScore >= 45 ? 'MONITOR' : 'CAUTION';
  const vColor  = verdict === 'PROCEED' ? '#00C896' : verdict === 'MONITOR' ? '#888888' : '#FF4444';
  const artCfg  = { 'Article 9': '#00C896', 'Article 8': '#AC00EF', 'Article 6': '#FF4444' };
  const artColor = artCfg[s.recommendedArticle] ?? '#888888';

  const irrBase = Number(p.baseCase?.projectedIrr ?? 0);
  const irrEsg  = Number(p.baseCase?.projectedIrr ?? 0) + Number(p.withEsgInterventions?.irrUplift ?? 0);
  const addVal  = p.withEsgInterventions?.additionalValueCreated ?? 0;

  return (
    <div>
      {/* Header banner */}
      <div style={{ position: 'relative', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '1.5rem', background: '#0A0A0A', border: '1px solid #AC00EF22' }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
              Investment Committee Memorandum · Confidential
            </div>
            <h1 style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontWeight: 300, fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#787878' }}>
              {company.sasbSector} · {company.geography} · {fmt(company.revenue)} revenue
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            {!hasAll && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: '#88888815', border: '1px solid #88888840', borderRadius: '999px', padding: '0.2rem 0.625rem', fontSize: '0.6875rem', color: '#888888', fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#888888', flexShrink: 0 }} />
                Partial — {agentStatus.filter(a => a.done).length}/3 agents run
              </div>
            )}
            <button
              onClick={() => window.print()}
              className="btn-acc no-print"
              style={{ minHeight: '2.25rem', fontSize: '0.8125rem', padding: '0 1rem' }}
            >
              Print IC Memo
            </button>
          </div>
        </div>
      </div>

      {/* Memo content */}
      <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '0.25rem', padding: '2rem' }}>

        {/* Memo header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Memorandum Details</div>
            {[
              { label: 'TO',       val: 'Investment Committee' },
              { label: 'FROM',     val: 'ESG Value Engine — AI Analysis' },
              { label: 'DATE',     val: TODAY },
              { label: 'RE',       val: company.name },
              { label: 'FUND',     val: 'Accenture PE Portfolio' },
              { label: 'CLASS',    val: 'RESTRICTED · For IC Use Only' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', gap: '1rem', paddingBottom: '0.3rem', borderBottom: '1px solid #111', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', width: '3.5rem', flexShrink: 0, paddingTop: '0.05rem' }}>{label}</span>
                <span style={{ fontSize: '0.6875rem', color: '#c8c8c4' }}>{val}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Deal Snapshot</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {[
                { label: 'Investment',   val: fmt(company.peInvestmentContext?.investmentAmount),     color: '#fff' },
                { label: 'Hold Period',  val: `${company.peInvestmentContext?.holdingPeriod ?? '—'} years`, color: '#fff' },
                { label: 'ESG Score',    val: a.overallScore != null ? `${a.overallScore}/100` : '—',  color: scoreColor(a.overallScore ?? 0) },
                { label: 'SFDR',         val: s.recommendedArticle ?? '—',                              color: artColor },
                { label: 'IRR Uplift',   val: p.withEsgInterventions ? `+${pct(p.withEsgInterventions.irrUplift)}` : '—', color: '#AC00EF' },
                { label: 'Value Added',  val: addVal ? fmt(addVal) : '—',                               color: '#fff' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '0.625rem 0.75rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem' }}>
                  <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* Recommendation hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.25rem', padding: '1.25rem', background: `${vColor}08`, border: `1px solid ${vColor}33`, borderRadius: '0.25rem' }}>
          <div>
            <div style={{ fontSize: '0.5rem', fontWeight: 700, color: `${vColor}99`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>IC Recommendation</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: vColor, lineHeight: 1, letterSpacing: '-0.02em' }}>{verdict}</div>
            <div style={{ fontSize: '0.625rem', color: `${vColor}88`, marginTop: '0.375rem' }}>
              {verdict === 'PROCEED' ? 'Strong ESG profile — proceed to due diligence' :
               verdict === 'MONITOR' ? 'Moderate ESG profile — conditional on action plan' :
               'Material ESG risks — further review required'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
            {s.lpNarrative ? (
              <div style={{ fontSize: '0.75rem', color: '#c8c8c4', lineHeight: 1.6 }}>{s.lpNarrative}</div>
            ) : a.overallScore != null ? (
              <div style={{ fontSize: '0.75rem', color: '#787878', lineHeight: 1.6 }}>
                {company.name} demonstrates an ESG materiality score of <strong style={{ color: '#fff' }}>{a.overallScore}/100</strong> under SASB-{company.sasbSector} classification.
                {a.overallScore >= 65
                  ? ` The company presents a credible ESG improvement trajectory with ${a.valueOpportunities?.length ?? 0} quantified value opportunities, supporting a ${s.recommendedArticle ?? 'Article 8'} SFDR designation.`
                  : ` Material gaps in ${a.riskFlags?.find(r => r.severity === 'high')?.area ?? 'key ESG areas'} require prioritised remediation before LP close.`}
                {p.withEsgInterventions?.irrUplift != null && ` ESG interventions are projected to generate +${pct(p.withEsgInterventions.irrUplift)} IRR uplift and ${fmt(addVal)} in additional equity value over the holding period.`}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#444' }}>Run the ESG Screener to generate the executive narrative.</div>
            )}
          </div>
        </div>

        <Divider />

        {/* Section 1: ESG Analysis */}
        {analyzeResult && (
          <>
            <SectionHeader num="01">ESG Materiality Analysis</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

              {/* Scores */}
              <div style={{ padding: '1rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem' }}>
                <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Pillar Scores</div>
                {[
                  { label: 'Overall',       val: a.overallScore,            max: 100 },
                  { label: 'Environmental', val: a.pillarScores?.environmental, max: 100 },
                  { label: 'Social',        val: a.pillarScores?.social,        max: 100 },
                  { label: 'Governance',    val: a.pillarScores?.governance,     max: 100 },
                ].map(({ label, val, max }) => val != null ? (
                  <div key={label} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.625rem', color: '#787878' }}>{label}</span>
                      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: scoreColor(val) }}>{val}/{max}</span>
                    </div>
                    <div style={{ height: 2, background: '#1E1E1E', borderRadius: 1 }}>
                      <div style={{ height: '100%', width: `${(val / max) * 100}%`, background: scoreColor(val), borderRadius: 1 }} />
                    </div>
                  </div>
                ) : null)}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1E1E1E' }}>
                  <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>SASB Classification</div>
                  <div style={{ fontSize: '0.6875rem', color: '#AC00EF' }}>{a.sasbClassification ?? '—'}</div>
                </div>
              </div>

              {/* Risks + Opportunities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ padding: '0.75rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem', flex: 1 }}>
                  <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Key Risk Flags</div>
                  {(a.riskFlags ?? []).slice(0, 4).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.45rem', fontWeight: 700, color: r.severity === 'high' ? '#FF4444' : r.severity === 'medium' ? '#AC00EF' : '#AC00EF', textTransform: 'uppercase', flexShrink: 0, marginTop: '0.1rem', width: '2.5rem' }}>{r.severity}</span>
                      <span style={{ fontSize: '0.625rem', color: '#787878', lineHeight: 1.4 }}>{r.area}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0.75rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem', flex: 1 }}>
                  <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Value Opportunities</div>
                  {(a.valueOpportunities ?? []).slice(0, 3).map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.5625rem', color: '#00C896', fontWeight: 700, flexShrink: 0 }}>{fmt(v.ebitdaImpact)}</span>
                      <span style={{ fontSize: '0.625rem', color: '#787878', lineHeight: 1.4 }}>{v.area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Framework compliance */}
            {a.frameworkGaps && Object.keys(a.frameworkGaps).length > 0 && (
              <div style={{ padding: '0.75rem 1rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Framework Compliance</div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(a.frameworkGaps).map(([fw, d]) => d ? (
                    <div key={fw} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '6rem' }}>
                      <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', width: '2.5rem' }}>{fw}</span>
                      <div style={{ flex: 1, height: 2, background: '#1E1E1E', borderRadius: 1, minWidth: '4rem' }}>
                        <div style={{ height: '100%', width: `${d.percentage ?? 0}%`, background: '#AC00EF', borderRadius: 1 }} />
                      </div>
                      <span style={{ fontSize: '0.5625rem', color: '#555' }}>{d.percentage}%</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}
            <Divider />
          </>
        )}

        {/* Section 2: Financial Value Creation */}
        {predictResult && (
          <>
            <SectionHeader num="02">Financial Value Creation Model</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Base Case IRR',        val: pct(p.baseCase?.projectedIrr),                   sub: 'compliance-only ESG',               color: '#787878' },
                { label: 'ESG-Enhanced IRR',      val: pct(irrEsg),                                     sub: 'with ESG interventions',             color: '#AC00EF' },
                { label: 'IRR Uplift',            val: `+${pct(p.withEsgInterventions?.irrUplift)}`,    sub: 'ESG alpha vs base case',             color: '#AC00EF' },
                { label: 'Base Exit Multiple',    val: x(p.baseCase?.exitMultiple),                     sub: 'compliance-only scenario',           color: '#787878' },
                { label: 'ESG Exit Multiple',     val: x(p.withEsgInterventions?.exitMultiple),         sub: 'with interventions',                 color: '#AC00EF' },
                { label: 'Additional Value',      val: fmt(addVal),                                      sub: 'vs base case at exit',              color: '#00C896' },
              ].map(({ label, val, sub, color }) => (
                <div key={label} style={{ padding: '0.875rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem' }}>
                  <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.2rem' }}>{val}</div>
                  <div style={{ fontSize: '0.5rem', color: '#333' }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Key initiatives */}
            {p.withEsgInterventions?.keyInitiatives?.length > 0 && (
              <div style={{ padding: '0.875rem 1rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Key ESG Initiatives</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {p.withEsgInterventions.keyInitiatives.slice(0, 5).map((init, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.6875rem', color: '#787878', borderBottom: '1px solid #111', paddingBottom: '0.3rem' }}>
                      <span style={{ color: '#AC00EF', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ flex: 1 }}>{init.initiative ?? init.description ?? String(init)}</span>
                      {init.irrContribution != null && (
                        <span style={{ color: '#AC00EF', fontWeight: 600, flexShrink: 0 }}>+{pct(init.irrContribution)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Divider />
          </>
        )}

        {/* Section 3: SFDR */}
        {sfdrResult && (
          <>
            <SectionHeader num="03">SFDR Regulatory Classification</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', marginBottom: '1.25rem', alignItems: 'start' }}>
              <div style={{ padding: '1.25rem 1.75rem', background: `${artColor}12`, border: `1px solid ${artColor}40`, borderRadius: '0.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.5rem', fontWeight: 700, color: `${artColor}88`, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Classification</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: artColor, lineHeight: 1 }}>Art.</div>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: artColor, lineHeight: 1 }}>
                  {s.recommendedArticle?.replace('Article ', '') ?? '—'}
                </div>
                <div style={{ fontSize: '0.5625rem', color: `${artColor}88`, marginTop: '0.375rem', maxWidth: '6rem' }}>
                  {s.recommendedArticle === 'Article 9' ? 'Sustainable Objective' : s.recommendedArticle === 'Article 8' ? 'Promotes E/S Chars.' : 'No ESG Claim'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(s.qualifyingFactors ?? []).slice(0, 5).map((f, i) => {
                  const fc = f.status === 'met' ? '#00C896' : f.status === 'partial' ? '#888888' : '#FF4444';
                  const sym = f.status === 'met' ? '✓' : f.status === 'partial' ? '◐' : '✗';
                  return (
                    <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.375rem 0', borderBottom: '1px solid #111' }}>
                      <span style={{ color: fc, fontWeight: 700, fontSize: '0.625rem', flexShrink: 0 }}>{sym}</span>
                      <span style={{ fontSize: '0.6875rem', color: '#787878', flex: 1 }}>{f.factor}</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: fc, textTransform: 'uppercase', flexShrink: 0 }}>{f.status?.replace('_', ' ')}</span>
                    </div>
                  );
                })}
                {s.upgradePath?.nextArticle && (
                  <div style={{ marginTop: '0.25rem', padding: '0.5rem 0.75rem', background: '#00C89608', border: '1px solid #00C89620', borderRadius: '0.2rem' }}>
                    <span style={{ fontSize: '0.5625rem', color: '#00C896', fontWeight: 700 }}>Upgrade path: </span>
                    <span style={{ fontSize: '0.5625rem', color: '#787878' }}>
                      {s.upgradePath.nextArticle} achievable in {s.upgradePath.estimatedTimeToUpgrade} — {s.upgradePath.keyActions?.[0] ?? 'see SFDR tab'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {s.regulatoryRisk && (
              <div style={{ padding: '0.625rem 1rem', background: '#FF444408', border: '1px solid #FF444433', borderRadius: '0.2rem', marginBottom: '1.25rem', fontSize: '0.6875rem', color: '#787878', lineHeight: 1.5 }}>
                <span style={{ color: '#FF4444', fontWeight: 700 }}>Regulatory risk: </span>{s.regulatoryRisk}
              </div>
            )}
            <Divider />
          </>
        )}

        {/* Section 4: Quick wins (from analyze) */}
        {analyzeResult && (a.quickWins ?? a.recommendedActions)?.length > 0 && (
          <>
            <SectionHeader num="04">Recommended ESG Action Plan</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
              {(a.quickWins ?? a.recommendedActions ?? []).slice(0, 5).map((qw, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.625rem 0.875rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#AC00EF', flexShrink: 0, marginTop: '0.1rem' }}>Q{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.6875rem', color: '#c8c8c4', fontWeight: 500, marginBottom: '0.2rem' }}>
                      {qw.action ?? qw.title ?? String(qw)}
                    </div>
                    {qw.timeframe && <span style={{ fontSize: '0.5rem', color: '#333' }}>{qw.timeframe}</span>}
                    {qw.ebitdaImpact && <span style={{ fontSize: '0.5rem', color: '#00C896', marginLeft: '0.5rem' }}>{fmt(qw.ebitdaImpact)} EBITDA impact</span>}
                  </div>
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Analyst certification */}
        <div style={{ padding: '1rem 1.25rem', background: '#FF444408', border: '1px solid #FF444433', borderRadius: '0.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.125rem', color: '#FF4444', flexShrink: 0, lineHeight: 1, marginTop: '0.1rem' }}>⚠</div>
          <div>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#FF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              Analyst Certification Required — Accenture Responsible AI
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#787878', lineHeight: 1.5 }}>
              This memorandum was generated by an AI system (Claude Sonnet 4.6, tool_choice: forced). Financial figures are model estimates and require CFO sign-off.
              Regulatory references are based on training data — verify against live regulation text before LP use.
              <strong style={{ color: '#c8c8c4' }}> Human analyst review is mandatory before any investor-facing distribution.</strong>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2rem' }}>
              {['ESG Lead Analyst', 'CFO Sign-Off', 'Legal Review'].map(sig => (
                <div key={sig}>
                  <div style={{ height: 1, background: '#2E2E2E', width: '8rem', marginBottom: '0.25rem' }} />
                  <div style={{ fontSize: '0.5rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sig}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Methodology footer */}
        <div style={{ marginTop: '1.25rem', fontSize: '0.5rem', color: '#222', lineHeight: 1.6 }}>
          Methodology: SASB Materiality Map (77-industry) · BCG ESG Alpha Study (2023) · EY-Parthenon ESG-IRR Correlation · Verdantix Market Sizing (2024) · EU SFDR Regulation 2019/2088 Level 2 RTS ·
          Khan, Serafeim & Yoon (2016) · Accenture Responsible AI Framework (5 pillars)
        </div>
      </div>
    </div>
  );
}
