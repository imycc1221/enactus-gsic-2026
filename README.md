# ESG Value Engine

**Enactus Hong Kong · GSIC 2026 · Accenture Case**

A working prototype that transforms raw ESG data into decision-ready financial intelligence — built in 5 days with Claude AI.

---
**Key Resources:**

*   📄 **Documentation: ** [Presentation Slides](https://canva.link/i0i4zdnidp4kcir)

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
<img width="2559" height="1297" alt="image" src="https://github.com/user-attachments/assets/0cb11337-e5e1-4d8e-a7c9-c11c33627874" />
<p align="center"><b>Figure 1: SASB-filtered materiality analysis</p></b>
Click ESG Screener tab, then click Run ESG Screen to run the AI pipeline (6 steps: classify industry → filter KPIs → score → quantify risk → value opportunities → map frameworks).

<img width="2559" height="1012" alt="image" src="https://github.com/user-attachments/assets/b2ebb852-c58a-4732-b24d-cd72c36b1b00" />
<p align="center"><b>Figure 2: Materiality Dashboard</p></b>

### Value Predictor
Translates screened ESG initiatives into a quantified financial model: IRR uplift, exit multiple expansion, and additional value created. Each initiative is costed, ranked by payback period, and tied to a private equity return lens.
<img width="2558" height="1296" alt="image" src="https://github.com/user-attachments/assets/79df9327-58c4-41dc-829a-d0e73a26ea00" />

<p align="center"><b>Figure 3: IRR uplift financial model</p></b>
Click Value Predictor tab, then click Run Value Prediction.

<img width="2559" height="1258" alt="image" src="https://github.com/user-attachments/assets/64764c2b-1b78-431c-a21f-0937f5400dff" />
<p align="center"><b>Figure 4: IRR Uplift & Financial Impact Summary</p></b>

<img width="1568" height="630" alt="image" src="https://github.com/user-attachments/assets/cb4bcd78-d036-4a9b-bb2b-8ef93e6a7184" />
<p align="center"><b>Figure 5: ESG Initiative Breakdown</p></b>

<img width="1568" height="619" alt="image" src="https://github.com/user-attachments/assets/c1b484b9-9dc1-4912-b31a-e667175bfe6c" />
<p align="center"><b>Figure 6: Risk Mitigation & Exit Narrative</p></b>

 
### Framework Mapper
Takes one company input and auto-generates compliant disclosure outputs for six frameworks simultaneously — CSRD, ESRS, SFDR, TCFD, GRI, SASB, and EDCI. Identifies automation potential and flags data gaps before they become audit findings.
<img width="2559" height="1299" alt="image" src="https://github.com/user-attachments/assets/15218ba5-e023-4149-a262-c2e3274c1cfd" />
<p align="center"><b>Figure 7: 1 input → 6 regulatory outputs</p></b>
Click Framework Mapper tab, then click Run Framework Mapper.1
  
<img width="2559" height="920" alt="image" src="https://github.com/user-attachments/assets/0e5603d4-0064-4f32-92b8-f2235c26b615" />
<p align="center"><b>Figure 8: Multi-Framework Compliance Output </p></b>

<img width="2559" height="1030" alt="image" src="https://github.com/user-attachments/assets/51f8eca8-5ff0-4212-899e-3b909a620cfd" />
<p align="center"><b>Figure 9: Data Gaps & Summary </p></b>





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
