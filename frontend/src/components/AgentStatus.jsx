import { useState, useEffect, useRef } from 'react';

/**
 * AgentStatus — Accenture-styled AI agent trace.
 * Shows sequential steps as the agent processes. Key demo differentiator.
 */
export default function AgentStatus({ steps, status, stepFindings }) {
  const [activeStep, setActiveStep] = useState(-1);
  const intervalRef = useRef(null);

  useEffect(() => {
    clearInterval(intervalRef.current);

    if (status === 'idle') { setActiveStep(-1); return; }
    if (status === 'complete') { setActiveStep(steps.length); return; }

    setActiveStep(0);
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += 1;
      setActiveStep(current);
      if (current >= steps.length - 1) clearInterval(intervalRef.current);
    }, 200);

    return () => clearInterval(intervalRef.current);
  }, [status, steps.length]);

  if (status === 'idle') return null;

  return (
    <div
      style={{
        background: '#000000',
        border: `1px solid ${status === 'complete' ? '#2b2b2b' : '#a100ff33'}`,
        borderRadius: '0.25rem',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        transition: 'border-color 550ms cubic-bezier(0.85,0,0,1)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div
          className={status === 'running' ? 'animate-pulse-dot' : ''}
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: status === 'running' ? '#a100ff' : '#299e00',
            flexShrink: 0,
            boxShadow: status === 'running' ? '0 0 6px #a100ff88' : '0 0 4px #299e0066'
          }}
        />
        <span
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 'var(--fs-micro)',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#616160'
          }}
        >
          {status === 'running' ? 'ESG Agent Processing' : 'Analysis Complete'}
        </span>
        {status === 'complete' && (
          <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-label)', color: '#299e00', fontWeight: 500 }}>
            ✓ Done
          </span>
        )}
        {status === 'running' && (
          <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-micro)', color: '#a100ff', fontWeight: 500 }}>
            powered by Claude AI
          </span>
        )}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steps.map((step, i) => {
          const isDone    = i < activeStep;
          const isCurrent = i === activeStep && status === 'running';

          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                animation: (isDone || isCurrent) ? `stepReveal 220ms cubic-bezier(0.25,1,0.5,1) both` : 'none',
                animationDelay: `${i * 30}ms`
              }}
            >
              {/* Step indicator */}
              <div style={{ width: '1rem', flexShrink: 0, textAlign: 'center' }}>
                {isDone ? (
                  <span style={{ color: '#299e00', fontSize: 'var(--fs-label)' }}>✓</span>
                ) : isCurrent ? (
                  <span
                    className="animate-spin-slow"
                    style={{ color: '#a100ff', fontSize: 'var(--fs-sm)', display: 'inline-block' }}
                  >
                    ⟳
                  </span>
                ) : (
                  <span style={{ color: '#2b2b2b', fontSize: 'var(--fs-label)' }}>○</span>
                )}
              </div>

              {/* Step label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: 'var(--fs-sm)',
                    fontWeight: isCurrent ? 500 : 400,
                    color: isDone ? '#3d3d3d' : isCurrent ? '#dcafff' : '#2b2b2b',
                    textDecoration: isDone ? 'line-through' : 'none',
                    textDecorationColor: '#2b2b2b',
                    transition: 'color 300ms cubic-bezier(0.25,1,0.5,1)'
                  }}
                >
                  {step}
                </span>
                {isDone && stepFindings?.[i] && (
                  <div style={{
                    fontSize: 'var(--fs-micro)', color: '#444', marginTop: '0.15rem',
                    fontFamily: "'Inter', -apple-system, sans-serif", lineHeight: 1.4
                  }}>
                    → {stepFindings[i]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
