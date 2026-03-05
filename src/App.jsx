import { useState, useEffect } from 'react'
import SovereigntyGauge from './components/SovereigntyGauge'
import ReasoningFeed from './components/ReasoningFeed'
import CrimeMap from './components/CrimeMap'
import EffectiveStrengthCalc from './components/EffectiveStrengthCalc'
import ComplianceROI from './components/ComplianceROI'
import { monitorSB298, monitorRedditSentiment, scrapeLocalNewsSentiment, fetchLocalCityIntel, scrapeMPDJobPostings, getCacheStatus } from './lib/brightdata'
import { generateComplianceInsight } from './lib/ai'
import { getLatestMonthStats, generateMockMonthStats, getTierBreakdown, getTrendData, fetchCrimeIncidents } from './lib/montgomery911'
import OfficerROI from './components/OfficerROI'
import CallTriageSimulator from './components/CallTriageSimulator'
import './App.css'

function App() {
  const [callData, setCallData] = useState([])          // map dots (CrimeMap)
  const [monthStats, setMonthStats] = useState(null)      // ArcGIS monthly totals
  const [trendData, setTrendData] = useState([])          // 12-month chart data
  const [tierBreakdown, setTierBreakdown] = useState([])  // Officer ROI tiers
  const [automationRate, setAutomationRate] = useState(0.517) // 51.7% default
  const [effectiveStrength, setEffectiveStrength] = useState(2.15)
  const [reasoning, setReasoning] = useState([])
  const [loading, setLoading] = useState(false)
  const [localIntelLoaded, setLocalIntelLoaded] = useState(false)
  const [localIntelLoading, setLocalIntelLoading] = useState(false)
  const [jobIntelLoaded, setJobIntelLoaded] = useState(false)
  const [jobIntelLoading, setJobIntelLoading] = useState(false)

  const CURRENT_OFFICERS = 331
  const POPULATION = 200603
  const MANDATE_RATIO = 2.0
  const REQUIRED_OFFICERS = Math.ceil((MANDATE_RATIO * POPULATION) / 1000)
  const DEFICIT = REQUIRED_OFFICERS - CURRENT_OFFICERS

  useEffect(() => {
    const initialReasoning = [
      { timestamp: new Date().toLocaleTimeString(), message: '🚀 Compliance Guardian initialized...' },
      { timestamp: new Date().toLocaleTimeString(), message: '📊 Loading Montgomery 911 data stream...' },
      { timestamp: new Date().toLocaleTimeString(), message: '🔍 Analyzing SB 298 compliance status...' }
    ]
    setReasoning(initialReasoning)

    // Load 911 data
    load911Data()

    // Monitor SB 298 once on load — cached after first call
    monitorSB298()
      .then(result => {
        // Extract top organic results → format as readable lines with clickable links
        const items = result?.organic ?? result?.results ?? (Array.isArray(result) ? result : [])
        if (items.length > 0) {
          items.slice(0, 3).forEach(item => {
            const title = item.title || item.name || 'SB 298 Source'
            const url   = item.link || item.url || ''
            const line  = url ? `📰 SB 298: ${title} — ${url}` : `📰 SB 298: ${title}`
            addReasoningLog(line)
          })
        } else {
          const snippet = typeof result === 'string' ? result.slice(0, 150) : 'No results'
          addReasoningLog(`📰 SB 298 intel: ${snippet}`)
        }
      })
      .catch(() => addReasoningLog('⚠️ SB 298 monitor unavailable (check VITE_BRIGHTDATA_TOKEN)'))
  }, [])

  const load911Data = async () => {
    setLoading(true)
    try {
      // Try ArcGIS live data, fall back to mock on error
      let stats
      try {
        stats = await getLatestMonthStats()
        addReasoningLog(`📊 ArcGIS live data: ${stats.total.toLocaleString()} calls · ${stats.monthLabel}`)
      } catch {
        stats = generateMockMonthStats()
        addReasoningLog(`📊 Mock data (ArcGIS offline): ${stats.total.toLocaleString()} calls · ${stats.monthLabel}`)
      }

      setMonthStats(stats)
      setAutomationRate(stats.automationRate)

      // Fetch 12-month trend for the CrimeMap chart
      try {
        const trend = await getTrendData()
        setTrendData(trend)
      } catch {
        // non-fatal — chart will just be empty
      }

      const tiers = getTierBreakdown(stats)
      setTierBreakdown(tiers)

      const t2 = tiers.find(t => t.id === 2)
      const t3 = tiers.find(t => t.id === 3)
      const savedHours = (t2?.officerHours ?? 0) + (t3?.officerHours ?? 0)
      const newStrength = (CURRENT_OFFICERS + savedHours / 8) / (POPULATION / 1000)
      setEffectiveStrength(Math.max(1.0, Math.min(4.0, +newStrength.toFixed(3))))

      // Fetch real geo-located incident points from ArcGIS open data
      try {
        const incidents = await fetchCrimeIncidents({ limit: 1000 })
        setCallData(incidents)
        addReasoningLog(`📍 Mapped ${incidents.length.toLocaleString()} real incidents (OpenData YTD)`)
      } catch {
        addReasoningLog('⚠️ Incident map unavailable — map will be empty')
      }

      addReasoningLog(`🚨 Tier 1 (Protect): ${tiers[0]?.callCount.toLocaleString()} calls · ${tiers[0]?.officerHours}h`)
      addReasoningLog(`🤖 Tier 2 (Automate): ${tiers[1]?.callCount.toLocaleString()} calls · ${tiers[1]?.officerHours}h freed`)
      addReasoningLog(`🌐 Tier 3 (Deflect): ${tiers[2]?.callCount.toLocaleString()} calls · ${tiers[2]?.officerHours}h freed`)
    } catch (error) {
      addReasoningLog(`⚠️ Error loading 911 data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const addReasoningLog = (message) => {
    setReasoning(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message
    }])
  }

  const handleAutomationChange = (newRate) => {
    setAutomationRate(newRate)
    // Use real monthly non-emergency count when available
    const nonEmCalls = monthStats?.nonEmergency ?? (callData.length * newRate)
    const estimatedAutomatedHours = nonEmCalls * 1.0 // ~1 hr avg per non-emergency call
    const newEffectiveStrength = (CURRENT_OFFICERS + (estimatedAutomatedHours / 8)) / (POPULATION / 1000)
    setEffectiveStrength(Math.max(1.0, Math.min(4.0, +newEffectiveStrength.toFixed(3))))
    addReasoningLog(`⚙️ Automation rate adjusted to ${(newRate * 100).toFixed(1)}%`)
  }

  const triggerLiveAnalysis = async () => {
    // ── Phase 1: Bright Data Agent gathers live intel ──────────────────────
    addReasoningLog('🌐 [Bright Data Agent] Starting intel sweep...')
    setLoading(true)

    let sb298 = null, reddit = null, localNews = null

    try {
      // Run all three Bright Data queries in parallel to save time & credits
      addReasoningLog('🔍 [Bright Data Agent] Querying SB 298 status + Reddit sentiment + local news in parallel...')
      ;[sb298, reddit, localNews] = await Promise.allSettled([
        monitorSB298(),
        monitorRedditSentiment(),
        scrapeLocalNewsSentiment()
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null))

      if (sb298)    addReasoningLog(`📰 [Bright Data Agent → Gemini] SB 298 intel ready (${String(sb298).length} chars)`)
      if (reddit)   addReasoningLog(`💬 [Bright Data Agent → Gemini] Reddit sentiment ready (${String(reddit).length} chars)`)
      if (localNews) addReasoningLog(`🗞️ [Bright Data Agent → Gemini] Local news ready (${String(localNews).length} chars)`)

      const { cachedResults, estimatedCreditsUsed } = getCacheStatus()
      addReasoningLog(`✅ [Bright Data Agent] Intel sweep done — ${cachedResults} cached, ~${estimatedCreditsUsed} credits`)
    } catch (error) {
      addReasoningLog(`⚠️ [Bright Data Agent] Partial failure: ${error.message} — Proceeding with available data`)
    }

    // ── Phase 2: Gemini AI Agent analyzes 911 data + Bright Data intel ─────
    addReasoningLog('🤖 [Gemini Agent] Receiving Bright Data intel + 911 call data...')
    addReasoningLog('⚙️ [Gemini Agent] Synthesizing compliance analysis... (streaming)')

    let streamBuffer = ''
    let streamLogIndex = null

    try {
      await analyzeComplianceStatus(
        {
          calls: callData,
          currentRatio: effectiveStrength,
          mandate: MANDATE_RATIO,
          brightDataIntel: { sb298, reddit, localNews }
        },
        // onChunk: accumulate tokens and flush as a single live log entry
        (chunk) => {
          streamBuffer += chunk
          // Update the live streaming log entry rather than spamming new lines
          setReasoning(prev => {
            const updated = [...prev]
            if (streamLogIndex === null || streamLogIndex >= updated.length) {
              streamLogIndex = updated.length
              return [...updated, {
                timestamp: new Date().toLocaleTimeString(),
                message: `🤖 [Gemini Agent]: ${streamBuffer}`
              }]
            } else {
              updated[streamLogIndex] = {
                ...updated[streamLogIndex],
                message: `🤖 [Gemini Agent]: ${streamBuffer}`
              }
              return updated
            }
          })
        }
      )
      addReasoningLog('✅ [Gemini Agent] Analysis complete — multi-agent pipeline finished.')
    } catch (aiError) {
      addReasoningLog(`❌ [Gemini Agent] Analysis failed: ${aiError.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Strip scraped markdown down to real sentences — drop nav, links, and boilerplate.
   * Returns up to `maxLines` clean lines joined by " · "
   */
  const summarizeScrape = (raw, maxLines = 3) => {
    if (!raw || typeof raw !== 'string') return null
    return raw
      .split('\n')
      .map(l => l.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim()) // [text](url) → text
      .filter(l =>
        l.length > 40 &&                          // skip short nav labels
        !/^[#>\-\[\]\\*|]/.test(l) &&             // skip markdown headings/lists/tables
        !/skip to|subscribe|cookie|newsletter|weather|watch live|close menu/i.test(l) &&
        !/^https?:\/\//.test(l)                   // skip bare URLs
      )
      .slice(0, maxLines)
      .join(' · ')
      .slice(0, 300)
  }

  /**
   * Format search_engine results (array of {title, url, description}) into one readable line.
   */
  const summarizeSearch = (raw, maxResults = 3) => {
    const items = Array.isArray(raw) ? raw : (raw?.results ?? raw?.organic_results ?? [])
    if (!items.length) return typeof raw === 'string' ? raw.slice(0, 300) : null
    return items
      .slice(0, maxResults)
      .map(r => `"${r.title || r.name || '—'}"${r.description ? ` — ${String(r.description).slice(0, 80)}` : ''}`)
      .join(' | ')
  }

  /**
   * Parse GovernmentJobs page — extract police position titles.
   * An empty pipeline is itself strong evidence for the AI argument.
   */
  const summarizeJobPostings = (raw) => {
    if (!raw || typeof raw !== 'string') return null
    const lines = raw
      .split('\n')
      .map(l => l.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim())
      .filter(l =>
        l.length > 10 &&
        !/^[#>\-\[\]\\*|]/.test(l) &&
        !/skip to|cookie|newsletter|sign in|create account|filter|sort by|all jobs/i.test(l) &&
        !/^https?:\/\//.test(l)
      )
    const jobLines = lines.filter(l =>
      /police|officer|dispatch|patrol|detective|sergeant|lieutenant|recruit|cadet/i.test(l)
    )
    if (jobLines.length === 0) {
      return '0 open police positions found — MPD hiring pipeline is empty'
    }
    const titles = jobLines.slice(0, 3).join(' · ')
    return `${jobLines.length} open position${jobLines.length !== 1 ? 's' : ''}: ${titles}`
  }

  const loadJobPostings = async () => {
    if (jobIntelLoaded) return
    setJobIntelLoading(true)
    addReasoningLog('💼 [Bright Data Agent] Scraping MPD job postings (GovernmentJobs.com)...')
    try {
      const raw = await scrapeMPDJobPostings()
      const summary = summarizeJobPostings(raw)
      if (summary) {
        addReasoningLog(`👮 MPD Hiring Status: ${summary}`)
        addReasoningLog('📌 Evidence: Slow/empty pipeline confirms AI automation is the only viable path to SB 298 compliance')
      } else {
        addReasoningLog('💼 MPD Job Postings: Retrieved (no structured listings parsed)')
      }
      const { estimatedCreditsUsed } = getCacheStatus()
      addReasoningLog(`✅ Job intel cached — ~${estimatedCreditsUsed} total credits used this session`)
      setJobIntelLoaded(true)
    } catch (err) {
      addReasoningLog(`⚠️ Job postings fetch failed: ${err.message}`)
    } finally {
      setJobIntelLoading(false)
    }
  }

  const loadLocalCityIntel = async () => {
    if (localIntelLoaded) return // already cached — do not re-spend credits
    setLocalIntelLoading(true)
    addReasoningLog('🏙️ [Bright Data Agent] Fetching local Montgomery city intel...')
    try {
      const { wsfa, alcom, mpd } = await fetchLocalCityIntel()

      const wsfaSummary  = summarizeScrape(wsfa)
      const alcomSummary = summarizeScrape(alcom)
      const mpdSummary   = summarizeSearch(mpd)

      if (wsfaSummary)  addReasoningLog(`📺 WSFA 12 News: ${wsfaSummary}`)
      else if (wsfa)    addReasoningLog('📺 WSFA 12 News: Retrieved (no readable text extracted)')

      if (alcomSummary)  addReasoningLog(`📰 AL.com Montgomery: ${alcomSummary}`)
      else if (alcom)    addReasoningLog('📰 AL.com Montgomery: Retrieved (no readable text extracted)')

      if (mpdSummary)  addReasoningLog(`🚔 MPD / City Council: ${mpdSummary}`)
      else if (mpd)    addReasoningLog('🚔 MPD / City Council: Retrieved (no results parsed)')

      const { estimatedCreditsUsed } = getCacheStatus()
      addReasoningLog(`✅ Local intel cached — ~${estimatedCreditsUsed} total credits used this session`)
      setLocalIntelLoaded(true)
    } catch (err) {
      addReasoningLog(`⚠️ Local intel partial failure: ${err.message}`)
    } finally {
      setLocalIntelLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="war-room-header">
        <h1>⚖️ COMPLIANCE GUARDIAN</h1>
        <p className="subtitle">Montgomery Police Efficiency Optimization | SB 298 Compliance Monitor</p>
      </header>

      <div className="main-grid">
        {/* Left Column: Gauges & Metrics */}
        <div className="column-left">
          <SovereigntyGauge 
            currentRatio={effectiveStrength} 
            mandate={MANDATE_RATIO}
            status={effectiveStrength >= MANDATE_RATIO ? 'compliant' : 'at-risk'}
          />
          
          <EffectiveStrengthCalc 
            currentOfficers={CURRENT_OFFICERS}
            population={POPULATION}
            automationRate={automationRate}
            effectiveRatio={effectiveStrength}
          />
          
          <ComplianceROI 
            deficit={DEFICIT}
            currentRatio={effectiveStrength}
            mandateRatio={MANDATE_RATIO}
            automationRate={automationRate}
          />
        </div>

        {/* Center Column: Map + Officer ROI */}
        <div className="column-center">
          <CrimeMap 
            calls={callData}
            liveStats={monthStats}
            trendData={trendData}
            loading={loading}
            title="Montgomery 911 Call Density Heatmap"
          />
          <OfficerROI
            tierBreakdown={tierBreakdown}
            totalCalls={monthStats?.total ?? 0}
            loading={loading}
          />
          <CallTriageSimulator onAutomationUpdate={handleAutomationChange} />
        </div>

        {/* Right Column: AI Reasoning Feed */}
        <div className="column-right">
          <ReasoningFeed 
            logs={reasoning}
            onTriggerAnalysis={triggerLiveAnalysis}
            loading={loading}
          />
          <button 
            className="btn-analyze btn-refresh"
            onClick={load911Data}
            disabled={loading}
          >
            {loading ? 'Loading...' : '🔄 Refresh 911 Data'}
          </button>
          <button
            className={`btn-analyze btn-intel${localIntelLoaded ? ' btn-cached' : ''}`}
            onClick={loadLocalCityIntel}
            disabled={localIntelLoading || localIntelLoaded}
            title={localIntelLoaded ? 'Local intel cached — no credits needed' : 'Scrape WSFA 12, AL.com, and MPD news (~8 credits)'}
          >
            {localIntelLoading ? '📡 Loading...' : localIntelLoaded ? '✅ Local Intel Cached' : '🏙️ Load Local City Intel'}
          </button>
          <button
            className={`btn-analyze btn-jobs${jobIntelLoaded ? ' btn-cached' : ''}`}
            onClick={loadJobPostings}
            disabled={jobIntelLoading || jobIntelLoaded}
            title={jobIntelLoaded ? 'Job intel cached — no credits needed' : 'Scrape MPD open job postings (~3 credits)'}
          >
            {jobIntelLoading ? '📡 Loading...' : jobIntelLoaded ? '✅ Job Intel Cached' : '💼 Check MPD Hiring Pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
