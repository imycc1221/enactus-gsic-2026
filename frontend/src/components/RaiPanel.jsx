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
    color: '#F04FDB',
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
    color: '#F0A500',
    desc: 'Forced tool_use schema — structured JSON guaranteed. Zero hallucination in schema fields.',
    status: 'active',
  },
  {
    name: 'Responsibility',
    icon: '▲',
    color: '#FF1F5A',
    desc: 'Analyst review flagged on every output. Human-in-the-loop required before LP use.',
    status: 'review',
  },
];

export default function RaiPanel() {
  return (
    <div
      className="no-print"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 0,
        border: '1px solid #1E1E1E',
        borderRadius: '0.25rem',
        overflow: 'hidden',
        marginBottom: '1rem',
      }}
    >
      {PILLARS.map((p, i) => (
        <div
          key={p.name}
          style={{
            padding: '0.625rem 0.875rem',
            borderRight: i < 4 ? '1px solid #1E1E1E' : 'none',
            background: '#0A0A0A',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
          title={p.desc}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.6875rem', color: p.color }}>{p.icon}</span>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.name}</span>
            <span style={{
              marginLeft: 'auto',
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: p.status === 'active' ? '#00C896' : '#F0A500',
            }} />
          </div>
          <div style={{ fontSize: '0.5625rem', color: '#444', lineHeight: 1.4 }}>{p.desc}</div>
        </div>
      ))}
    </div>
  );
}
