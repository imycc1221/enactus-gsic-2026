# ESG Value Engine — System Overview
## For team members · Last updated: April 2026

> **One-line pitch:** A PE-native AI platform that turns raw ESG data into priced deal value — IRR uplift, exit narrative, compliance cost savings — using SASB's 77-industry materiality filter and Claude's structured `tool_use` for auditable, hallucination-resistant output.

---

## 1. What the system actually does

The user picks a target portfolio company (or inputs a custom one), then runs 5 sequential AI analyses. Each analysis consumes upstream context so later screens reason about earlier findings. The full pipeline takes ~30 seconds on live Claude, or ~instant on cached results.

**The 5-agent analysis chain:**

| # | Agent | Input | Output | What it proves |
|---|-------|-------|--------|----------------|
| 1 | **ESG Screener** | Company profile (sector, geo, revenue, available data) | SASB classification, material KPIs (5–7 from 26 possible), data confidence score, framework gaps | Only material ESG is scored (Khan et al. +5.58% alpha) |
| 2 | **Value Predictor** | Company + Screener output | Annual EBITDA uplift, IRR uplift, exit narrative, payback period, Bear/Base/Bull scenarios | Translates ESG findings into PE deal language |
| 3 | **SFDR Classifier** | Company + Screener output | Current SFDR article (6/8/9), SFDR 2.0 shadow classification (ESG Basics/Transition/Sustainable), marketing-ban risk assessment, UK SDR assessment (if UK-based) | Fund-level regulatory readiness |
| 4 | **Framework Mapper** | Company + Screener output | Single data input → 7 frameworks simultaneously (CSRD/ESRS, SFDR, TCFD, IFRS S1/S2 ISSB/HKEX, GRI, SASB, EDCI) with specific metric IDs, PAI indicators, article numbers | One input, seven outputs, 30 seconds |
| 5 | **Greenwash Detector** | Company + all prior outputs | Claim consistency check across Screener/Predictor/SFDR outputs, flags unsupported sustainability claims | Forensic audit layer |

**Supporting screens (not in the analysis chain):**
- **Portfolio View** — aggregates results across the 3 sample companies
- **IC Memo** — assembles all analysis results into an investment committee-ready narrative
- **EUDR Readiness** — regulatory exposure screen with operator classification, countdown to deadline, sector + geography guard

---

## 2. Tech stack

### Frontend
- **React 18 + Vite** — SPA, no SSR
- **Vanilla CSS-in-JS** (inline `style` objects) — no Tailwind, no CSS modules
- **No state library** — all state lives in `App.jsx` and is passed as props (`useState` + `useRef`)
- **No router** — screen switching is driven by `activeScreen` state in `App.jsx`
- **Clipboard API** for Copy buttons (no dependencies)

### Backend
- **Node.js + Express** — thin API layer, one route per agent
- **Claude API (Anthropic SDK)** — model: `claude-opus-4-6` (or whatever is current)
- **Structured `tool_use` forcing** — every agent defines a tool schema; Claude MUST output valid JSON matching the schema. This is the core hallucination defence.
- **File-based cache** — `backend/data/cache/` stores prior analysis results keyed by `companyId + agent`. Cache-first, live-fallback.

### No database, no auth, no deployment infra
This is a prototype. For enterprise:
- Add Postgres for result persistence + audit trail
- Add auth (Auth0 / Clerk) + client data isolation
- Add SOC 2 audit logging
- Containerise and deploy (AWS ECS / Fly.io / Vercel + Fly)

---

## 3. Repository structure

```
Enactus GSIC 2026 competition/
├── backend/
│   ├── server.js              # Express entry
│   ├── api/                   # Route handlers (one per agent)
│   ├── services/
│   │   └── prompts.js         # ALL prompts + tool schemas (single source of truth)
│   └── data/                  # Cached results
├── frontend/
│   └── src/
│       ├── App.jsx            # Root — state, nav, Run All orchestration, Reset
│       ├── data/
│       │   └── companies.js   # 3 sample companies + getRegScoping() guard
│       ├── components/
│       │   ├── RaiPanel.jsx          # Accenture RAI 5 pillars, visible on every screen
│       │   ├── AgentStatus.jsx       # Live agent execution indicator
│       │   ├── AgentFlowDiagram.jsx  # Architecture visual
│       │   ├── ReasoningDrawer.jsx   # Expandable "why" panel
│       │   ├── Tooltip.jsx
│       │   └── OnboardingTour.jsx
│       └── screens/
│           ├── Screen1Analyze.jsx    # ESG Screener
│           ├── Screen2Predict.jsx    # Value Predictor
│           ├── Screen3Map.jsx        # Framework Mapper
│           ├── Screen4Sfdr.jsx       # SFDR Classifier
│           ├── Screen5Portfolio.jsx  # Portfolio aggregate view
│           ├── Screen6IcMemo.jsx     # IC memo assembler
│           ├── Screen7Greenwash.jsx  # Greenwash Detector
│           └── Screen8Eudr.jsx       # EUDR readiness
└── SLIDE_DECK_BLUEPRINT.md    # Competition slide deck (10 slides, interweaved demo)
```

---

## 4. Core features

### 4.1 SASB 77-industry materiality router
Claude is prompted with the SASB industry classification task first. It maps the company's sector to one of 77 SASB industries (e.g. Industrial Machinery & Goods IF-MS, Software & IT Services TC-SI). All downstream ESG KPIs are filtered against that industry's material issues. Generic ESG is dropped.

### 4.2 Structured `tool_use` forcing
Every agent defines an `input_schema` (JSON Schema). Claude is forced via `tool_choice` to output valid JSON matching the schema. Result:
- No free-text drift
- No missing fields
- No hallucinated field names
- Every numeric field is typed

This is the **core reliability guarantee** and is the defining architectural choice.

### 4.3 Regulatory intelligence layer (`AGENT_CONTEXT`)
`backend/services/prompts.js` has a top-of-file `AGENT_CONTEXT` block that overrides Claude's training data with current regulatory facts (Omnibus I, EUDR delays, SFDR 2.0, ISSB/HKEX, UK SDR, GRI 18 Biodiversity, France Duty of Vigilance thresholds). **When regulations change, we update one text block and every agent is current.**

### 4.4 Regulatory scoping guard (`getRegScoping` in companies.js)
Prevents false-positive compliance flags. Checks actual legal thresholds before flagging anything as mandatory:
- **CSRD mandatory:** 1,000+ employees AND €450M+ revenue (Omnibus I)
- **CSDDD:** 5,000+ employees AND €1.5B+ revenue
- **EUDR large operator:** 250+ employees OR >€50M revenue, with geography + sector guard (exempts software, financial, pharma, electronics, industrial machinery etc.)
- **France Duty of Vigilance:** 5,000 in France OR 10,000 worldwide
- **De facto obligations:** LP questionnaires (EDCI + SFDR PAI), SFDR 2.0 fund classification, HKEX ISSB-aligned reporting — flagged regardless of legal scope

### 4.5 Bear/Base/Bull scenario pricing
Value Predictor outputs ONE IRR uplift figure from Claude. The frontend computes Bear/Base/Bull by multiplying (0.6 / 1.0 / 1.4) — anchored to BCG's 30th/50th/70th percentile published range. This keeps Claude's output honest (one estimate) while showing the scenario table LPs expect.

### 4.6 Run All orchestration
`App.jsx` has a "Run All" button that triggers all 5 analyses sequentially via `runTrigger` prop counter + `useRef` pattern. Each screen auto-runs when its trigger increments. The chain is completed by `onResult` callbacks that propagate outputs upstream.

### 4.7 Reset functionality
Clears green status indicators back to grey for the current company. Lets the demo be re-run cleanly.

### 4.8 Cache-first with freshness indicators
Green dot = cached result. Amber = live Claude call in progress. Every screen shows a freshness bar so the demo runs instantly but is architecturally identical to live.

### 4.9 Responsible AI panel (visible on every screen)
5 pillars (Fairness, Transparency, Security, Reliability, Responsibility) mapped to actual system behaviour. Amber "Review Required" header bar is unmissable. Every output requires analyst review before LP use.

### 4.10 Greenwash Detector (forensic layer)
Reads the Screener, Predictor, and SFDR outputs and flags internal inconsistencies — e.g., claiming Article 9 alignment while Screener shows 12% renewable energy. Cross-agent validation.

### 4.11 Copy-to-clipboard on narrative text
Exit narrative (Screen2) and LP narrative (Screen4) have Copy buttons. One click, pasted into an IC memo, job done.

### 4.12 EUDR screen with live countdown
- Operator classification (large vs SME) based on employee + revenue thresholds
- Sector guard: excludes non-forest-risk sectors even with high-risk geography
- Countdown to Dec 2026 (large) / Jun 2027 (SME) using current system date
- Shows required due diligence artefacts (GPS coordinates, plot-level traceability)

---

## 5. The 3 sample companies

| Company | Sector | Geo | Revenue | Employees | Key regulatory notes |
|---------|--------|-----|---------|-----------|---------------------|
| **GreenTech Manufacturing** | Industrial Machinery & Goods | Germany + Vietnam | €85M | 420 | Below CSRD Omnibus threshold (voluntary). No EUDR (non-forest-risk sector guard). |
| **CleanEnergy SaaS** | Software & IT Services | UK + Nordics | €22M | 95 | UK SDR applies. EU AI Act for SaaS product. SFDR Nordic LP base. |
| **Sustainable Retail Group** | Food & Beverage Retailers / Apparel | France + SE Asia | €150M | 1,200 | EUDR large operator (Dec 2026 deadline). GRI 18 Biodiversity. Below France Vigilance threshold. |

Each has realistic `availableData` (some gaps, some complete) and `peInvestmentContext` (investment amount, hold period, target exit multiple).

---

## 6. The competition narrative (10 slides)

See `SLIDE_DECK_BLUEPRINT.md` for the full deck. High-level flow:

1. Title
2. The Crisis (€33.5B PFZW withdrawal, 68% of LPs can't reconcile ESG data)
3. Cost of Inaction (regulatory timeline: Omnibus I, EUDR Dec 2026, SFDR 2.0)
4. The Insight (+5.58% alpha from Khan et al.) → **demo: ESG Screener**
5. Regulatory Tsunami (7 frameworks) → **demo: SFDR + EUDR**
6. Solution Architecture (SASB router → Claude tool_use → 7-framework output) → **demo: Framework Mapper**
7. Financial Proof (Bear/Base/Bull table) → **demo: Value Predictor**
8. Responsible AI (5 pillars, real implementation)
9. Competitive Moat + Market Sizing
10. The Ask (3 Accenture client intros for 90-day pilots)

**Total: ~5.5 min slides + ~2.5 min interweaved demo + ~2 min Q&A = 10 min**

---

## 7. What we deliberately DO NOT claim

These were in old drafts but removed for defensibility:

| Removed claim | Why |
|---------------|-----|
| Monte Carlo simulations | System doesn't do Monte Carlo |
| IBM AI Fairness 360 | Not implemented |
| ERP/HRMS/IoT data harvesting via MCP | Takes structured JSON input only |
| "500+ GPs / $59T AUM" for EDCI | Wrong numbers. Correct: 390+ GPs, ~$28T AUM |
| SEC Climate Disclosure Rule references | Rule is dead (8th Circuit stay, Feb 2025) |
| "Multi-agent debate reduces hallucinations by 40%" | Unverifiable percentage |
| EU AI Act Article 19 with 6-month retention | No audit trail in prototype |

**Defensibility > impressiveness.**

---

## 8. How to run locally

```bash
# Backend
cd backend
npm install
# set ANTHROPIC_API_KEY in .env
npm start                      # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Cache-first means the app works without an API key for the 3 sample companies (cached results load instantly). Live Claude calls require `ANTHROPIC_API_KEY`.

---

## 9. Key architectural decisions (and why)

| Decision | Alternative | Why we chose this |
|----------|-------------|-------------------|
| Structured `tool_use` forcing | Free-text prompt + regex parsing | Zero hallucination in schema fields. Auditable. |
| Single `AGENT_CONTEXT` block | Per-agent regulatory context | When regs change, one edit updates every agent. |
| Cache-first with live fallback | Live-only | Demo reliability. Results display instantly. |
| Frontend-computed Bear/Base/Bull | Claude outputs 3 scenarios | Keeps Claude's output honest (one estimate). Scenario spread is anchored to BCG percentiles. |
| Regulatory scoping guard in data layer | Guard in prompts | Deterministic thresholds shouldn't depend on LLM reasoning. Prevents false-positive flags. |
| No state library (props only) | Redux / Zustand | Small app, 8 screens. State library is overkill. |
| Inline styles, no CSS framework | Tailwind | Zero config, zero build step, no class naming churn. |

---

## 10. Known limitations (honest list)

- **No database** — results live in file cache, lost on container restart
- **No auth** — anyone who loads the app can run analyses
- **No audit trail** — RAI slide says "every output flagged for review" but there's no persistent log
- **Sample data is static** — 3 hand-built companies. Custom company input exists but is limited
- **Single-user** — no multi-tenancy, no client data isolation
- **Greenwash Detector is basic** — cross-agent consistency check, not a full NLP claim-verification pipeline
- **No live market data** — sector benchmarks are embedded in prompts, not pulled from Bloomberg/MSCI

All of these are explicitly called out as "enterprise roadmap" in the deck. The prototype proves the architecture; enterprise-grade features are the 90-day pilot.

---

## 11. Where to start reading the code

If you have 30 minutes, read these files in order:

1. `backend/services/prompts.js` — every prompt, every tool schema, every regulatory fact. This is the brain.
2. `frontend/src/data/companies.js` — the 3 sample companies + `getRegScoping()` guard.
3. `frontend/src/App.jsx` — state management, Run All orchestration, Reset.
4. `frontend/src/screens/Screen1Analyze.jsx` — reference screen. Every other screen follows the same pattern: `runTrigger` effect, `run()` function, result display, RAI panel, freshness bar.
5. `frontend/src/components/RaiPanel.jsx` — the Responsible AI visual that appears everywhere.
6. `SLIDE_DECK_BLUEPRINT.md` — the narrative and Q&A ammunition.

---

## 12. Open questions for the team

- Who presents which slide? Demo transitions need to feel rehearsed.
- Do we want to add a 4th sample company for APAC-specific story (HKEX angle)?
- Rehearsal schedule before the 31 March 2026 deadline → already passed, next review for final rehearsals?
- Who owns the backup screenshots in case of demo failure?
- Do we want to pre-generate fresh cached results right before the presentation to avoid any stale data appearance?
