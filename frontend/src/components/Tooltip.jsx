import { useState } from 'react';

export const TERM_DEFINITIONS = {
  'ESRS E1':      'European Sustainability Reporting Standard E1 — Climate change. Mandatory under CSRD, covers Scope 1, 2, and 3 GHG emissions and transition planning.',
  'ESRS E2':      'ESRS E2 — Pollution. Covers air, water, soil pollutants for companies with material pollution impact.',
  'PAI':          'Principal Adverse Impact — 14 mandatory indicators (GHG, board diversity, supply chain labour) required under SFDR Level 2 RTS for Article 8/9 funds.',
  'DNSH':         '"Do No Significant Harm" — EU Taxonomy requirement that an activity must not materially damage any of the 6 environmental objectives (climate mitigation, climate adaptation, water, circular economy, pollution, biodiversity).',
  'SFDR 2.0':     'EC proposal (November 2025) replacing Article 6/8/9 with three categories: ESG Basics, Transition (≥70% aligned), Sustainable (≥70% or ≥15% EU Taxonomy). Marketing ban for non-compliant funds. Implementation 2028.',
  'EUDR':         'EU Deforestation Regulation (EU 2023/1115) — companies placing forest-risk commodities (palm oil, timber, soy, beef, cocoa, coffee, rubber) on EU market must demonstrate deforestation-free supply chains. Large-operator deadline: 30 Dec 2026.',
  'Omnibus I':    'EU Directive 2026/470 (enacted 18 March 2026) — raised CSRD scope to 1,000+ employees AND €450M+ revenue, removing ~80% of previously in-scope companies. CSDDD threshold: 5,000+ employees + €1.5B revenue.',
  'SBTi':         'Science-Based Targets initiative — independent body validating that a company\'s emissions reduction targets align with the 1.5°C Paris Agreement pathway. SBTi FLAG covers forest, land and agriculture Scope 3.',
  'EDCI':         'ESG Data Convergence Initiative — PE industry standard covering 20 cross-sector ESG metrics. 390+ GP signatories, ~$28T AUM. Being aligned with SASB/ISSB industry-specific standards.',
  'SFDR':         'Sustainable Finance Disclosure Regulation (EU 2019/2088) — requires EU fund managers to classify funds as Article 6 (no ESG), 8 (promotes E/S characteristics), or 9 (sustainable objective). Full Level 2 RTS in effect.',
  'CSRD':         'Corporate Sustainability Reporting Directive (EU 2022/2464) — mandatory double-materiality ESG reporting. Post-Omnibus I: 1,000+ employees AND €450M+ revenue. Phase 3 (non-EU parents): January 2026.',
  'TCFD':         'Task Force on Climate-related Financial Disclosures — four-pillar framework (Governance, Strategy, Risk Management, Metrics & Targets). Basis for IFRS S2 and HKEX ESG reporting.',
  'GRI':          'Global Reporting Initiative — most widely used voluntary ESG reporting framework. Impact-materiality focused. GRI 18 Biodiversity (effective Jan 2026) covers deforestation risk.',
  'SASB':         'Sustainability Accounting Standards Board — 77-industry materiality maps identifying which ESG metrics are financially material per sector. Incorporated into ISSB IFRS S1.',
  'HKEX':         'Hong Kong Exchanges and Clearing — mandatory ESG reporting for all HK-listed companies, aligned with ISSB IFRS S1/S2 standards effective for financial years beginning 1 January 2025.',
  'MAS':          'Monetary Authority of Singapore — requires all financial institutions including PE managers to integrate environmental risk into investment decisions (Notice on Environmental Risk Management, effective June 2022).',
  'CSDDD':        'Corporate Sustainability Due Diligence Directive — mandatory supply chain human rights and environmental due diligence. Post-Omnibus I: 5,000+ employees AND €1.5B+ revenue.',
  'UNGC':         'UN Global Compact — 10 principles on human rights, labour, environment, anti-corruption. SFDR 2.0 mandates UNGC/OECD compliance screening for ALL fund categories including ESG Basics.',
  'Double materiality': 'CSRD/ESRS concept requiring disclosure of both financial materiality (ESG impacts on the business) and impact materiality (the business\'s impacts on the environment and society).',
  'Article 8':    'SFDR Article 8 — fund "promotes environmental or social characteristics." Requires 18 mandatory PAI indicators, good governance assessment, and DNSH consideration. Being replaced by SFDR 2.0 in 2028.',
  'Article 9':    'SFDR Article 9 — fund has a "sustainable investment objective." Highest SFDR classification. Requires a defined sustainable investment minimum % and DNSH documentation for all holdings.',
};

export function useTooltip() {
  return TERM_DEFINITIONS;
}

/**
 * Inline tooltip — wraps any text with a hover definition.
 * Usage: <Tooltip term="SFDR 2.0">SFDR 2.0</Tooltip>
 *        <Tooltip text="Custom definition">some label</Tooltip>
 */
export default function Tooltip({ term, text, children }) {
  const [visible, setVisible] = useState(false);
  const definition = text ?? TERM_DEFINITIONS[term] ?? null;
  if (!definition) return children;

  return (
    <span
      style={{ position: 'relative', display: 'inline' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span style={{ borderBottom: '1px dotted #555555', cursor: 'help', display: 'inline' }}>
        {children}
      </span>
      {visible && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1A1A1A', border: '1px solid #3A3A3A', borderRadius: '0.25rem',
          padding: '0.5rem 0.75rem', width: '18rem', fontSize: '0.6875rem', color: '#c8c8c4',
          lineHeight: 1.6, zIndex: 200, whiteSpace: 'normal', pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          display: 'block',
        }}>
          {term && <span style={{ fontWeight: 700, color: '#AC00EF', display: 'block', marginBottom: '0.2rem' }}>{term}</span>}
          {definition}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #3A3A3A', display: 'block', width: 0, height: 0,
          }} />
        </span>
      )}
    </span>
  );
}
