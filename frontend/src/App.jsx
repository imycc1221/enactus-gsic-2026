import { useState } from 'react';
import { COMPANIES } from './data/companies.js';
import Screen1Analyze from './screens/Screen1Analyze.jsx';
import Screen2Predict from './screens/Screen2Predict.jsx';
import Screen3Map from './screens/Screen3Map.jsx';

const SCREENS = [
  { id: 'analyze', label: 'ESG Screener',     desc: 'SASB-filtered materiality analysis' },
  { id: 'predict', label: 'Value Predictor',  desc: 'IRR uplift financial model' },
  { id: 'map',     label: 'Framework Mapper', desc: '1 input — 6 regulatory outputs' }
];

function AccentureLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span style={{ fontFamily: 'Graphik, Arial, sans-serif', fontWeight: 600, fontSize: '1.75rem', color: '#AC00EF', lineHeight: 1, letterSpacing: '-0.02em' }}>&gt;</span>
      <span style={{ fontFamily: 'Graphik, Arial, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#fff', letterSpacing: '-0.01em', textTransform: 'lowercase' }}>accenture</span>
    </div>
  );
}

function CountryBadge({ code }) {
  return (
    <img
      src={`/images/flags/${code.toLowerCase()}.png`}
      alt={code}
      style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '1px', display: 'block', flexShrink: 0 }}
    />
  );
}

export default function App() {
  const [companyId, setCompanyId] = useState('greentech-mfg');
  const [screen,    setScreen]    = useState('analyze');

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#fff' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#060606', borderBottom: '1px solid #2E2E2E', height: '80px', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <AccentureLogo />
            <div style={{ width: '1px', height: '1.5rem', background: '#2E2E2E' }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: '#fff', letterSpacing: '-0.005em' }}>ESG Value Engine</div>
              <div style={{ fontSize: '0.6875rem', color: '#787878', letterSpacing: '0.04em', marginTop: '1px' }}>GSIC 2026 · Enactus Hong Kong</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.5625rem', color: '#333333', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Portfolio</span>
            {COMPANIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCompanyId(c.id)}
                className={companyId === c.id ? 'btn-acc' : 'btn-acc-outline'}
                style={{ minHeight: '2.25rem', fontSize: '0.8125rem', padding: '0 0.875rem', gap: '0.375rem' }}
              >
                <CountryBadge code={c.countryCode} />
                {c.shortName}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: '80px', zIndex: 10, background: '#060606', borderBottom: '1px solid #2E2E2E' }}>
        <div style={{ padding: '0 2rem', display: 'flex' }}>
          {SCREENS.map(s => (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              style={{
                padding: '0 1.5rem',
                height: '52px',
                fontSize: '0.875rem',
                fontWeight: screen === s.id ? 600 : 400,
                color: screen === s.id ? '#fff' : '#555555',
                borderBottom: screen === s.id ? '2px solid #AC00EF' : '2px solid transparent',
                background: 'none',
                border: 'none',
                borderBottom: screen === s.id ? '2px solid #AC00EF' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 250ms cubic-bezier(0.25,1,0.5,1), border-color 250ms cubic-bezier(0.25,1,0.5,1)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                whiteSpace: 'nowrap', letterSpacing: '-0.005em'
              }}
              onMouseEnter={e => { if (screen !== s.id) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { if (screen !== s.id) e.currentTarget.style.color = '#787878'; }}
            >
              {s.label}
              {screen === s.id && (
                <span style={{ fontSize: '0.6875rem', color: '#444444', fontWeight: 400 }}>— {s.desc}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        <div key={`${screen}-${companyId}`} className="screen-enter">
          {screen === 'analyze' && <Screen1Analyze key={`analyze-${companyId}`} companyId={companyId} />}
          {screen === 'predict' && <Screen2Predict key={`predict-${companyId}`} companyId={companyId} />}
          {screen === 'map'     && <Screen3Map     key={`map-${companyId}`}     companyId={companyId} />}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #2E2E2E', padding: '1.5rem 2rem', marginTop: '4rem' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AccentureLogo />
            <span style={{ fontSize: '0.75rem', color: '#444444' }}>
              © 2026 Accenture. ESG Value Engine — Enactus GSIC Challenge
            </span>
          </div>
          <span style={{ fontSize: '0.6875rem', color: '#2E2E2E', letterSpacing: '0.02em' }}>
            Khan, Serafeim &amp; Yoon (2016) · BCG (2025) · EY-Parthenon · Verdantix (2024)
          </span>
        </div>
      </footer>
    </div>
  );
}
