# Copilot Instructions — The Compliance Guardian

## Project Overview

The Compliance Guardian is a React + Vite AI command center built for the **World Wide Vibes Hackathon 2026** (Public Safety Track, $5,000 prize pool). It protects the City of Montgomery, AL from a state takeover by proving that AI-assisted dispatch automation raises the functional officer ratio above the state mandate — **without new hires**.

**Deadline:** March 9, 2026 9am CT  
**Team:** TedsTech  
**Deploy target:** Vercel (`https://the-compliance-guardian.vercel.app`)

---

## The Problem in One Sentence

Alabama SB 298 requires Montgomery to maintain **2.0 sworn officers per 1,000 residents** (401 officers needed, 331 on staff). If unmet, the state (ALEA) assumes control. We prove **Effective Strength ≥ 2.0** through AI triage — no new hires required.

### Effective Strength Formula

```
Effective Strength = (Sworn Officers + Automated Admin Hours / Avg Shift Length)
                     ──────────────────────────────────────────────────────────
                                   City Population / 1,000
```

Key numbers:
- Sworn officers: **331**
- Population: **200,603**
- Target ratio: **≥ 2.0**
- Demonstrated ratio (with AI): **2.15**
- Non-emergency call automation threshold: **51.7%**

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 5 | JSX, ES modules, no TypeScript |
| Styling | Plain CSS per component | Dark "war room" theme, high contrast |
| AI | Google Gemini API (`@google/generative-ai`) | Gemini 2.0 Flash → deterministic fallback |
| Web Intel | Bright Data MCP (SSE transport) | 200 sponsored credits — cache aggressively |
| Civic Data | Montgomery ArcGIS FeatureServer | `services7.arcgis.com/xNUwUjOJqYE54USz` |
| Charts | Recharts | `RadialBarChart`, `LineChart` |
| Map | react-leaflet + Leaflet | 911 call density heatmap |

---

## Project Structure

```
src/
├── components/
│   ├── SovereigntyGauge.jsx      ← Hero radial gauge (ratio vs 2.0 mandate)
│   ├── ReasoningFeed.jsx         ← Streaming AI transparency log
│   ├── CrimeMap.jsx              ← Leaflet map, color-coded by emergency tier
│   ├── EffectiveStrengthCalc.jsx ← Live formula widget
│   ├── ComplianceROI.jsx         ← ROI projection line chart
│   └── OfficerROI.jsx            ← Officer efficiency widget
├── lib/
│   ├── brightdata.js             ← Bright Data MCP SSE client (with cache)
│   ├── montgomery911.js          ← ArcGIS FeatureServer client + mock fallback
│   └── ai.js                    ← Gemini client + deterministic fallback
├── App.jsx                       ← Main war room layout
└── main.jsx
```

---

## Environment Variables

All prefixed with `VITE_` (exposed to the browser by Vite):

```bash
VITE_BRIGHTDATA_TOKEN=          # Bright Data API token (200 sponsored credits)
VITE_BRIGHTDATA_GROUPS=         # Default: advanced_scraping,social,research
VITE_GEMINI_API_KEY=            # Google AI Studio key (free tier)
VITE_MONTGOMERY_ARCGIS_BASE=    # ArcGIS FeatureServer URL (falls back to hardcoded)
```

**Never commit `.env`.** Reference `.env.example` for the template.

---

## Data Layer — Key Rules

### Bright Data (`src/lib/brightdata.js`)

- Transport: **MCP over SSE** (not REST). One SSE connection per page load (singleton `_sessionPromise`).
- Auth: query param `?token=TOKEN&groups=GROUPS` — not a header.
- In dev, Vite proxies `/brightdata-sse` and `/brightdata-message` to avoid CORS.
- **Cache everything.** The module-level `cache` object keys results by `tool+query`. Never fire the same query twice.
- Tools used: `search_engine` (2 credits/call), `scrape_as_markdown` (3 credits/call).
- **Never auto-poll on an interval.** All calls must be user-initiated or load-once.

```javascript
// Correct usage — always check cache first (handled internally)
import { searchBrightData, scrapeUrl, getCacheStatus } from './lib/brightdata.js'

const results = await searchBrightData('SB 298 Alabama 2026', 5)
const article  = await scrapeUrl('https://example.com/news')
console.log(getCacheStatus()) // { cachedResults, cacheKeys, estimatedCreditsUsed }
```

### Montgomery 911 (`src/lib/montgomery911.js`)

- Source: ArcGIS FeatureServer `/query` with `outStatistics` + `groupByFieldsForStatistics`.
- Real schema fields: `Year`, `Month`, `Call_Category` (`Emergency` | `Non-Emergency`), `Call_Count_by_Phone_Service_Pro`.
- Always use `fetchMonthlySummary()` as the base; derive all stats from it.
- When the ArcGIS endpoint is unavailable, fall back to `generateMockCalls()`.

### AI (`src/lib/ai.js`)

- Export: `generateComplianceInsight({ ratio, emergency, nonEmergency, sb298Intel }, onChunk)`
- Tries Gemini 2.0 Flash first; on any error falls back to `buildFallbackInsight()` (deterministic, always accurate).
- System prompt is ≤150 words; output is always: verdict + 3 bullet efficiency wins.
- Pass `onChunk` callback for streaming updates to the `ReasoningFeed`.

---

## Component Conventions

- One `.jsx` + one `.css` file per component — no CSS-in-JS.
- UI theme: dark background (`#0a0e1a`), neon accent (`#00ff88`), danger red (`#ff4444`).
- All components receive data as props; no component fetches data directly.
- `App.jsx` owns all state and data fetching; passes down via props.
- Keep components focused. Avoid adding unrelated logic to existing components.

---

## Coding Standards

- **Language:** JavaScript (ES2022+), JSX — no TypeScript.
- **Modules:** ES modules (`import`/`export`), no CommonJS.
- **Async:** `async/await` — no raw `.then()` chains unless unavoidable.
- **Error handling:** All API calls must have try/catch; surface errors in the UI, never swallow silently.
- **No secrets in code:** All API keys come from `import.meta.env.VITE_*`.
- **Comments:** JSDoc on exported functions; inline comments for non-obvious logic.
- **No new dependencies** without a clear reason — the bundle must stay lean for Vercel free tier.

---

## Credit Budget (Strict)

| Use Case | Tool | Credits |
|----------|------|---------|
| SB 298 legislative status | `search_engine` | 2 (once on load, cached) |
| Montgomery news sentiment (WSFA + AL.com) | `scrape_as_markdown` | 6 (on demand, cached) |
| MPD / City Council news | `search_engine` | 3 (on demand, cached) |
| Reddit safety sentiment | `search_engine` | 3 (cached) |
| MPD job postings (GovernmentJobs.com) | `scrape_as_markdown` | 3 (on demand, cached) |
| Live demo buffer | Both | 20 |
| Dev/test | Both | 50 |
| Safety buffer | — | 113 |
| **Total** | — | **200** |

If adding any new Bright Data call, update the budget table in `README.md` and ensure results are cached.

---

## Judging Criteria (Keep These in Mind)

1. **Relevance** — Direct Public Safety track alignment; uses real Montgomery data.
2. **Execution Quality** — Live data (not mockups), deployed public URL.
3. **Originality** — Effective Strength formula is novel; no other team has this framing.
4. **Social Impact** — Real sovereignty crisis, real city.
5. **Commercial Potential** — Scalable SaaS for Class 3 Alabama municipalities.
6. **Bright Data Bonus** — MCP used for two distinct use cases (legislative intel + sentiment).

---

## Common Tasks

### Add a new Bright Data query
1. Add a new exported function in `src/lib/brightdata.js`.
2. Check `cache[key]` first; set it before returning.
3. Call it from `App.jsx`, pass result as props.
4. Update the credit budget table.

### Add a new component
1. Create `src/components/ComponentName.jsx` and `ComponentName.css`.
2. Follow the dark war-room color scheme.
3. Accept all data as props; no internal fetching.
4. Register in `App.jsx`.

### Debug Bright Data
```javascript
import { getCacheStatus } from './lib/brightdata.js'
console.log(getCacheStatus())
// { cachedResults: 3, cacheKeys: [...], estimatedCreditsUsed: 9 }
```

### Debug 911 Data
```javascript
import { generateMockCalls } from './lib/montgomery911.js'
const mock = generateMockCalls() // use when ArcGIS is unavailable
```

---

## Running the Project

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build locally
```

Vite runs on **port 5173** by default (check `vite.config.js` for proxy settings).

---

## Deployment

- Auto-deploys to Vercel on every push to `main`.
- Set all `VITE_*` env vars in the Vercel project dashboard.
- Production URL: `https://the-compliance-guardian.vercel.app`
