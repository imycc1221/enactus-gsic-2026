/**
 * RaiPanel — Accenture's 5 Responsible AI pillars mapped to this output.
 * Shows how the system satisfies each RAI principle for every analysis result.
 */

const PILLARS = [
  {
    name: 'Fairness',
    icon: '⚖',
    color: '#AC00EF',
    desc: 'SASB 77-industry filter — only material KPIs scored. Generic ESG noise removed.',
    status: 'active',
  },
  {
    name: 'Transparency',
    icon: '◎',
    color: '#AC00EF',
    desc: 'Full prompt chain exposed. Data confidence score displayed. Source attribution on every metric.',
    status: 'active',
  },
  {
    name: 'Security',
    icon: '⛨',
    color: '#00C896',
    desc: 'No PII stored. Results are company-profile-bound. Audit log attached to every output.',
    status: 'active',
  },
  {
    name: 'Reliability',
    icon: '◉',
    color: '#888888',
    desc: 'Forced tool_use schema — structured JSON guaranteed. Zero hallucination in schema fields.',
    status: 'active',
  },
  {
    name: 'Responsibility',
    icon: '▲',
    color: '#FF4444',
    desc: 'Analyst review flagged on every output. Human-in-the-loop required before LP use.',
    status: 'review',
  },
];

export default function RaiPanel() {
  return (
    <div
      className="no-print"
      style={{
        border: '1px solid #2E2E2E',
        borderRadius: '0.25rem',
        overflow: 'hidden',
        marginBottom: '1rem',
        background: '#0D0D0D',
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 0.875rem',
        borderBottom: '1px solid #1E1E1E',
        background: '#111',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#888888', boxShadow: '0 0 6px #88888880', flexShrink: 0 }} />
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Responsible AI Review Required
          </span>
        </div>
        <span style={{ fontSize: '0.5625rem', color: '#444', letterSpacing: '0.04em' }}>
          Accenture RAI Principles · Human-in-the-loop before LP use
        </span>
      </div>

      {/* Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
        {PILLARS.map((p, i) => (
          <div
            key={p.name}
            style={{
              padding: '0.75rem 0.875rem',
              borderRight: i < 4 ? '1px solid #1E1E1E' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}
            title={p.desc}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', color: p.color }}>{p.icon}</span>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.name}</span>
              <span style={{
                marginLeft: 'auto',
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: p.status === 'active' ? '#00C896' : '#888888',
                boxShadow: p.status === 'active' ? '0 0 5px #00C89660' : '0 0 5px #88888860',
              }} />
            </div>
            <div style={{ fontSize: '0.625rem', color: '#666', lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
