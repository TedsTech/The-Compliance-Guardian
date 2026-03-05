# The Compliance Guardian

**AI-Augmented Policing for Municipal Sovereignty**

World Wide Vibes Hackathon 2026 | City of Montgomery, AL  
TedsTech | March 5-9, 2026 | Public Safety Track | [github.com/TedsTech/The-Compliance-Guardian](https://github.com/TedsTech/The-Compliance-Guardian)

Prize Pool: **$5,000** | Track: **Public Safety**

---

## 01 EXECUTIVE SUMMARY

The Compliance Guardian is a high-stakes AI command center designed to protect the City of Montgomery from the 2026 State Takeover mandate (SB 298). By combining Bright Data MCP for real-time web intelligence and the Montgomery Open Data 911 feed, the system proves that Montgomery can meet efficiency standards through AI-assisted **Effective Strength** rather than raw headcounts.

Beyond monitoring, the system is a **live dispatch tool**: a dispatcher types any incoming call description and the AI instantly classifies it, generates a pre-filled incident report (Tier 2), or answers the query live via Bright Data (Tier 3) — with one-click copy and a printable session report for ALEA submission. Every automated call is a real officer-minute reclaimed. Montgomery is the pilot. Every other Class 3 Alabama city is the market.

| Metric | Value |
|--------|-------|
| **Current Officers** | 331 |
| **Required (2.0/1K)** | 401 |
| **Deficit** | 70 |
| **Effective Ratio (w/ AI)** | **2.15** ✅ |

---

## 02 THE PROBLEM — 2026 SOVEREIGNTY CRISIS

Alabama Senate Bill 298 mandates that Montgomery (Class 3 municipality) must maintain **2.0 sworn officers per 1,000 residents**. With a population of 200,603, that requires **401 officers**. Montgomery currently has approximately **331** — a deficit of 70.

### Why This Matters:
- **If the deficit is not reduced by 10% annually**, the Alabama Law Enforcement Agency (ALEA) assumes operational control
- **ALEA bills the city** for all state personnel deployed
- **A state-run administrator is appointed**, stripping Montgomery of self-governance

### The Solution:
Rather than recruiting 70+ officers (costly, slow), we demonstrate that **AI-assisted dispatch automation** converts non-emergency call volume into recoverable officer capacity — raising the functional ratio **above 2.0 without a single new hire**.

---

## 03 THE LOGIC — EFFECTIVE STRENGTH FORMULA

```
Effective Strength = (Current Sworn Officers + Automated Admin Hours / Avg Officer Shift)
                     ────────────────────────────────────────────────────────────
                                    City Population / 1000
```

By automating **51.7% of calls** currently marked Non-Emergency in the Open Data portal, the system demonstrates that Montgomery's functional officer ratio is **2.15** — exceeding the state mandate.

---

## 04 TECHNICAL STACK

| Layer | Technology | Role | Cost |
|-------|-----------|------|------|
| **Frontend** | React + Vite (Vercel deploy) | War Room UI, gauges, map, reasoning feed | Free |
| **AI Brain** | Google Gemini API (AI Studio) | Declarative agent, compliance reasoning, Effective Strength calc | Free tier (bonus pts w/ judges) |
| **Web Intel** | Bright Data MCP Remote Endpoint | SB 298 monitoring, Reddit/news sentiment scraping | 200 credits (sponsored) |
| **Civic Data** | Montgomery Open Data ArcGIS REST API | Live 911 call feed — category, origin, emergency vs. non-emergency | Free / Public |
| **Repo** | GitHub TedsTech | Version control, CI/CD via Vercel auto-deploy on push | Free |

**Key Insight:** No Copilot Studio / Sugarcode required. Direct API calls give more control and make a stronger impression on technical judges.

---

## 05 PROJECT STRUCTURE

```
src/
├── components/
│   ├── SovereigntyGauge.jsx      ← Compliance meter (radial gauge, hero widget)
│   ├── ReasoningFeed.jsx         ← Streaming AI transparency log (clickable links)
│   ├── CrimeMap.jsx              ← 911 heatmap (react-leaflet)
│   ├── EffectiveStrengthCalc.jsx ← Live Effective Strength formula widget
│   ├── ComplianceROI.jsx         ← ROI projection line chart
│   ├── OfficerROI.jsx            ← Officer efficiency KPI card
│   └── CallTriageSimulator.jsx   ← 3-tier AI automation pipeline demo
├── lib/
│   ├── brightdata.js             ← Bright Data MCP over SSE (cached, singleton)
│   ├── montgomery911.js          ← ArcGIS FeatureServer client + mock fallback
│   └── ai.js                     ← Gemini 2.0 Flash + deterministic fallback
├── App.jsx                       ← Root layout, all state, all data fetching
├── App.css
├── main.jsx
├── index.css
├── index.html
├── package.json
├── vite.config.js
├── .env.example                  ← API key template (never commit .env)
└── .gitignore
```

---

## 06 QUICK START

### Prerequisites
- **Node.js** v18+ ([download](https://nodejs.org))
- **npm** or **yarn**
- Git account ([github.com](https://github.com))

### Setup Commands

```bash
# 1. Clone the repository
git clone https://github.com/TedsTech/The-Compliance-Guardian
cd The-Compliance-Guardian

# 2. Install dependencies
npm install

# 3. Create .env file from template
cp .env.example .env
# Edit .env with your API keys

# 4. Start dev server
npm run dev

# 5. Open browser
# Vite will auto-open http://localhost:3000
```

### Environment Variables

Create a `.env` file in the project root (never commit this):

```bash
# Bright Data API Token (200 sponsored credits)
VITE_BRIGHTDATA_TOKEN=your_bright_data_api_token_here

# Bright Data tool groups (default: advanced_scraping,social,research)
VITE_BRIGHTDATA_GROUPS=advanced_scraping,social,research

# Google AI Studio API Key (free tier)
VITE_GEMINI_API_KEY=your_google_ai_studio_key_here

# Montgomery ArcGIS FeatureServer base URL (falls back to hardcoded if omitted)
VITE_MONTGOMERY_ARCGIS_BASE=https://services7.arcgis.com/xNUwUjOJqYE54USz
```

---

## 07 SETUP CHECKLIST — MARCH 4, 2026

| # | Task | Link | Status |
|---|------|------|--------|
| 1 | Create Bright Data account & get API token | [brightdata.com/settings](https://brightdata.com) | ✅ DONE |
| 2 | Get Google AI Studio key (free, bonus points) | [ai.google.dev](https://ai.google.dev) | ✅ DONE |
| 3 | Sign up for Vercel & connect GitHub | [vercel.com](https://vercel.com) | ✅ DONE |
| 4 | Montgomery ArcGIS FeatureServer endpoint verified | `services7.arcgis.com/xNUwUjOJqYE54USz` | ✅ DONE |
| 5 | Scaffold React app & install deps | Terminal | ✅ DONE |
| 6 | Create .env file with all keys | See above | ✅ DONE |
| 7 | Push to GitHub & deploy Vercel | [the-compliance-guardian.vercel.app](https://the-compliance-guardian.vercel.app) | ✅ DONE |

---

## 08 BRIGHT DATA — 200 CREDIT BUDGET

**Golden Rule:** Always **cache Bright Data responses** in a module-level JS object. The same query must never fire twice in one session. Never auto-poll on an interval.

| Feature | Tool | Credits | Notes |
|---------|------|---------|-------|
| SB 298 legislative status | `search_engine` | 2 | Once on load, cached |
| Montgomery news sentiment (WSFA 12 + AL.com) | `scrape_as_markdown` | 6 | On demand, cached |
| MPD / City Council press releases | `search_engine` | 3 | On demand, cached |
| Reddit safety sentiment | `search_engine` | 3 | On demand, cached |
| MPD job postings (GovernmentJobs.com) | `scrape_as_markdown` | 3 | On demand, cached |
| Live demo buffer | Both | 20 | Judge demo session |
| Development & testing | Both | 50 | Build phase |
| **Safety buffer** | — | **113** | Do NOT auto-poll |
| **TOTAL** | — | **200** | **Sponsored** ✨ |

### Transport — MCP over SSE

Bright Data uses **Server-Sent Events**, not a single REST POST. A singleton SSE connection is established per page load:

```javascript
// src/lib/brightdata.js — correct usage
import { searchBrightData, scrapeUrl, getCacheStatus } from './lib/brightdata.js'

// Cache is checked automatically — same query never fires twice
const results = await searchBrightData('SB 298 Alabama 2026', 5)
const article  = await scrapeUrl('https://wsfa.com/news/crime')

console.log(getCacheStatus())
// { cachedResults: 3, cacheKeys: [...], estimatedCreditsUsed: 11 }
```

In dev, Vite proxies `/brightdata-sse` and `/brightdata-message` (see `vite.config.js`) to avoid CORS.

---

## 09 6-DAY BUILD TIMELINE

| Day | Date | Focus | Deliverable |
|-----|------|-------|-------------|
| Day 0 | Mar 3 | **SETUP** — Accounts, keys, scaffold repo, verify ArcGIS | ✅ Working npm dev server<br/>✅ All .env keys populated |
| Day 1 | Mar 4 | **DATA LAYER + AI PIPELINE** — Connect 911 API, Bright Data, Gemini; build all core components | ✅ Live 911 data from ArcGIS FeatureServer<br/>✅ BD MCP SSE transport wired<br/>✅ Gemini 2.0 Flash streaming<br/>✅ CallTriageSimulator (3-tier pipeline)<br/>✅ Clickable links in Reasoning Feed<br/>✅ Full UI polish pass (Inter font, CSS variables, glass cards) |
| Day 2 | Mar 5 | **HARDENING** — Live call triage, copy/export actions, keyword classifier, Vercel deploy | ✅ Live call input with AI triage<br/>✅ Copy report + Export PDF<br/>✅ Keyword fallback classifier<br/>✅ Commercial potential header copy |
| Day 3 | Mar 6 | **DEMO PREP** — Seed data, dry-run judge scenario, tighten copy | 🔲 Demo script rehearsed<br/>🔲 No console errors on prod |
| Day 4 | Mar 7 | **VIDEO** — Record 2-min Loom walkthrough | 🔲 Loom URL ready |
| Day 5 | Mar 8 | **FINAL POLISH** — README, submission form draft | 🔲 All fields filled |
| Day 6 | Mar 9 9am CT | **SUBMIT** — Final checks, submit on portal | 🔲 SUBMITTED |

---

## 10 UI DESIGN — THE WAR ROOM

The interface is designed to look like a **Government Command Center** for max design points. Dark theme, high contrast, real-time data streaming.

### Components

| Component | Description | Library |
|-----------|-------------|---------|
| **SovereigntyGauge** | Radial gauge: current ratio vs 2.0 mandate. Green ≥2.0, red below. | recharts RadialBarChart |
| **EffectiveStrengthCalc** | Live Effective Strength formula widget — updates as AI automation % rises | React + CSS |
| **CrimeMap** | Leaflet heatmap of 911 call density, color-coded by emergency tier | react-leaflet |
| **ReasoningFeed** | Streaming AI transparency log; URLs are auto-linked | Custom component |
| **ComplianceROI** | Line chart projecting deficit reduction timeline to full compliance | recharts LineChart |
| **OfficerROI** | Officer efficiency KPI card showing time reclaimed per shift | React + CSS |
| **CallTriageSimulator** | **Live dispatch tool.** Dispatcher types any call → AI classifies into 3 tiers → Tier 2 auto-generates a copyable incident report → Tier 3 answers the query live via Bright Data. Session queue tracks time saved. One-click PDF export for ALEA compliance documentation. | Gemini + Bright Data |

---

## 11 AI BRAIN — SYSTEM PROMPT

This is the exact system prompt passed to Gemini (or Claude) on every request:

```
You are the Montgomery Compliance Guardian. Your primary directive is to protect the City's 
operational independence by maximizing police efficiency under Alabama SB 298.

CONTEXT: Montgomery has 331 sworn officers. The state mandate requires 401 (2.0 per 1,000 
residents, population 200,603). You must demonstrate Effective Strength >= 2.0 through AI 
dispatch triage — not new hires.

TOOLS AVAILABLE:
- Bright Data MCP: search_engine (SB 298 news), scrape_as_markdown (local sentiment)
- Montgomery 911 API: live call data categorized by type and emergency tier

ALWAYS OUTPUT:
1. Current Effective Strength ratio
2. Non-emergency calls identified for AI triage (count + sectors)
3. Compliance Gauge status (compliant / at risk / critical)
4. 3 actionable Efficiency Wins
5. SB 298 legislative status (latest news)

Be precise. Be urgent. This is a sovereignty crisis.
```

---

## 12 DEVELOPMENT NOTES

### Running Locally

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### API Integration Checklist

- [x] Bright Data account created & API token secured
- [x] Google Gemini API key obtained
- [x] Montgomery ArcGIS FeatureServer endpoint verified (`services7.arcgis.com/xNUwUjOJqYE54USz`)
- [x] `.env` file populated with all keys
- [x] `npm run dev` starts without errors

### Debugging Bright Data Calls

```javascript
import { getCacheStatus } from './lib/brightdata.js'

// Check cache after queries
console.log(getCacheStatus())
// Output: { cachedResults: 3, cacheKeys: [...], estimatedCreditsUsed: 9 }
```

### Debugging 911 Data

```javascript
import { generateMockCalls } from './lib/montgomery911.js'

// When ArcGIS endpoint unavailable
const mockCalls = generateMockCalls()
```

---

## 13 JUDGING CRITERIA ALIGNMENT

| Criteria | How We Win It |
|----------|---------------|
| **Relevance** | Directly addresses Public Safety track. Uses official Montgomery datasets. Judges include City of Montgomery CTO & IT Manager — this is their problem. |
| **Execution Quality** | React app with live data (not a mockup). Real Bright Data calls. Deploy to Vercel = shareable public URL. |
| **Originality** | Effective Strength formula is novel civic compliance concept. No other team will have this framing. |
| **Social Impact** | Directly addresses municipal sovereignty & police resource equity. High stakes, real city, real problem. |
| **Commercial Potential** | Every Class 3 city in Alabama faces this mandate. Scalable SaaS product for municipal compliance monitoring. |
| **Bright Data Bonus** | MCP used for TWO distinct use cases: legislative monitoring + sentiment scraping. |

---

## 14 DEPLOYMENT TO VERCEL

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial Compliance Guardian scaffold"
   git push origin main
   ```

2. **Connect Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import `TedsTech/The-Compliance-Guardian` from GitHub
   - Add environment variables (VITE_* keys)
   - Deploy!

3. **Auto-Deploy on Push**
   - Every `git push` triggers a new build
   - Production URL: `https://the-compliance-guardian.vercel.app`

---

## 15 LIVE DEMO SCRIPT (Day 4)

Record a 2-minute Loom video:

1. **Opening (0:00–0:20)**
   - "Montgomery faces a state takeover unless police efficiency hits 2.0 officers per 1,000 residents."
   - Show the **Sovereignty Gauge** — current ratio and mandate line.

2. **Live 911 Data (0:20–0:40)**
   - Click **"🔄 Refresh 911 Data"**
   - Show real Montgomery calls flowing into the **Crime Map** and **Effective Strength** widget updating live.

3. **Live Call Triage — The Action (0:40–1:20)**
   - Scroll to the **Live Call Triage** input
   - Type a real non-emergency: `"neighbor's dog has been barking for 3 hours"` → hit Enter
   - AI classifies as Tier 2, generates a complete incident report in seconds
   - Hit **📋 Copy** — "A dispatcher just saved 45 minutes of paperwork. No officer dispatched."
   - Type an info query: `"what time does the Montgomery DMV close"` → Bright Data answers live
   - Type an emergency: `"shooting at Oak Park, someone is down"` → instant Tier 1 dispatch flag
   - Show the session stats: time saved counter, reports filed
   - Click **📄 Export Session Report** — open the printable PDF. "This goes straight to ALEA."

4. **Web Intelligence (1:20–1:40)**
   - Click **"🏙️ Load Local City Intel"** — WSFA & AL.com scraped via Bright Data MCP
   - Click **"💼 Check MPD Hiring Pipeline"** — live job postings count confirms hiring is not viable
   - Show **Reasoning Feed** with clickable SB 298 news links

5. **Impact (1:40–2:00)**
   - Show **Compliance ROI** chart trending upward
   - Point to the **green Sovereignty Gauge** — ratio ≥ 2.0, compliant
   - "With 51.7% non-emergency automation, Montgomery reaches 2.15 effective strength. Sovereignty maintained — and every Class 3 city in Alabama can run this same playbook."

---

## 16 SUPPORT & RESOURCES

- **Bright Data Docs:** [docs.brightdata.com](https://docs.brightdata.com)
- **Google Gemini API:** [ai.google.dev](https://ai.google.dev)
- **React + Vite:** [vitejs.dev](https://vitejs.dev)
- **Recharts:** [recharts.org](https://recharts.org)
- **Leaflet:** [leafletjs.com](https://leafletjs.com)
- **Montgomery Open Data:** [opendata.montgomeryal.gov](https://opendata.montgomeryal.gov)
- **Alabama SB 298:** [legislature.alabama.gov](https://legislature.alabama.gov)

---

## 17 TEAM & CONTACT

**TedsTech** | World Wide Vibes Hackathon 2026

- Public Safety Track
- Prize Pool: $5,000
- Submission Deadline: **March 9, 2026 9am CT**

---

**Last Updated:** March 5, 2026
**Status:** ✅ Day 2 Complete — Live call triage, copy/export actions, keyword classifier, commercial pitch copy
