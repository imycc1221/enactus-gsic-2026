/**
 * AgentFlowDiagram — Visual map of the 4-agent agentic pipeline.
 * Shows data sources, agent chain, context injection, and parallel execution.
 * Accenture GSIC 2026 — Team Da House
 */

function FlowArrow({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', margin: '0.375rem 0' }}>
      <div style={{ width: 1, height: 12, background: '#2E2E2E' }} />
      {label && (
        <div style={{ fontSize: '0.5rem', color: '#333', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '999px', padding: '0.1rem 0.5rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {label}
        </div>
      )}
      <div style={{ width: 1, height: 12, background: '#2E2E2E' }} />
      <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #2E2E2E' }} />
    </div>
  );
}

function AgentBox({ num, label, tool, desc, color, bg, border, badge }) {
  return (
    <div style={{ padding: '0.75rem 1rem', background: bg, border: `1px solid ${border}`, borderRadius: '0.2rem', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.3rem' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, color }}>{num}</span>
        </div>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color }}>{label}</span>
        {badge && (
          <span style={{ marginLeft: 'auto', fontSize: '0.45rem', fontWeight: 700, color: '#333', background: '#111', border: '1px solid #1E1E1E', borderRadius: '2px', padding: '0.1rem 0.4rem', letterSpacing: '0.05em', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.5625rem', color: '#444', lineHeight: 1.5, paddingLeft: '1.625rem' }}>
        <span style={{ color: '#2E2E2E', fontFamily: 'ui-monospace, monospace' }}>tool:</span>
        <span style={{ color: `${color}99`, fontFamily: 'ui-monospace, monospace', marginRight: '0.5rem' }}> {tool}</span>
        {desc}
      </div>
    </div>
  );
}

export default function AgentFlowDiagram() {
  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '0.25rem', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.125rem' }}>
        <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Agentic AI Architecture — 4-Agent Pipeline
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { dot: '#AC00EF', label: 'ESG Screen' },
            { dot: '#F04FDB', label: 'Value Model' },
            { dot: '#F0A500', label: 'SFDR Classify' },
            { dot: '#00C896', label: 'Portfolio' },
          ].map(({ dot, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, boxShadow: `0 0 4px ${dot}88` }} />
              <span style={{ fontSize: '0.5rem', color: '#333', letterSpacing: '0.04em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source layer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        {[
          { label: 'Company Profile',  sub: 'SASB sector · Financials · Geography · PE context', color: '#444' },
          { label: 'SASB Library',     sub: '77-industry materiality map · KPI weights by sector', color: '#444' },
          { label: 'Regulatory Stack', sub: 'CSRD / SFDR / TCFD / GRI / SASB / EDCI / ISSB / HKEX', color: '#444' },
        ].map(({ label, sub, color }) => (
          <div key={label} style={{ padding: '0.5rem 0.75rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: '0.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: '0.5rem', color: '#2E2E2E', marginTop: '0.15rem', lineHeight: 1.4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <FlowArrow label="company object → POST body" />

      {/* Agent 1 */}
      <AgentBox
        num="1" label="ESG Screener" tool="analyze_esg_materiality"
        desc="SASB materiality filter · KPI scoring · risk flags · EBITDA value opportunities · framework compliance gaps"
        color="#AC00EF" bg="#0D0018" border="#AC00EF33"
        badge="claude-sonnet-4-6"
      />

      <FlowArrow label="screen1Result injected → Agent 2 & 3 system prompt" />

      {/* Agent 2 + 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        <AgentBox
          num="2" label="Value Predictor" tool="predict_irr_uplift"
          desc="BCG/EY-Parthenon IRR benchmarks · initiative-level costs · 3-scenario exit model · LP narrative"
          color="#F04FDB" bg="#130010" border="#F04FDB33"
        />
        <AgentBox
          num="3" label="SFDR Classifier" tool="classify_sfdr_article"
          desc="Art.6/8/9 determination · 14 PAI indicators · DNSH compliance · upgrade pathway · LP disclosure draft"
          color="#F0A500" bg="#130800" border="#F0A50033"
        />
      </div>

      {/* Context injection note */}
      <div style={{ marginTop: '0.375rem', marginBottom: '0.375rem', padding: '0.375rem 0.75rem', background: '#00C89608', border: '1px solid #00C89620', borderRadius: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Cross-agent context</span>
        <span style={{ fontSize: '0.5rem', color: '#2E2E2E', lineHeight: 1.5 }}>
          Agent 1 output (overallScore · pillarScores · riskFlags · valueOpportunities) is serialised and injected verbatim into the system prompt of Agents 2 and 3,
          enabling downstream agents to use upstream ESG findings without re-running analysis — zero token duplication, deterministic context passing.
        </span>
      </div>

      <FlowArrow label="9 parallel API calls — 3 companies × 3 agents" />

      {/* Agent 4 */}
      <AgentBox
        num="4" label="Portfolio Dashboard" tool="all 3 agents · parallel"
        desc="IC ranking matrix · cross-company risk heatmap · E/S/G radar · IRR comparison · investment committee summary"
        color="#00C896" bg="#001A12" border="#00C89633"
        badge="Promise.all(9 calls)"
      />

      {/* Bottom metadata strip */}
      <div style={{ marginTop: '0.875rem', display: 'flex', gap: '1.5rem', borderTop: '1px solid #111', paddingTop: '0.75rem' }}>
        {[
          { label: 'Schema enforcement', val: 'tool_choice: forced — zero free-form output in structured fields' },
          { label: 'Hallucination guard',  val: 'All financial figures returned via JSON schema · validated client-side' },
          { label: 'Audit trail',          val: 'Full prompt chain (system + user) stored in _meta on every response' },
          { label: 'RAI',                  val: 'Accenture 5-pillar Responsible AI panel on every screen' },
        ].map(({ label, val }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#2E2E2E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontSize: '0.5rem', color: '#333', lineHeight: 1.4 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
