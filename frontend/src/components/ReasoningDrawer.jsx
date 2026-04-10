import { useState } from 'react';

/**
 * ReasoningDrawer — Accenture RAI Transparency pillar made visible.
 * Shows the exact system prompt, user prompt, model, and data assumptions
 * that produced the AI output. Opened via a "View AI Reasoning" button.
 */
export default function ReasoningDrawer({ meta }) {
  const [open,       setOpen]       = useState(false);
  const [sysPExpand, setSysPExpand] = useState(false);

  if (!meta) return null;

  const ts = meta.timestamp ? new Date(meta.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <>
      {/* Trigger */}
      <button
        className="no-print"
        onClick={() => setOpen(true)}
        style={{
          background: 'none', border: '1px solid #2E2E2E', borderRadius: '0.25rem',
          color: '#555', fontSize: 'var(--fs-micro)', fontWeight: 500, cursor: 'pointer',
          padding: '0.25rem 0.625rem', letterSpacing: '0.04em',
          transition: 'border-color 200ms, color 200ms', display: 'inline-flex',
          alignItems: 'center', gap: '0.375rem'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#AC00EF'; e.currentTarget.style.color = '#AC00EF'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2E2E2E'; e.currentTarget.style.color = '#555'; }}
      >
        <span style={{ fontSize: 'var(--fs-label)', color: 'inherit' }}>◎</span>
        View AI Reasoning
      </button>

      {/* Overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }}>
          <div onClick={() => setOpen(false)} style={{ flex: 1, background: '#00000088' }} />

          {/* Drawer */}
          <div style={{
            width: '520px', maxWidth: '95vw', background: '#0D0D0D',
            borderLeft: '1px solid #2E2E2E', display: 'flex', flexDirection: 'column',
            overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #2E2E2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>AI Reasoning Trace</div>
                <div style={{ fontSize: 'var(--fs-label)', color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Accenture Responsible AI — Transparency Pillar</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 'var(--fs-h2)', cursor: 'pointer', lineHeight: 1, padding: '0.25rem' }}>×</button>
            </div>

            {/* Meta strip */}
            <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1E1E1E', display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
              {[
                { label: 'Model',     val: meta.model ?? 'claude-sonnet-4-6' },
                { label: 'Tool',      val: meta.tool ?? '—' },
                { label: 'Source',    val: meta.cached ? 'Cached' : 'Live Claude', color: meta.cached ? '#555' : '#00C896' },
                { label: 'Time',      val: ts },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: color ?? '#c8c8c4', fontFamily: 'ui-monospace, monospace' }}>{val}</div>
                </div>
              ))}
              {meta.screen1ContextInjected && (
                <div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Context</div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: '#00C896' }}>Screen 1 injected</div>
                </div>
              )}
            </div>

            {/* RAI notice */}
            <div style={{ margin: '1rem 1.5rem', padding: '0.75rem 1rem', background: '#AC00EF08', border: '1px solid #AC00EF25', borderRadius: '0.25rem' }}>
              <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#AC00EF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>Responsible AI — Transparency</div>
              <div style={{ fontSize: 'var(--fs-label)', color: '#787878', lineHeight: 1.5 }}>
                Every output from this system exposes the full prompt chain that produced it. Outputs are flagged for analyst review before any LP-facing use. This trace is the audit record.
              </div>
            </div>

            {/* System prompt */}
            <div style={{ padding: '0 1.5rem 1rem', flexShrink: 0 }}>
              <button
                onClick={() => setSysPExpand(e => !e)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0', marginBottom: '0.5rem' }}
              >
                <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Prompt</span>
                <span style={{ color: '#AC00EF', fontSize: 'var(--fs-sm)' }}>{sysPExpand ? '−' : '+'}</span>
              </button>
              {sysPExpand && (
                <pre style={{ fontSize: 'var(--fs-micro)', color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '0.25rem', padding: '0.75rem', margin: 0, fontFamily: 'ui-monospace, monospace', maxHeight: '300px', overflowY: 'auto' }}>
                  {meta.systemPrompt}
                </pre>
              )}
            </div>

            {/* User prompt */}
            <div style={{ padding: '0 1.5rem 1rem', flexShrink: 0 }}>
              <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>User Prompt (Sent to Claude)</div>
              <pre style={{ fontSize: 'var(--fs-micro)', color: '#c8c8c4', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '0.25rem', padding: '0.75rem', margin: 0, fontFamily: 'ui-monospace, monospace', maxHeight: '400px', overflowY: 'auto' }}>
                {meta.userPrompt}
              </pre>
            </div>

            {/* Assumptions notice */}
            <div style={{ padding: '0 1.5rem 1.5rem', flexShrink: 0 }}>
              <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Data Assumptions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {[
                  { label: 'Schema enforcement', val: 'tool_choice: forced — zero free-form output', color: '#00C896' },
                  { label: 'Financial figures',   val: 'Model estimates — require CFO sign-off before LP use', color: '#888888' },
                  { label: 'Regulatory refs',     val: 'Based on training data — verify against live regulation text', color: '#888888' },
                  { label: 'Analyst review',      val: 'Required before any investor-facing output', color: '#FF4444' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.4rem 0.625rem', background: `${color}08`, borderLeft: `2px solid ${color}40`, borderRadius: '0 2px 2px 0' }}>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, width: '7rem', marginTop: '0.1rem' }}>{label}</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: '#787878', lineHeight: 1.4 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
