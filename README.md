# The Compliance Guardian

**AI-Augmented Policing for Municipal Sovereignty**

World Wide Vibes Hackathon 2026 | City of Montgomery, AL | Public Safety Track

| | |
|---|---|
| **Live App** | [the-compliance-guardian.vercel.app](https://the-compliance-guardian.vercel.app) |
| **Demo Video** | [Watch the 2-Minute Walkthrough (Loom)](https://www.loom.com/share/9c3b1875a8164933852e598a709517be) |
| **Team** | David Pyakurel — Solo |

---

## The Problem

Alabama Senate Bill 298 mandates that Montgomery maintain **2.0 sworn officers per 1,000 residents**. With a population of 200,603, that requires **401 officers**. Montgomery currently has **331** — a deficit of 70.

If the deficit is not addressed:
- The Alabama Law Enforcement Agency (ALEA) **assumes operational control**
- ALEA **bills the city** for all state personnel deployed
- A **state-run administrator is appointed**, stripping Montgomery of self-governance

Recruiting 70+ officers is costly and slow. We take a different approach.

---

## The Solution

The Compliance Guardian is an AI command center that converts non-emergency call volume into recoverable officer capacity — raising the functional ratio **above 2.0 without a single new hire**.

A dispatcher types any incoming call and the AI instantly:
- **Tier 1** — Flags emergencies for immediate officer dispatch
- **Tier 2** — Generates a pre-filled incident report (one-click copy, no officer needed)
- **Tier 3** — Answers informational queries live via Bright Data (no officer needed)

Every automated call is a real officer-minute reclaimed.

### Effective Strength Formula

```
Effective Strength = (Sworn Officers + Automated Admin Hours / Avg Shift Length)
                     ──────────────────────────────────────────────────────────
                                   City Population / 1,000
```

| Metric | Value |
|--------|-------|
| Current Officers | 331 |
| Required (2.0 per 1K) | 401 |
| Deficit | 70 |
| Non-Emergency Automation Rate | 51.7% |
| **Effective Ratio (with AI)** | **2.15** |

By automating 51.7% of non-emergency calls, Montgomery's functional officer ratio reaches **2.15** — exceeding the state mandate.

---

## How It Works

The interface is a dark-themed **Government Command Center** with real-time data streaming.

| Component | What It Does |
|-----------|-------------|
| **Sovereignty Gauge** | Radial gauge showing current effective ratio vs. the 2.0 mandate. Green when compliant, red when at risk. |
| **Effective Strength Calculator** | Live formula widget that updates as the AI automation rate changes. |
| **Crime Map** | Leaflet heatmap of Montgomery 911 call density — Fire/EMS incidents and 311 service requests plotted from ArcGIS. |
| **Officer ROI** | Tier breakdown showing officer-hours reclaimed per call category. |
| **Compliance ROI** | Line chart projecting the deficit reduction timeline to full compliance. |
| **Live Call Triage** | The core feature. Type any call description — AI classifies it, generates a report or answers the query, tracks time saved, and exports a printable session report for ALEA compliance documentation. |
| **Reasoning Feed** | Streaming AI transparency log with clickable SB 298 news links, Bright Data intel, and live analysis. |

---

## Technical Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React + Vite | War Room UI deployed to Vercel |
| **AI** | Google Gemini 2.0 Flash | Call classification, incident reports, compliance reasoning |
| **Web Intelligence** | Bright Data MCP (SSE) | SB 298 legislative monitoring, local news sentiment, MPD hiring pipeline |
| **Civic Data** | Montgomery Open Data (ArcGIS) | Live 911 call feed — category, origin, emergency vs. non-emergency |

### Bright Data MCP Usage

Bright Data is used for **two distinct use cases** via MCP over Server-Sent Events:

1. **Legislative Monitoring** — `search_engine` queries for SB 298 status, Reddit safety sentiment, and MPD/City Council press releases
2. **Sentiment Scraping** — `scrape_as_markdown` pulls WSFA 12 News, AL.com Montgomery coverage, and GovernmentJobs.com MPD listings

All responses are cached at the module level. The same query never fires twice in a session.

---

## Project Structure

```
The-Compliance-Guardian/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── src/
    ├── App.jsx                         ← Root layout, state, data fetching
    ├── App.css
    ├── components/
    │   ├── SovereigntyGauge.jsx / .css
    │   ├── EffectiveStrengthCalc.jsx / .css
    │   ├── CrimeMap.jsx / .css
    │   ├── OfficerROI.jsx / .css
    │   ├── ComplianceROI.jsx / .css
    │   ├── CallTriageSimulator.jsx / .css
    │   └── ReasoningFeed.jsx / .css
    └── lib/
        ├── brightdata.js               ← Bright Data MCP SSE client (cached)
        ├── montgomery911.js            ← ArcGIS FeatureServer client + fallback
        └── ai.js                       ← Gemini 2.0 Flash + deterministic fallback
```

---

## Quick Start

```bash
git clone https://github.com/TedsTech/The-Compliance-Guardian
cd The-Compliance-Guardian
npm install
cp .env.example .env    # Add your API keys
npm run dev             # Opens at http://localhost:3000
```

### Environment Variables

```bash
VITE_BRIGHTDATA_TOKEN=       # Bright Data API token
VITE_BRIGHTDATA_GROUPS=      # Default: advanced_scraping,social,research
VITE_GEMINI_API_KEY=         # Google AI Studio key (free tier)
VITE_MONTGOMERY_ARCGIS_BASE= # ArcGIS FeatureServer URL (optional, has fallback)
```

---

## Why This Wins

| Criteria | Our Approach |
|----------|-------------|
| **Relevance** | Directly addresses the Public Safety track using official Montgomery datasets. The judges include the City of Montgomery CTO and IT Manager — this is their problem. |
| **Execution Quality** | Fully functional React app with live data, not a mockup. Real Bright Data API calls. Deployed to a public Vercel URL. |
| **Originality** | The Effective Strength formula is a novel civic compliance concept. No other team has this framing. |
| **Social Impact** | Addresses a real municipal sovereignty crisis for a real city with real stakes. |
| **Commercial Potential** | Every Class 3 city in Alabama faces this same mandate. This is a scalable SaaS product for municipal compliance monitoring. |
| **Bright Data Bonus** | MCP used for two distinct use cases: legislative monitoring + sentiment scraping. |

---

## Team

**David Pyakurel** | solo

World Wide Vibes Hackathon 2026 | Public Safety Track
Submission Deadline: March 9, 2026 9am CT

---

**Live App:** [the-compliance-guardian.vercel.app](https://the-compliance-guardian.vercel.app)
**Demo Video:** [Loom Walkthrough](https://www.loom.com/share/9c3b1875a8164933852e598a709517be)
