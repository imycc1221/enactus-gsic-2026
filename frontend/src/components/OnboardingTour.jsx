import { useState, useEffect } from 'react';

const TOUR_KEY = 'esg-tour-done';

const STEPS = [
  {
    icon: '🏢',
    title: 'Select a company',
    body: 'Choose GreenTech, CleanEnergy, or Sustainable Retail from the header — or enter any custom company for a live Claude analysis. Each preset uses cached AI results for instant demo performance.',
  },
  {
    icon: '🔬',
    title: 'Start with ESG Screener',
    body: 'The ESG Screener uses SASB\'s 77-industry materiality map to filter which KPIs actually matter for this company\'s sector. Its output feeds financial context into the Value Predictor, SFDR Classifier, and Greenwash Detector.',
  },
  {
    icon: '📈',
    title: 'Model the financial value',
    body: 'The Value Predictor translates ESG actions into IRR uplift, exit EV, and initiative-level ROI — with Bear / Base / Bull scenarios. This is the core investment thesis: ESG as value creation, not compliance cost.',
  },
  {
    icon: '🔒',
    title: 'SFDR 2.0 dual readiness',
    body: 'The SFDR Classifier shows both the current Article 8/9 classification AND the future SFDR 2.0 category (ESG Basics / Transition / Sustainable). No other tool on the market offers pre-2028 dual-readiness analysis.',
  },
  {
    icon: '⚡',
    title: 'Use "Run All" for the demo',
    body: 'Hit "Run All Analyses" in the header to trigger all 5 screens in sequence — watch the tabs turn green one by one. This is your opening 30 seconds: a single click proving the platform works end-to-end.',
  },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setVisible(true);
  }, []);

  function finish() {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
    onDone?.();
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }

  function prev() {
    setStep(s => Math.max(0, s - 1));
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={finish}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.5rem',
          padding: '2.5rem', width: '480px', maxWidth: '95vw',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column', gap: '1.5rem',
        }}
      >
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? '1.5rem' : '6px', height: '6px',
                borderRadius: '999px', transition: 'all 300ms',
                background: i === step ? '#AC00EF' : i < step ? '#AC00EF80' : '#2E2E2E',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{current.icon}</div>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h2)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem' }}>
            {current.title}
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: '#787878', lineHeight: 1.7 }}>
            {current.body}
          </p>
        </div>

        {/* Step counter */}
        <div style={{ textAlign: 'center', fontSize: 'var(--fs-micro)', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Step {step + 1} of {STEPS.length}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {step > 0 && (
            <button
              onClick={prev}
              style={{ background: 'none', border: '1px solid #2E2E2E', borderRadius: '0.25rem', color: '#555', fontSize: 'var(--fs-sm)', padding: '0.5rem 1.25rem', cursor: 'pointer' }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={next}
            className="btn-acc"
            style={{ minHeight: '2.25rem', fontSize: 'var(--fs-sm)', padding: '0 1.5rem' }}
          >
            {step < STEPS.length - 1 ? 'Next →' : 'Start the demo →'}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={finish}
          style={{ background: 'none', border: 'none', color: '#333', fontSize: 'var(--fs-micro)', cursor: 'pointer', padding: 0 }}
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
