/**
 * Screen6IcMemo — Investment Committee Memorandum
 * Synthesises ESG Screen + Value Prediction + SFDR Classification into a
 * formatted IC memo ready for LP data room. Accenture GSIC 2026 — Team Da House.
 */

import { COMPANY_MAP } from '../data/companies.js';
import { richText } from '../utils/richText.js';

const TODAY = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

function openPrintWindow(company, a, p, s, cur) {
  const verdict  = (a.overallScore ?? 0) >= 65 ? 'PROCEED' : (a.overallScore ?? 0) >= 45 ? 'MONITOR' : 'CAUTION';
  const vColor   = verdict === 'PROCEED' ? '#007A4D' : verdict === 'MONITOR' ? '#555555' : '#CC0000';
  const artColor = { 'Article 9': '#007A4D', 'Article 8': '#6600CC', 'Article 6': '#CC0000' }[s?.recommendedArticle] ?? '#555';
  const irrEsg   = Number(p?.baseCase?.projectedIrr ?? 0) + Number(p?.withEsgInterventions?.irrUplift ?? 0);
  const addVal   = p?.withEsgInterventions?.additionalValueCreated ?? 0;
  const fmtN = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 1e9) return `${cur}${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${cur}${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${cur}${(n/1e3).toFixed(0)}K`;
    return `${cur}${n}`;
  };
  const pctN = (n) => n != null ? `${Number(n).toFixed(1)}%` : '—';
  const xN   = (n) => n != null ? `${Number(n).toFixed(2)}x` : '—';

  const actionItems = (a.quickWins ?? a.recommendedActions ?? []).length > 0;

  const fwBars = Object.entries(a.frameworkGaps ?? {}).map(([fw, d]) => d ? `
    <div class="fw-row">
      <span class="fw-label">${fw.toUpperCase()}</span>
      <div class="fw-track"><div class="fw-fill" style="width:${d.percentage??0}%"></div></div>
      <span class="fw-pct">${d.percentage}%</span>
    </div>` : '').join('');

  const scoreColor = (a.overallScore ?? 0) >= 50 ? '#7B00AC' : '#CC0000';
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>IC Memo — ${company.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=EB+Garamond:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; font-size: 8.5pt; color: #1a1a1a; background: #fff; line-height: 1.4; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  /* Layout */
  .wrap { width: 210mm; min-height: 297mm; display: flex; flex-direction: column; padding: 0 32px; }

  /* ── Letterhead ── */
  .lh { display: flex; justify-content: space-between; align-items: flex-end; padding: 13px 0 9px; border-bottom: 3px solid #1a1a1a; }
  .lh-left { display: flex; flex-direction: column; gap: 2px; }
  .lh-firm { font-size: 9pt; font-weight: 700; color: #1a1a1a; letter-spacing: 0.06em; text-transform: uppercase; }
  .lh-tagline { font-size: 7.5pt; color: #888; }
  .lh-right { text-align: right; }
  .lh-doc { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #888; }
  .lh-conf { font-size: 7pt; color: #aaa; margin-top: 2px; }

  /* ── Memo header block ── */
  .memo-hdr { padding: 9px 0 9px; border-bottom: 1px solid #ddd; }
  .co-name { font-size: 18pt; font-weight: 400; color: #111; line-height: 1.1; margin-bottom: 3px; font-family: 'EB Garamond', Georgia, serif; letter-spacing: -0.01em; }
  .co-sub { font-size: 7.5pt; color: #888; margin-bottom: 8px; }
  .memo-fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; border: 1px solid #e0e0e0; }
  .mf { display: flex; padding: 3px 10px; border-bottom: 1px solid #e8e8e8; border-right: 1px solid #e8e8e8; }
  .mf:nth-child(2n) { border-right: none; }
  .mf:nth-last-child(-n+2) { border-bottom: none; }
  .mfl { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; width: 56px; flex-shrink: 0; padding-top: 1px; }
  .mfv { font-size: 7.5pt; color: #333; }

  /* ── IC Recommendation box ── */
  .rec { margin: 9px 0; display: grid; grid-template-columns: 150px 1fr; border: 1px solid #ddd; }
  .rec-left { padding: 10px 14px; border-right: 1px solid #ddd; background: #fafafa; }
  .rec-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #999; margin-bottom: 4px; }
  .rec-verdict { font-size: 16pt; font-weight: 700; color: ${vColor}; line-height: 1; border-left: 4px solid ${vColor}; padding-left: 8px; }
  .rec-sub { font-size: 7pt; color: #888; margin-top: 4px; line-height: 1.35; }
  .rec-right { padding: 10px 14px; font-size: 7.5pt; color: #444; line-height: 1.6; }

  /* ── Section heading ── */
  .sec { margin-top: 9px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
  .sec-line { flex: 1; height: 1px; background: #e0e0e0; }
  .sec-title { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.13em; color: #1a1a1a; white-space: nowrap; }

  /* ── Data table ── */
  .dtable { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
  .dtable th { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; text-align: left; padding: 3px 8px; border-bottom: 2px solid #e0e0e0; background: #f9f9f9; }
  .dtable td { padding: 4px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; color: #333; line-height: 1.35; }
  .dtable tr:last-child td { border-bottom: none; }

  /* ── KPI strip ── */
  .kpis { display: grid; grid-template-columns: repeat(5,1fr); border: 1px solid #e0e0e0; margin-bottom: 0; }
  .kpi { padding: 6px 8px; text-align: center; border-right: 1px solid #e8e8e8; }
  .kpi:last-child { border-right: none; }
  .kpi-v { font-size: 11pt; font-weight: 700; line-height: 1; display: block; }
  .kpi-l { font-size: 5.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #bbb; display: block; margin-top: 2px; }

  /* ── Pill badges ── */
  .pill { display: inline-block; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 1px 6px; border-radius: 2px; }
  .pill-hi  { background: #CC000012; color: #CC0000; border: 1px solid #CC000030; }
  .pill-med { background: #CC660012; color: #CC6600; border: 1px solid #CC660030; }
  .pill-ok  { background: #007A4D12; color: #007A4D; border: 1px solid #007A4D30; }
  .pill-art { background: ${artColor}12; color: ${artColor}; border: 1px solid ${artColor}35; }

  /* ── Body columns ── */
  .cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

  /* ── Score bar (inline) ── */
  .sbar { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  .sbar-lbl { font-size: 7pt; color: #555; width: 84px; flex-shrink: 0; }
  .sbar-track { flex: 1; height: 3px; background: #e8e8e8; border-radius: 2px; }
  .sbar-fill { height: 100%; border-radius: 2px; }
  .sbar-num { font-size: 7pt; font-weight: 600; color: #333; width: 22px; text-align: right; flex-shrink: 0; }

  /* ── Action items ── */
  .act { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
  .act:last-child { border-bottom: none; }
  .act-num { font-size: 6.5pt; font-weight: 700; color: #888; background: #f0f0f0; border-radius: 2px; padding: 1px 5px; height: fit-content; flex-shrink: 0; margin-top: 1px; }
  .act-txt { font-size: 7.5pt; color: #333; line-height: 1.5; }

  /* ── Disclaimer ── */
  .disc { margin-top: 9px; padding: 6px 10px; border: 1px solid #f0d0d0; background: #fffafa; font-size: 6.5pt; color: #888; line-height: 1.5; }
  .disc strong { color: #AA0000; }

  /* ── Signature row ── */
  .sigs { display: flex; gap: 0; margin-top: auto; padding-top: 28px; }
  .sig { flex: 1; padding-right: 20px; }
  .sig-line { height: 22px; border-bottom: 1px solid #bbb; margin-bottom: 3px; }
  .sig-role { font-size: 7pt; font-weight: 600; color: #444; }
  .sig-note { font-size: 6pt; color: #aaa; margin-top: 1px; }

  /* ── Footer ── */
  .foot { margin-top: 12px; padding: 7px 0 10px; border-top: 2px solid #1a1a1a; display: flex; justify-content: space-between; font-size: 6pt; color: #aaa; }
</style>
</head>
<body>
<div class="wrap">

<!-- Letterhead -->
<div class="lh">
  <div class="lh-left">
    <div class="lh-firm">Accenture &nbsp;·&nbsp; ESG Value Engine</div>
    <div class="lh-tagline">Enactus GSIC 2026 &nbsp;·&nbsp; Team Da House</div>
  </div>
  <div class="lh-right">
    <div class="lh-doc">Investment Committee Memorandum</div>
    <div class="lh-conf">RESTRICTED &nbsp;·&nbsp; For IC Use Only &nbsp;·&nbsp; ${TODAY}</div>
  </div>
</div>

<!-- Memo header -->
<div class="memo-hdr">
  <div class="co-name">${company.name}</div>
  <div class="co-sub">${company.sasbSector} &nbsp;·&nbsp; ${company.geography} &nbsp;·&nbsp; ${fmtN(company.revenue)} revenue &nbsp;·&nbsp; Proposed hold: ${company.peInvestmentContext?.holdingPeriod ?? '—'} years</div>
  <div class="memo-fields">
    <div class="mf"><span class="mfl">To</span><span class="mfv">Investment Committee</span></div>
    <div class="mf"><span class="mfl">Date</span><span class="mfv">${TODAY}</span></div>
    <div class="mf"><span class="mfl">From</span><span class="mfv">ESG Value Engine — AI Analysis</span></div>
    <div class="mf"><span class="mfl">Class</span><span class="mfv">Restricted — IC Use Only</span></div>
    <div class="mf"><span class="mfl">Re</span><span class="mfv">${company.name} — ESG Due Diligence</span></div>
    <div class="mf"><span class="mfl">Fund</span><span class="mfv">Accenture PE Portfolio</span></div>
  </div>
</div>

<!-- IC Recommendation -->
<div class="rec">
  <div class="rec-left">
    <div class="rec-label">IC Recommendation</div>
    <div class="rec-verdict">${verdict}</div>
    <div class="rec-sub">${verdict==='PROCEED'?'Strong ESG profile. Proceed to full due diligence.':verdict==='MONITOR'?'Moderate ESG profile. Conditional on action plan delivery.':'Material ESG risks identified. Further review required before proceeding.'}</div>
  </div>
  <div class="rec-right">${(s?.lpNarrative ?? `${company.name} demonstrates an ESG materiality score of ${a.overallScore??'—'}/100 under SASB classification. ESG interventions are projected to deliver +${pctN(p?.withEsgInterventions?.irrUplift)} IRR uplift and ${fmtN(addVal)} in additional equity value over the holding period.`).substring(0, 420)}</div>
</div>

<!-- KPI strip -->
<div class="kpis">
  <div class="kpi"><span class="kpi-v" style="color:${scoreColor}">${a.overallScore != null ? a.overallScore+'/100' : '—'}</span><span class="kpi-l">ESG Score</span></div>
  <div class="kpi"><span class="kpi-v" style="color:${artColor}">${s?.recommendedArticle ?? '—'}</span><span class="kpi-l">SFDR Class</span></div>
  <div class="kpi"><span class="kpi-v">${fmtN(company.peInvestmentContext?.investmentAmount)}</span><span class="kpi-l">Investment</span></div>
  <div class="kpi"><span class="kpi-v" style="color:#007A4D">${p?.withEsgInterventions ? '+'+pctN(p.withEsgInterventions.irrUplift) : '—'}</span><span class="kpi-l">IRR Uplift</span></div>
  <div class="kpi"><span class="kpi-v" style="color:#2255AA">${addVal ? fmtN(addVal) : '—'}</span><span class="kpi-l">Value Added</span></div>
</div>

<!-- ESG Materiality + Financial Value -->
<div class="cols2" style="margin-top:9px">

  <!-- Left: ESG scores + risks -->
  <div>
    <div class="sec"><span class="sec-title">ESG Materiality</span><div class="sec-line"></div></div>
    ${[['Overall', a.overallScore], ['Environmental', a.pillarScores?.environmental], ['Social', a.pillarScores?.social], ['Governance', a.pillarScores?.governance]].filter(([,v])=>v!=null).map(([l,v])=>`
    <div class="sbar">
      <span class="sbar-lbl">${l}</span>
      <div class="sbar-track"><div class="sbar-fill" style="width:${v}%;background:${v>=50?'#2255AA':'#CC0000'}"></div></div>
      <span class="sbar-num">${v}</span>
    </div>`).join('')}

    <div class="sec" style="margin-top:12px"><span class="sec-title">Key Risk Flags</span><div class="sec-line"></div></div>
    <table class="dtable">
      <thead><tr><th>Severity</th><th>Risk Area</th></tr></thead>
      <tbody>
        ${(a.riskFlags??[]).slice(0,3).map(r=>`
        <tr>
          <td><span class="pill pill-${r.severity==='high'?'hi':'med'}">${r.severity}</span></td>
          <td>${(r.area??'').substring(0,55)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Right: Financial model + opps -->
  <div>
    <div class="sec"><span class="sec-title">Financial Value Creation</span><div class="sec-line"></div></div>
    ${p?.baseCase ? `
    <table class="dtable">
      <thead><tr><th>Metric</th><th>Base Case</th><th>ESG-Enhanced</th></tr></thead>
      <tbody>
        <tr><td>Projected IRR</td><td style="color:#888;font-weight:600">${pctN(p.baseCase?.projectedIrr)}</td><td style="color:#2255AA;font-weight:700">${pctN(irrEsg)}</td></tr>
        <tr><td>Exit Multiple</td><td style="color:#888;font-weight:600">${xN(p.baseCase?.exitMultiple)}</td><td style="color:#2255AA;font-weight:700">${xN(p.withEsgInterventions?.exitMultiple)}</td></tr>
        <tr><td>IRR Uplift</td><td colspan="2" style="color:#007A4D;font-weight:700">+${pctN(p.withEsgInterventions?.irrUplift)} &nbsp;·&nbsp; ${fmtN(addVal)} additional equity value</td></tr>
      </tbody>
    </table>` : '<div style="color:#aaa;font-size:7.5pt;padding:8px 0">Value model not yet run.</div>'}

    <div class="sec" style="margin-top:12px"><span class="sec-title">Value Opportunities</span><div class="sec-line"></div></div>
    <table class="dtable">
      <thead><tr><th>Annual Savings</th><th>Initiative</th></tr></thead>
      <tbody>
        ${(a.valueOpportunities??[]).slice(0,2).map(v=>{
          const sv=(v.estimatedAnnualSavings??v.ebitdaImpact??'').match(/^[~$€£]?[\d.,]+[KMBkmb]?(?:\/\w+)?/)?.[0]??'—';
          const init=(v.initiative??v.area??'').substring(0,38);
          return `<tr><td style="color:#007A4D;font-weight:700;white-space:nowrap">${sv}</td><td>${init}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- SFDR + Action Plan -->
<div class="cols2" style="margin-top:2px">

  <!-- SFDR -->
  <div>
    <div class="sec"><span class="sec-title">SFDR Regulatory Classification</span><div class="sec-line"></div></div>
    ${s?.recommendedArticle ? `
    <table class="dtable">
      <thead><tr><th>Classification</th><th>Factor</th><th>Status</th></tr></thead>
      <tbody>
        <tr>
          <td rowspan="${(s.qualifyingFactors??[]).slice(0,3).length}" style="vertical-align:middle">
            <span class="pill pill-art" style="font-size:9pt;padding:3px 10px">${s.recommendedArticle}</span>
          </td>
          ${(()=>{const rows=(s.qualifyingFactors??[]).slice(0,3);const first=rows[0];if(!first)return'<td colspan="2">—</td>';const fc=first.status==='met'?'#007A4D':first.status==='partial'?'#888':'#CC0000';return `<td>${(first.factor??'').substring(0,36)}</td><td style="color:${fc};font-weight:700">${(first.status??'').replace('_',' ').toUpperCase()}</td>`;})()}
        </tr>
        ${(s.qualifyingFactors??[]).slice(1,3).map(f=>{const fc=f.status==='met'?'#007A4D':f.status==='partial'?'#888':'#CC0000';return `<tr><td>${(f.factor??'').substring(0,36)}</td><td style="color:${fc};font-weight:700">${(f.status??'').replace('_',' ').toUpperCase()}</td></tr>`;}).join('')}
        ${s.upgradePath?.nextArticle?`<tr><td colspan="3" style="color:#007A4D;font-size:7.5pt"><strong>Upgrade path:</strong> ${s.upgradePath.nextArticle} achievable in ${s.upgradePath.estimatedTimeToUpgrade}</td></tr>`:''}
      </tbody>
    </table>` : '<div style="color:#aaa;font-size:7.5pt;padding:8px 0">SFDR not yet classified.</div>'}
  </div>

  <!-- Action Plan -->
  <div>
    <div class="sec"><span class="sec-title">Recommended ESG Action Plan</span><div class="sec-line"></div></div>
    ${(a.quickWins??a.recommendedActions??[]).slice(0,3).map((qw,i)=>`
    <div class="act">
      <span class="act-num">Q${i+1}</span>
      <span class="act-txt">${(qw.action??qw.title??String(qw)).substring(0,140)}</span>
    </div>`).join('')}
  </div>
</div>

<!-- Disclaimer -->
<div class="disc">
  <strong>⚠ Analyst Certification Required — Accenture Responsible AI:</strong> This memorandum was generated by an AI system (Claude Sonnet 4.6, tool_choice: forced). Financial figures are model estimates requiring CFO sign-off. Regulatory references are based on training data — verify against live regulation text before LP use. <strong>Human analyst review is mandatory before any investor-facing distribution.</strong>
</div>

<!-- Signatures -->
<div class="sigs">
  ${['ESG Lead Analyst|Materiality &amp; Risk Review','CFO Sign-Off|Financial Figures Verified','Legal Review|Regulatory References Checked'].map(s=>{
    const [role,note]=s.split('|');
    return `<div class="sig"><div class="sig-line"></div><div class="sig-role">${role}</div><div class="sig-note">${note}</div></div>`;
  }).join('')}
</div>

<!-- Footer -->
<div class="foot">
  <span>ESG Value Engine &nbsp;·&nbsp; Accenture &nbsp;·&nbsp; Enactus GSIC 2026</span>
  <span>Methodology: SASB · BCG ESG Alpha · EY-Parthenon · Khan, Serafeim &amp; Yoon (2016)</span>
  <span>${TODAY}</span>
</div>

</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank', 'width=900,height=700');
}

function fmt(n, currency = '€') {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `${currency}${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${currency}${(n / 1_000).toFixed(0)}K`;
  return `${currency}${n}`;
}
function pct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function x(n)   { return n != null ? `${Number(n).toFixed(2)}x` : '—'; }

function scoreColor(s) { return s >= 50 ? '#AC00EF' : '#FF4444'; }

function Divider() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #9764ff50, #2bb1f240, transparent)', margin: '2rem 0' }} />;
}

function SectionHeader({ num, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '4px',
        background: 'linear-gradient(135deg, #9764ff44, #2bb1f222)',
        border: '1px solid #9764ff55',
        boxShadow: '0 0 12px #9764ff30',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#bea1ff' }}>{num}</span>
      </div>
      <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: '#e8e8ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {children}
      </span>
    </div>
  );
}

function MetricCard({ label, value, sub, color = '#fff', large = false }) {
  const glowHex = color === '#AC00EF' ? '#9764ff' : color === '#00C896' ? '#00C896' : color === '#787878' ? '#444' : color;
  const gradStart = color === '#AC00EF' ? '#1a0030' : color === '#00C896' ? '#001a10' : '#0a0a0a';
  return (
    <div style={{
      padding: '1.25rem',
      background: large ? `linear-gradient(135deg, ${gradStart} 0%, #0d0d0d 65%)` : '#0f0f0f',
      border: `1px solid ${large ? `${glowHex}40` : '#1E1E1E'}`,
      borderRadius: '0.375rem',
      boxShadow: large ? `0 0 28px ${glowHex}22, inset 0 0 0 1px ${glowHex}10` : 'none',
    }}>
      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: large ? '2rem' : 'var(--fs-h2)', fontWeight: 700, color, lineHeight: 1, marginBottom: sub ? '0.375rem' : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--fs-label)', color: '#444' }}>{sub}</div>}
    </div>
  );
}

function StatusPending({ agents }) {
  return (
    <div style={{ border: '1px dashed #2E2E2E', borderRadius: '0.5rem', padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 'var(--fs-h1)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem' }}>
        Investment Committee Memo
      </div>
      <p style={{ fontSize: 'var(--fs-sm)', color: '#555', marginBottom: '2rem' }}>
        Run the agents below to populate the memo. Results are combined automatically.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        {agents.map(({ label, done, tab }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: done ? '#00C896' : '#1E1E1E',
              border: `1px solid ${done ? '#00C896' : '#2E2E2E'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {done && <span style={{ fontSize: 10, color: '#000', fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 'var(--fs-sm)', color: done ? '#00C896' : '#555' }}>
              {label}{!done && <span style={{ color: '#333' }}> — run "{tab}"</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Screen6IcMemo({ companyId, companyOverride, analyzeResult, predictResult, sfdrResult }) {
  const company = companyOverride ?? COMPANY_MAP[companyId];
  const cur = company.currency ?? '€';
  const hasAll = analyzeResult && predictResult && sfdrResult;
  const hasAny = analyzeResult || predictResult || sfdrResult;

  const agentStatus = [
    { label: 'ESG Screener (Agent 1)',    done: !!analyzeResult, tab: 'ESG Screener' },
    { label: 'Value Predictor (Agent 2)', done: !!predictResult, tab: 'Value Predictor' },
    { label: 'SFDR Classifier (Agent 3)', done: !!sfdrResult,    tab: 'SFDR Classifier' },
  ];

  if (!hasAny) return (
    <div>
      <div style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#0A0A0A', border: '1px solid #AC00EF22', borderRadius: '0.25rem' }}>
        <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: 'var(--fs-h1)', color: '#fff', marginBottom: '0.25rem' }}>IC Memorandum</h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>Investment Committee · Accenture ESG Value Engine · {company.name}</p>
      </div>
      <StatusPending agents={agentStatus} />
    </div>
  );

  const a = analyzeResult ?? {};
  const p = predictResult ?? {};
  const s = sfdrResult ?? {};

  const verdict  = a.overallScore >= 65 ? 'PROCEED' : a.overallScore >= 45 ? 'MONITOR' : 'CAUTION';
  const vColor   = verdict === 'PROCEED' ? '#00C896' : verdict === 'MONITOR' ? '#888888' : '#FF4444';
  const artColor = { 'Article 9': '#00C896', 'Article 8': '#AC00EF', 'Article 6': '#FF4444' }[s.recommendedArticle] ?? '#888888';
  const irrEsg   = Number(p.baseCase?.projectedIrr ?? 0) + Number(p.withEsgInterventions?.irrUplift ?? 0);
  const addVal   = p.withEsgInterventions?.additionalValueCreated ?? 0;

  return (
    <div>
      {/* Header banner */}
      <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #0e0816 0%, #070710 50%, #080808 100%)', border: '1px solid #9764ff28', boxShadow: '0 0 60px #9764ff12, 0 0 120px #2bb1f208' }}>
        {/* Harness-style gradient top stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #FF99C9, #926EF7 50%, #6EEEF7)' }} />
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#bea1ff', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.625rem' }}>
              Investment Committee Memorandum · Confidential
            </div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontWeight: 300, fontSize: '2rem', color: '#fff', marginBottom: '0.375rem', letterSpacing: '-0.01em' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: 'var(--fs-body)', color: '#787878' }}>
              {company.sasbSector} · {company.geography} · {fmt(company.revenue, cur)} revenue
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, alignItems: 'center' }}>
            {!hasAll && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: '#88888815', border: '1px solid #44444440', borderRadius: '999px', padding: '0.3rem 0.875rem', fontSize: 'var(--fs-label)', color: '#888' }}>
                Partial — {agentStatus.filter(a => a.done).length}/3 agents run
              </div>
            )}
            <button onClick={() => openPrintWindow(company, a, p, s, cur)} className="btn-acc no-print" style={{ fontSize: 'var(--fs-sm)', padding: '0.625rem 1.25rem' }}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Memo body */}
      <div style={{ background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: '0.5rem', padding: '2.5rem' }}>

        {/* ── Memo meta + Deal Snapshot ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>

          {/* Left: memo details */}
          <div>
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Memorandum Details</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'TO',    val: 'Investment Committee' },
                  { label: 'FROM',  val: 'ESG Value Engine — AI Analysis' },
                  { label: 'DATE',  val: TODAY },
                  { label: 'RE',    val: company.name },
                  { label: 'FUND',  val: 'Accenture PE Portfolio' },
                  { label: 'CLASS', val: 'RESTRICTED · For IC Use Only' },
                ].map(({ label, val }) => (
                  <tr key={label} style={{ borderBottom: '1px solid #1a1a2e' }}>
                    <td style={{ padding: '0.6rem 0', fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', width: '4.5rem', verticalAlign: 'top', paddingRight: '1rem' }}>{label}</td>
                    <td style={{ padding: '0.6rem 0', fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.4 }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: Deal snapshot */}
          <div>
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Deal Snapshot</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Investment',  val: fmt(company.peInvestmentContext?.investmentAmount, cur),                      color: '#73dfe7', glow: '#0095f7', grad: '#001830' },
                { label: 'Hold Period', val: `${company.peInvestmentContext?.holdingPeriod ?? '—'} years`,                color: '#73dfe7', glow: '#0095f7', grad: '#001830' },
                { label: 'ESG Score',   val: a.overallScore != null ? `${a.overallScore}/100` : '—',                      color: scoreColor(a.overallScore ?? 0), glow: '#9764ff', grad: '#1a0030' },
                { label: 'SFDR',        val: s.recommendedArticle ?? '—',                                                  color: artColor, glow: artColor, grad: '#001a10' },
                { label: 'IRR Uplift',  val: p.withEsgInterventions ? `+${pct(p.withEsgInterventions.irrUplift)}` : '—', color: '#bea1ff', glow: '#9764ff', grad: '#1a0035' },
                { label: 'Value Added', val: addVal ? fmt(addVal, cur) : '—',                                              color: '#00C896', glow: '#00C896', grad: '#001a10' },
              ].map(({ label, val, color, glow, grad }) => (
                <div key={label} style={{ padding: '1rem 1.125rem', background: `linear-gradient(135deg, ${grad} 0%, #0d0d0d 70%)`, border: `1px solid ${glow}30`, borderRadius: '0.375rem', boxShadow: `0 0 20px ${glow}18` }}>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: `${glow}88`, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>{label}</div>
                  <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* ── IC Recommendation ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', marginBottom: '2rem', padding: '1.75rem', background: `linear-gradient(135deg, ${vColor}14 0%, #0a0a0f 60%)`, border: `1px solid ${vColor}35`, borderRadius: '0.5rem', alignItems: 'start', boxShadow: `0 0 40px ${vColor}18` }}>
          <div style={{ minWidth: '10rem' }}>
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: `${vColor}88`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.625rem' }}>IC Recommendation</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: vColor, lineHeight: 1, letterSpacing: '-0.02em' }}>{verdict}</div>
            <div style={{ fontSize: 'var(--fs-sm)', color: `${vColor}88`, marginTop: '0.5rem', lineHeight: 1.4 }}>
              {verdict === 'PROCEED' ? 'Strong ESG profile — proceed to due diligence' :
               verdict === 'MONITOR' ? 'Moderate ESG profile — conditional on action plan' :
               'Material ESG risks — further review required'}
            </div>
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.8, paddingTop: '0.25rem' }}
            dangerouslySetInnerHTML={{ __html: richText(
              s.lpNarrative ?? (a.overallScore != null
                ? `${company.name} demonstrates an ESG materiality score of ${a.overallScore}/100 under SASB-${company.sasbSector} classification.` +
                  (a.overallScore >= 65
                    ? ` The company presents a credible ESG improvement trajectory with ${a.valueOpportunities?.length ?? 0} quantified value opportunities, supporting a ${s.recommendedArticle ?? 'Article 8'} SFDR designation.`
                    : ` Material gaps in ${a.riskFlags?.find(r => r.severity === 'high')?.area ?? 'key ESG areas'} require prioritised remediation before LP close.`) +
                  (p.withEsgInterventions?.irrUplift != null ? ` ESG interventions are projected to generate +${pct(p.withEsgInterventions.irrUplift)} IRR uplift and ${fmt(addVal, cur)} in additional equity value over the holding period.` : '')
                : 'Run the ESG Screener to generate the executive narrative.')
            )}}
          />
        </div>

        <Divider />

        {/* ── Section 01: ESG Analysis ── */}
        {analyzeResult && (
          <>
            <SectionHeader num="01">ESG Materiality Analysis</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

              {/* Scores */}
              <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #1a0030 0%, #0d0d0d 60%)', border: '1px solid #9764ff30', borderRadius: '0.5rem', boxShadow: '0 0 32px #9764ff15' }}>
                <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Pillar Scores</div>
                {[
                  { label: 'Overall',       val: a.overallScore },
                  { label: 'Environmental', val: a.pillarScores?.environmental },
                  { label: 'Social',        val: a.pillarScores?.social },
                  { label: 'Governance',    val: a.pillarScores?.governance },
                ].map(({ label, val }) => val != null ? (
                  <div key={label} style={{ marginBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>{label}</span>
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: scoreColor(val) }}>{val}/100</span>
                    </div>
                    <div style={{ height: 4, background: '#1a1a2e', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${val}%`, background: `linear-gradient(90deg, ${scoreColor(val)}, #6EEEF7)`, borderRadius: 2, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${scoreColor(val)}60` }} />
                    </div>
                  </div>
                ) : null)}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1E1E1E' }}>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>SASB Classification</div>
                  <div style={{ fontSize: 'var(--fs-label)', color: '#bea1ff', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: richText(a.sasbClassification ?? '—') }} />
                </div>
              </div>

              {/* Risks + Opportunities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #1a0010 0%, #0d0d0d 60%)', border: '1px solid #ff444428', borderRadius: '0.5rem', flex: 1, boxShadow: '0 0 24px #ff444412' }}>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#ff666688', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Key Risk Flags</div>
                  {(a.riskFlags ?? []).slice(0, 4).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.625rem', alignItems: 'flex-start' }}>
                      <span style={{
                        fontSize: 'var(--fs-label)', fontWeight: 700,
                        color: r.severity === 'high' ? '#FF4444' : '#AC00EF',
                        textTransform: 'uppercase', flexShrink: 0, marginTop: '0.05rem', width: '3rem'
                      }}>{r.severity}</span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: '#787878', lineHeight: 1.5 }}>{r.area}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #001a10 0%, #0d0d0d 60%)', border: '1px solid #00C89628', borderRadius: '0.5rem', flex: 1, boxShadow: '0 0 24px #00C89612' }}>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#00C89688', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Value Opportunities</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '12rem 1fr', gap: '0.5rem 1rem' }}>
                    {(a.valueOpportunities ?? []).slice(0, 3).map((v, i) => (
                      <>
                        <span key={`val-${i}`} style={{ fontSize: 'var(--fs-sm)', color: '#00C896', fontWeight: 700, lineHeight: 1.5 }}>{v.estimatedAnnualSavings ?? v.ebitdaImpact ?? '—'}</span>
                        <span key={`txt-${i}`} style={{ fontSize: 'var(--fs-sm)', color: '#a0a0b8', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: richText(v.initiative ?? v.area ?? '—') }} />
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Framework compliance */}
            {a.frameworkGaps && Object.keys(a.frameworkGaps).length > 0 && (
              <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #001428 0%, #0a0a0f 60%)', border: '1px solid #2bb1f228', borderRadius: '0.5rem', marginBottom: '1.5rem', boxShadow: '0 0 24px #2bb1f212' }}>
                <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#2bb1f288', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Framework Compliance</div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  {Object.entries(a.frameworkGaps).map(([fw, d]) => d ? (
                    <div key={fw} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '7rem' }}>
                      <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#555', textTransform: 'uppercase', width: '3rem' }}>{fw}</span>
                      <div style={{ flex: 1, height: 4, background: '#1a1a2e', borderRadius: 2, minWidth: '5rem' }}>
                        <div style={{ height: '100%', width: `${d.percentage ?? 0}%`, background: 'linear-gradient(90deg, #9764ff, #73dfe7)', borderRadius: 2, boxShadow: '0 0 8px #9764ff50' }} />
                      </div>
                      <span style={{ fontSize: 'var(--fs-sm)', color: '#787878', fontWeight: 600 }}>{d.percentage}%</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}
            <Divider />
          </>
        )}

        {/* ── Section 02: Financial Value Creation ── */}
        {predictResult && (
          <>
            <SectionHeader num="02">Financial Value Creation Model</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <MetricCard label="Base Case IRR"     value={pct(p.baseCase?.projectedIrr)}                  sub="compliance-only ESG"     color="#787878" />
              <MetricCard label="ESG-Enhanced IRR"  value={pct(irrEsg)}                                     sub="with ESG interventions"  color="#AC00EF" large />
              <MetricCard label="IRR Uplift"         value={`+${pct(p.withEsgInterventions?.irrUplift)}`}   sub="ESG alpha vs base case"  color="#AC00EF" large />
              <MetricCard label="Base Exit Multiple" value={x(p.baseCase?.exitMultiple)}                    sub="compliance-only"         color="#787878" />
              <MetricCard label="ESG Exit Multiple"  value={x(p.withEsgInterventions?.exitMultiple)}        sub="with interventions"      color="#AC00EF" />
              <MetricCard label="Additional Value"   value={fmt(addVal, cur)}                               sub="vs base case at exit"    color="#00C896" large />
            </div>

            {p.withEsgInterventions?.keyInitiatives?.length > 0 && (
              <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #1a0030 0%, #0a0a0f 60%)', border: '1px solid #9764ff28', borderRadius: '0.5rem', marginBottom: '1.5rem', boxShadow: '0 0 24px #9764ff12' }}>
                <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#9764ff88', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Key ESG Initiatives</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {p.withEsgInterventions.keyInitiatives.slice(0, 5).map((init, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '0.625rem', borderBottom: '1px solid #1a1a2e' }}>
                      <span style={{ color: '#AC00EF', fontWeight: 700, fontSize: 'var(--fs-sm)', flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: '#a0a0b8', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: richText(init.initiative ?? init.description ?? String(init)) }} />
                      {init.irrContribution != null && (
                        <span style={{ color: '#AC00EF', fontWeight: 700, fontSize: 'var(--fs-sm)', flexShrink: 0 }}>+{pct(init.irrContribution)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Divider />
          </>
        )}

        {/* ── Section 03: SFDR ── */}
        {sfdrResult && (
          <>
            <SectionHeader num="03">SFDR Regulatory Classification</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', marginBottom: '1.5rem', alignItems: 'start' }}>
              <div style={{ padding: '1.75rem 2.25rem', background: `linear-gradient(135deg, ${artColor}18 0%, #0a0a0f 70%)`, border: `1px solid ${artColor}40`, borderRadius: '0.5rem', textAlign: 'center', minWidth: '9rem', boxShadow: `0 0 32px ${artColor}20` }}>
                <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: `${artColor}88`, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Classification</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: artColor, lineHeight: 1 }}>Art.</div>
                <div style={{ fontSize: '3.5rem', fontWeight: 700, color: artColor, lineHeight: 1.1 }}>
                  {s.recommendedArticle?.replace('Article ', '') ?? '—'}
                </div>
                <div style={{ fontSize: 'var(--fs-label)', color: `${artColor}88`, marginTop: '0.5rem' }}>
                  {s.recommendedArticle === 'Article 9' ? 'Sustainable Objective' : s.recommendedArticle === 'Article 8' ? 'Promotes E/S Chars.' : 'No ESG Claim'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(s.qualifyingFactors ?? []).slice(0, 5).map((f, i) => {
                  const fc  = f.status === 'met' ? '#00C896' : f.status === 'partial' ? '#888888' : '#FF4444';
                  const sym = f.status === 'met' ? '✓' : f.status === 'partial' ? '◐' : '✗';
                  return (
                    <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', padding: '0.625rem 0', borderBottom: '1px solid #111' }}>
                      <span style={{ color: fc, fontWeight: 700, fontSize: 'var(--fs-body)', flexShrink: 0 }}>{sym}</span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: '#a0a0b8', flex: 1, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: richText(f.factor) }} />
                      <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: fc, textTransform: 'uppercase', flexShrink: 0 }}>{f.status?.replace('_', ' ')}</span>
                    </div>
                  );
                })}
                {s.upgradePath?.nextArticle && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: '#00C89608', border: '1px solid #00C89620', borderRadius: '0.25rem' }}>
                    <span style={{ fontSize: 'var(--fs-sm)', color: '#00C896', fontWeight: 700 }}>Upgrade path: </span>
                    <span style={{ fontSize: 'var(--fs-sm)', color: '#787878' }}>
                      {s.upgradePath.nextArticle} achievable in {s.upgradePath.estimatedTimeToUpgrade} — {s.upgradePath.keyActions?.[0] ?? 'see SFDR tab'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {s.regulatoryRisk && (
              <div style={{ padding: '1rem 1.25rem', background: '#FF444408', border: '1px solid #FF444433', borderRadius: '0.25rem', marginBottom: '1.5rem', fontSize: 'var(--fs-sm)', color: '#a0a0b8', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: '<strong style="color:#FF6666;font-weight:700">Regulatory risk: </strong>' + richText(s.regulatoryRisk) }}
              />
            )}
            <Divider />
          </>
        )}

        {/* ── Section 04: ESG Action Plan ── */}
        {analyzeResult && (a.quickWins ?? a.recommendedActions)?.length > 0 && (
          <>
            <SectionHeader num="04">Recommended ESG Action Plan</SectionHeader>
            {(() => {
              const actionColors = ['#9764ff', '#2bb1f2', '#01c9cc', '#00C896', '#bea1ff'];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                  {(a.quickWins ?? a.recommendedActions ?? []).slice(0, 5).map((qw, i) => {
                    const ac = actionColors[i % actionColors.length];
                    return (
                      <div key={i} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', padding: '1.125rem 1.25rem', background: `linear-gradient(135deg, ${ac}10 0%, #0a0a0f 60%)`, border: `1px solid ${ac}28`, borderRadius: '0.5rem', borderLeft: `3px solid ${ac}`, boxShadow: `0 0 20px ${ac}12` }}>
                        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: ac, flexShrink: 0 }}>Q{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--fs-sm)', color: '#c8c8c4', lineHeight: 1.65 }}
                            dangerouslySetInnerHTML={{ __html: richText(qw.action ?? qw.title ?? String(qw)) }}
                          />
                          {(qw.timeframe || qw.ebitdaImpact) && (
                            <div style={{ marginTop: '0.375rem', display: 'flex', gap: '1rem' }}>
                              {qw.timeframe    && <span style={{ fontSize: 'var(--fs-label)', color: '#444' }}>{qw.timeframe}</span>}
                              {qw.ebitdaImpact && <span style={{ fontSize: 'var(--fs-label)', color: '#00C896', fontWeight: 600 }}>{fmt(qw.ebitdaImpact, cur)} EBITDA impact</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <Divider />
          </>
        )}

        {/* ── Analyst certification ── */}
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #1a0808 0%, #0a0a0f 60%)', border: '1px solid #FF444428', borderRadius: '0.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', boxShadow: '0 0 32px #FF444412' }}>
          <div style={{ fontSize: '1.5rem', color: '#FF4444', flexShrink: 0, lineHeight: 1 }}>⚠</div>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#FF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
              Analyst Certification Required — Accenture Responsible AI
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', color: '#787878', lineHeight: 1.75 }}>
              This memorandum was generated by an AI system (Claude Sonnet 4.6, tool_choice: forced). Financial figures are model estimates and require CFO sign-off.
              Regulatory references are based on training data — verify against live regulation text before LP use.{' '}
              <strong style={{ color: '#c8c8c4' }}>Human analyst review is mandatory before any investor-facing distribution.</strong>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: 'var(--fs-label)', color: '#333', fontStyle: 'italic', marginBottom: '1rem' }}>
              Print this memo and obtain physical signatures before LP distribution.
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2.5rem' }}>
              {[
                { role: 'ESG Lead Analyst', note: 'Materiality review' },
                { role: 'CFO Sign-Off',     note: 'Financial figures verified' },
                { role: 'Legal Review',     note: 'Regulatory references checked' },
              ].map(({ role, note }) => (
                <div key={role} style={{ minWidth: '11rem' }}>
                  <div style={{ height: 36, borderBottom: '1px solid #3A3A3A', marginBottom: '0.5rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', bottom: 6, left: 0, fontSize: 'var(--fs-micro)', color: '#2A2A2A', fontStyle: 'italic' }}>Signature</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: '#555', fontWeight: 600 }}>{role}</div>
                  <div style={{ fontSize: 'var(--fs-label)', color: '#333', marginTop: '0.15rem' }}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Methodology footer */}
        <div style={{ marginTop: '2rem', fontSize: 'var(--fs-label)', color: '#333', lineHeight: 1.8, borderTop: '1px solid #1a1a2e', paddingTop: '1.5rem' }}>
          Methodology: SASB Materiality Map (77-industry) · BCG ESG Alpha Study (2023) · EY-Parthenon ESG-IRR Correlation ·
          Verdantix Market Sizing (2024) · EU SFDR Regulation 2019/2088 Level 2 RTS ·
          Khan, Serafeim & Yoon (2016) · Accenture Responsible AI Framework (5 pillars)
        </div>
      </div>
    </div>
  );
}
