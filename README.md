# ESG Value Engine

**Enactus Hong Kong · GSIC 2026 · Accenture Case**

A working prototype that transforms raw ESG data into decision-ready financial intelligence — built in 5 days with Claude AI.

---

## The Problem

Companies face three compounding ESG challenges:

- **Materiality overload** — hundreds of metrics, most of which don't move the needle
- **The value gap** — ESG spend is not connected to IRR, exit multiples, or balance-sheet impact
- **Regulatory fragmentation** — CSRD, SFDR, TCFD, GRI, SASB, and EDCI each demand different formats from the same underlying data

Most ESG tools answer *"what did we do?"*. This tool answers *"what is it worth?"*

---

## The Solution — Three Screens, One Engine

### ESG Screener
Filters a company's ESG profile through SASB materiality standards to surface only the issues that are financially relevant to that specific industry. Scores are benchmarked against sector peers and broken down by Environmental, Social, and Governance pillar.

### Value Predictor
Translates screened ESG initiatives into a quantified financial model: IRR uplift, exit multiple expansion, and additional value created. Each initiative is costed, ranked by payback period, and tied to a private equity return lens.

### Framework Mapper
Takes one company input and auto-generates compliant disclosure outputs for six frameworks simultaneously — CSRD, ESRS, SFDR, TCFD, GRI, SASB, and EDCI. Identifies automation potential and flags data gaps before they become audit findings.

---

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Recharts |
| Backend | Node.js, Express |
| AI Engine | Claude (Anthropic) — tool\_use API |
| Styling | CSS custom properties, GT Sectra Fine display font |

The AI engine uses structured `tool_use` calls so every output is deterministic JSON — not free-form text. This makes the results auditable and directly renderable in the UI without parsing heuristics.

---

## Running Locally

**Prerequisites:** Node.js 18+, an Anthropic API key

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Set your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Start backend (port 3001)
cd backend && node server.js

# 4. Start frontend (port 5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` — select a company from the header, then run any of the three tools.

---

## Research Basis

The financial model is grounded in peer-reviewed research and industry benchmarks:

- Khan, Serafeim & Yoon (2016) — materiality-adjusted ESG signals and excess returns
- BCG (2025) — ESG premium in PE exit multiples
- EY-Parthenon — IRR uplift from ESG-linked operational improvements
- Verdantix (2024) — automation potential in ESG reporting workflows
- SASB Standards — industry-specific materiality maps

---

## Team

**Team Da House** · Enactus Hong Kong · GSIC 2026
