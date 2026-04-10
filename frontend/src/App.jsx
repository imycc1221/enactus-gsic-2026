import { useState, useEffect, useRef } from 'react';
import { COMPANIES } from './data/companies.js';
import Screen1Analyze from './screens/Screen1Analyze.jsx';
import Screen2Predict from './screens/Screen2Predict.jsx';
import Screen3Map from './screens/Screen3Map.jsx';
import Screen4Sfdr from './screens/Screen4Sfdr.jsx';
import Screen5Portfolio from './screens/Screen5Portfolio.jsx';
import Screen6IcMemo    from './screens/Screen6IcMemo.jsx';
import Screen7Greenwash from './screens/Screen7Greenwash.jsx';
import Screen8Eudr      from './screens/Screen8Eudr.jsx';
import OnboardingTour   from './components/OnboardingTour.jsx';

const SCREENS = [
  { id: 'analyze',   label: 'ESG Screener',       desc: 'SASB-filtered materiality analysis' },
  { id: 'predict',   label: 'Value Predictor',     desc: 'IRR uplift financial model' },
  { id: 'sfdr',      label: 'SFDR Classifier',     desc: 'Article 6 / 8 / 9 classification' },
  { id: 'map',       label: 'Framework Mapper',    desc: '1 input — 8 regulatory outputs' },
  { id: 'portfolio',  label: 'Portfolio Dashboard', desc: 'All companies — parallel AI analysis' },
  { id: 'ic-memo',    label: 'IC Memo',             desc: 'Investment committee memorandum' },
  { id: 'greenwash',  label: 'Greenwash Detector',  desc: 'Claims vs evidence forensics' },
  { id: 'eudr',       label: 'EUDR Readiness',      desc: 'Supply chain deforestation compliance' },
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

const CUSTOM_ID = 'custom';

function CustomForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '', sector: '', geography: '', revenue: '', ebitda: '',
    employees: '', investment: '', holdPeriod: '5', exitMultiple: '10'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = {
    background: '#0D0D0D', border: '1px solid #2E2E2E', borderRadius: '0.25rem',
    color: '#fff', fontSize: '0.8125rem', padding: '0.5rem 0.75rem', width: '100%',
    fontFamily: 'Graphik, Arial, sans-serif', outline: 'none'
  };
  const labelStyle = { fontSize: '0.625rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem', display: 'block' };

  function handleSubmit(e) {
    e.preventDefault();
    const rev = parseFloat(form.revenue) * 1_000_000 || 50_000_000;
    const ebitda = parseFloat(form.ebitda) * 1_000_000 || rev * 0.15;
    const inv = parseFloat(form.investment) * 1_000_000 || rev * 0.8;
    onSubmit({
      id: CUSTOM_ID,
      name: form.name || 'Custom Company',
      shortName: form.name?.split(' ').slice(0, 2).join(' ') || 'Custom',
      sector: form.sector || 'General',
      sasbSector: form.sector || 'General Industry',
      geography: form.geography || 'Global',
      countryCode: 'un',
      revenue: rev,
      ebitda,
      employees: parseInt(form.employees) || 200,
      description: `${form.name} — ${form.sector} company operating in ${form.geography}. Custom analysis requested via ESG Value Engine.`,
      availableData: { ghgEmissions: { available: false }, workforceDiversity: { available: false }, boardGovernance: { available: false } },
      regulatoryExposure: ['CSRD', 'SFDR', 'TCFD'],
      peInvestmentContext: { investmentAmount: inv, holdingPeriod: parseInt(form.holdPeriod) || 5, targetExitMultiple: parseFloat(form.exitMultiple) || 10 }
    });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} style={{ background: '#111111', border: '1px solid #2E2E2E', borderRadius: '0.5rem', padding: '2rem', width: '520px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontFamily: 'GT Sectra Fine, Palatino, serif', fontSize: '1.25rem', fontWeight: 300, color: '#fff', marginBottom: '0.25rem' }}>Custom Company Analysis</div>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>Enter any company — Claude runs a live ESG analysis with no cached data</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} placeholder="e.g. Acme Industrials Ltd." value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Sector</label>
            <input style={inputStyle} placeholder="e.g. Healthcare, Tech, Retail" value={form.sector} onChange={e => set('sector', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Geography</label>
            <input style={inputStyle} placeholder="e.g. UK + Southeast Asia" value={form.geography} onChange={e => set('geography', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Revenue ($M)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 85" value={form.revenue} onChange={e => set('revenue', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>EBITDA ($M)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 12" value={form.ebitda} onChange={e => set('ebitda', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Employees</label>
            <input style={inputStyle} type="number" placeholder="e.g. 420" value={form.employees} onChange={e => set('employees', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>PE Investment ($M)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 72" value={form.investment} onChange={e => set('investment', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Hold Period (years)</label>
            <input style={inputStyle} type="number" placeholder="5" value={form.holdPeriod} onChange={e => set('holdPeriod', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Target Exit Multiple</label>
            <input style={inputStyle} type="number" placeholder="10" value={form.exitMultiple} onChange={e => set('exitMultiple', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button type="button" onClick={onClose} className="btn-acc-outline" style={{ minHeight: '2.25rem', fontSize: '0.8125rem', padding: '0 1rem' }}>Cancel</button>
          <button type="submit" className="btn-acc" style={{ minHeight: '2.25rem', fontSize: '0.8125rem', padding: '0 1.25rem' }}>Analyse with Claude →</button>
        </div>
      </form>
    </div>
  );
}

const ANALYSIS_SCREENS = ['analyze', 'predict', 'sfdr', 'map', 'greenwash'];

export default function App() {
  const [companyId,        setCompanyId]        = useState('greentech-mfg');
  const [screen,           setScreen]           = useState('analyze');
  const [analyzeResults,   setAnalyzeResults]   = useState(() => { try { return JSON.parse(localStorage.getItem('esg-analyze')   ?? '{}'); } catch { return {}; } });
  const [predictResults,   setPredictResults]   = useState(() => { try { return JSON.parse(localStorage.getItem('esg-predict')   ?? '{}'); } catch { return {}; } });
  const [sfdrResults,      setSfdrResults]      = useState(() => { try { return JSON.parse(localStorage.getItem('esg-sfdr')      ?? '{}'); } catch { return {}; } });
  const [mapResults,       setMapResults]       = useState(() => { try { return JSON.parse(localStorage.getItem('esg-map')       ?? '{}'); } catch { return {}; } });
  const [greenwashResults, setGreenwashResults] = useState(() => { try { return JSON.parse(localStorage.getItem('esg-greenwash') ?? '{}'); } catch { return {}; } });
  const [customCompany,    setCustomCompany]    = useState(null);
  const [showForm,         setShowForm]         = useState(false);
  const [runTriggers,      setRunTriggers]      = useState({ analyze: 0, predict: 0, sfdr: 0, map: 0, greenwash: 0 });
  const [runAllActive,     setRunAllActive]     = useState(false);
  const runAllRef = useRef(false);

  useEffect(() => { try { localStorage.setItem('esg-analyze',   JSON.stringify(analyzeResults));   } catch {} }, [analyzeResults]);
  useEffect(() => { try { localStorage.setItem('esg-predict',   JSON.stringify(predictResults));   } catch {} }, [predictResults]);
  useEffect(() => { try { localStorage.setItem('esg-sfdr',      JSON.stringify(sfdrResults));      } catch {} }, [sfdrResults]);
  useEffect(() => { try { localStorage.setItem('esg-map',       JSON.stringify(mapResults));       } catch {} }, [mapResults]);
  useEffect(() => { try { localStorage.setItem('esg-greenwash', JSON.stringify(greenwashResults)); } catch {} }, [greenwashResults]);

  const activeCompany = companyId === CUSTOM_ID ? customCompany : null;
  const activeKey     = companyId === CUSTOM_ID ? `custom-${customCompany?.name ?? ''}` : companyId;

  // ── Run All Analyses ──────────────────────────────────────────────────────
  function startRunAll() {
    runAllRef.current = true;
    setRunAllActive(true);
    setScreen('analyze');
    setRunTriggers(t => ({ ...t, analyze: t.analyze + 1 }));
  }

  function handleAnalyzeResult(r) {
    setAnalyzeResults(p => ({ ...p, [activeKey]: r }));
    if (!runAllRef.current) return;
    setScreen('predict');
    setRunTriggers(t => ({ ...t, predict: t.predict + 1 }));
  }
  function handlePredictResult(r) {
    setPredictResults(p => ({ ...p, [activeKey]: r }));
    if (!runAllRef.current) return;
    setScreen('sfdr');
    setRunTriggers(t => ({ ...t, sfdr: t.sfdr + 1 }));
  }
  function handleSfdrResult(r) {
    setSfdrResults(p => ({ ...p, [activeKey]: r }));
    if (!runAllRef.current) return;
    setScreen('map');
    setRunTriggers(t => ({ ...t, map: t.map + 1 }));
  }
  function handleMapResult(r) {
    setMapResults(p => ({ ...p, [activeKey]: r }));
    if (!runAllRef.current) return;
    setScreen('greenwash');
    setRunTriggers(t => ({ ...t, greenwash: t.greenwash + 1 }));
  }
  function handleGreenwashResult(r) {
    setGreenwashResults(p => ({ ...p, [activeKey]: r }));
    if (!runAllRef.current) return;
    runAllRef.current = false;
    setRunAllActive(false);
    setScreen('ic-memo');
  }

  function resetResults() {
    runAllRef.current = false;
    setRunAllActive(false);
    setAnalyzeResults(p   => { const n = { ...p }; delete n[activeKey]; return n; });
    setPredictResults(p   => { const n = { ...p }; delete n[activeKey]; return n; });
    setSfdrResults(p      => { const n = { ...p }; delete n[activeKey]; return n; });
    setMapResults(p       => { const n = { ...p }; delete n[activeKey]; return n; });
    setGreenwashResults(p => { const n = { ...p }; delete n[activeKey]; return n; });
  }

  // ── Workflow status per screen ────────────────────────────────────────────
  const results = {
    analyze:   analyzeResults[activeKey],
    predict:   predictResults[activeKey],
    sfdr:      sfdrResults[activeKey],
    map:       mapResults[activeKey],
    greenwash: greenwashResults[activeKey],
  };
  const doneCount = ANALYSIS_SCREENS.filter(s => results[s]).length;

  // ── Badge dot config ─────────────────────────────────────────────────────
  const BADGE_SCREENS = { analyze: 'analyze', predict: 'predict', sfdr: 'sfdr', map: 'map', greenwash: 'greenwash' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--acc-black)', color: '#fff' }}>

      <OnboardingTour />

      {showForm && (
        <CustomForm
          onClose={() => setShowForm(false)}
          onSubmit={c => { setCustomCompany(c); setCompanyId(CUSTOM_ID); setShowForm(false); }}
        />
      )}

      <button onClick={() => window.print()} className="no-print" style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50,
        background: 'linear-gradient(135deg, #7B00AC, #AC00EF)', color: '#fff', border: 'none',
        borderRadius: '0.5rem', padding: '0.75rem 1.25rem', fontSize: '0.875rem', fontWeight: 600,
        cursor: 'pointer', boxShadow: '0 0 32px rgba(172,0,239,0.35)', letterSpacing: '0.02em'
      }}>Export PDF</button>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: '72px', display: 'flex', alignItems: 'center', padding: '0 2rem',
      }}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <AccentureLogo />
            <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.0625rem', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                ESG Value Engine
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '2px' }}>
                GSIC 2026 · Enactus Hong Kong
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <button
              onClick={startRunAll}
              disabled={runAllActive}
              className="btn-acc"
              style={{ minHeight: '2.5rem', fontSize: '0.875rem', padding: '0 1.25rem', gap: '0.4rem',
                background: runAllActive ? 'rgba(172,0,239,0.15)' : undefined,
                color: runAllActive ? '#AC00EF' : '#fff',
                boxShadow: runAllActive ? 'none' : undefined,
              }}
            >
              {runAllActive ? (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#AC00EF', display: 'inline-block', animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
                  Running…
                </>
              ) : <>⚡ Run All</>}
            </button>

            {doneCount > 0 && !runAllActive && (
              <button
                onClick={resetResults}
                className="btn-acc-outline"
                style={{ minHeight: '2.5rem', fontSize: '0.875rem', padding: '0 1rem' }}
              >
                Reset
              </button>
            )}

            <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.08)' }} />

            <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Portfolio</span>
            {COMPANIES.map(c => (
              <button key={c.id} onClick={() => { setCompanyId(c.id); runAllRef.current = false; setRunAllActive(false); }}
                className={companyId === c.id ? 'btn-acc' : 'btn-acc-outline'}
                style={{ minHeight: '2.5rem', fontSize: '0.875rem', padding: '0 1rem', gap: '0.375rem' }}>
                <CountryBadge code={c.countryCode} />
                {c.shortName}
              </button>
            ))}
            <button onClick={() => setShowForm(true)}
              className={companyId === CUSTOM_ID ? 'btn-acc' : 'btn-acc-outline'}
              style={{ minHeight: '2.5rem', fontSize: '0.875rem', padding: '0 1rem' }}>
              {companyId === CUSTOM_ID && customCompany ? customCompany.shortName : '+ Custom'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: '72px', zIndex: 10,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ padding: '0 2rem', display: 'flex', overflowX: 'auto' }}>
          {SCREENS.map(s => {
            const hasResult = BADGE_SCREENS[s.id] ? !!results[BADGE_SCREENS[s.id]] : false;
            const isActive  = screen === s.id;
            return (
              <button key={s.id} onClick={() => setScreen(s.id)}
                style={{
                  padding: '0 1.25rem', height: '52px', fontSize: '0.9375rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '2px solid #AC00EF' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 250ms var(--ease-out), border-color 250ms var(--ease-out)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  whiteSpace: 'nowrap', letterSpacing: '-0.01em', flexShrink: 0,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >
                {BADGE_SCREENS[s.id] && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: hasResult ? '#00C896' : 'rgba(255,255,255,0.12)',
                    boxShadow: hasResult ? '0 0 8px #00C89680' : 'none',
                    transition: 'all 300ms',
                  }} />
                )}
                {s.label}
                {isActive && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>— {s.desc}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Workflow stepper ── */}
        {ANALYSIS_SCREENS.includes(screen) && (
          <div style={{
            padding: '0.5rem 2rem',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: 0,
          }}>
            {ANALYSIS_SCREENS.map((sid, i) => {
              const done    = !!results[sid];
              const current = screen === sid;
              const scr     = SCREENS.find(s => s.id === sid);
              return (
                <div key={sid} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setScreen(sid)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: current ? 'rgba(172,0,239,0.1)' : 'none',
                      border: 'none', cursor: 'pointer',
                      padding: '0.3rem 0.625rem', borderRadius: '999px',
                      transition: 'background 200ms',
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 700,
                      background: done ? '#00C896' : current ? '#AC00EF' : 'rgba(255,255,255,0.06)',
                      color: done || current ? '#fff' : 'rgba(255,255,255,0.3)',
                      border: `1px solid ${done ? 'rgba(0,200,150,0.4)' : current ? 'rgba(172,0,239,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: done ? '0 0 8px rgba(0,200,150,0.3)' : current ? '0 0 10px rgba(172,0,239,0.4)' : 'none',
                      transition: 'all 300ms',
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: current ? 600 : 400,
                      color: done ? '#00C896' : current ? '#fff' : 'rgba(255,255,255,0.3)',
                      letterSpacing: '-0.01em', transition: 'color 300ms',
                    }}>
                      {scr?.label}
                    </span>
                  </button>
                  {i < ANALYSIS_SCREENS.length - 1 && (
                    <div style={{
                      width: '2rem', height: '1px',
                      background: results[ANALYSIS_SCREENS[i + 1]]
                        ? 'rgba(0,200,150,0.3)'
                        : 'rgba(255,255,255,0.07)',
                      margin: '0 0.125rem',
                      transition: 'background 300ms',
                    }} />
                  )}
                </div>
              );
            })}
            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {doneCount}/{ANALYSIS_SCREENS.length} complete
            </div>
          </div>
        )}
      </nav>

      {/* ── Content ── */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        <div key={`${screen}-${activeKey}`} className="screen-enter">
          {screen === 'analyze'   && <Screen1Analyze   key={`analyze-${activeKey}`}   companyId={companyId} companyOverride={activeCompany} runTrigger={runTriggers.analyze}   onResult={handleAnalyzeResult} />}
          {screen === 'predict'   && <Screen2Predict   key={`predict-${activeKey}`}   companyId={companyId} companyOverride={activeCompany} runTrigger={runTriggers.predict}   screen1Result={analyzeResults[activeKey]} onResult={handlePredictResult} />}
          {screen === 'map'       && <Screen3Map       key={`map-${activeKey}`}       companyId={companyId} companyOverride={activeCompany} runTrigger={runTriggers.map}       screen1Result={analyzeResults[activeKey]} onResult={handleMapResult} />}
          {screen === 'sfdr'      && <Screen4Sfdr      key={`sfdr-${activeKey}`}      companyId={companyId} companyOverride={activeCompany} runTrigger={runTriggers.sfdr}      screen1Result={analyzeResults[activeKey]} onResult={handleSfdrResult} />}
          {screen === 'portfolio' && <Screen5Portfolio key="portfolio" />}
          {screen === 'ic-memo'   && <Screen6IcMemo   key={`ic-${activeKey}`}        companyId={companyId} companyOverride={activeCompany} analyzeResult={analyzeResults[activeKey]} predictResult={predictResults[activeKey]} sfdrResult={sfdrResults[activeKey]} />}
          {screen === 'greenwash' && <Screen7Greenwash key={`gw-${activeKey}`}        companyId={companyId} companyOverride={activeCompany} runTrigger={runTriggers.greenwash} screen1Result={analyzeResults[activeKey]} onResult={handleGreenwashResult} />}
          {screen === 'eudr'      && <Screen8Eudr      key={`eudr-${activeKey}`}       companyId={companyId} companyOverride={activeCompany} />}
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
