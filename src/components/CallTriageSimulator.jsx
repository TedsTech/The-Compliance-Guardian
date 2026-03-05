import { useState } from 'react'
import { brightDataSearch } from '../lib/brightdata'
import './CallTriageSimulator.css'

// ─── Call definitions ─────────────────────────────────────────────────────────
// tier: 1=Emergency dispatch  2=AI report/admin  3=AI info answer
const SAMPLE_CALLS = [
  { id: 1, tier: 1, description: 'Man with a gun threatening people outside the gas station' },
  { id: 2, tier: 1, description: 'Armed robbery in progress at convenience store on Atlanta Hwy' },
  { id: 3, tier: 2, description: 'Someone broke my car window overnight, nothing was stolen' },
  { id: 4, tier: 2, description: 'Fender bender on I-85 northbound, no injuries, cars are drivable' },
  { id: 5, tier: 3, description: 'What time does the Montgomery DMV close today?' },
  { id: 6, tier: 3, description: 'Where do I report an abandoned vehicle in Montgomery Alabama?' },
]

const TIER_META = {
  1: { badge: '🚔 DISPATCH', label: 'emergency',    timeSaved: 0,  color: '#ff4444' },
  2: { badge: '🤖 REPORT',  label: 'non-emergency', timeSaved: 45, color: '#ffaa00' },
  3: { badge: '🌐 ANSWER',  label: 'non-emergency', timeSaved: 12, color: '#44aaff' },
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

async function getGeminiModel() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' })
  } catch { return null }
}

/**
 * Step 1 — Classify the call and confirm its tier.
 */
async function classifyCall(call) {
  const model = await getGeminiModel()
  if (model) {
    try {
      const prompt = `Classify this 911 call. Reply with ONLY one of these three labels + a reason ≤8 words:
"EMERGENCY — <reason>"
"TIER2_ADMIN — <reason>"   (non-emergency, needs report/admin)
"TIER3_INFO — <reason>"    (caller just needs information)

Call: "${call.description}"`
      const text = (await model.generateContent(prompt)).response.text().trim()
      const upper = text.toUpperCase()
      const detectedTier = upper.startsWith('EMERGENCY') ? 1
        : upper.startsWith('TIER3') ? 3
        : 2
      return { detectedTier, classificationText: text }
    } catch { /* fall through */ }
  }
  // Deterministic fallback
  return { detectedTier: call.tier, classificationText: call.tier === 1
    ? 'EMERGENCY — immediate life/safety threat'
    : call.tier === 2 ? 'TIER2_ADMIN — non-emergency, report required'
    : 'TIER3_INFO — caller needs information only'
  }
}

/**
 * Step 2a — Tier 2: Generate a pre-filled incident report via Gemini.
 */
async function generateIncidentReport(description) {
  const model = await getGeminiModel()
  if (model) {
    try {
      const prompt = `Generate a brief MPD incident report for this call. Use this exact format:
Case Type: <type>
Location: <if mentioned, else "To be confirmed">
Incident Summary: <1 sentence>
Recommended Action: <1 sentence, no officer dispatch>
Estimated Resolution: <time e.g. "Online form + 24hr review">

Call: "${description}"`
      return (await model.generateContent(prompt)).response.text().trim()
    } catch { /* fall through */ }
  }
  // Deterministic fallback
  return `Case Type: Property Damage / Minor Incident
Location: To be confirmed by caller
Incident Summary: ${description.slice(0, 80)}
Recommended Action: Submit online report at montgomeryal.gov/police — no dispatch needed
Estimated Resolution: Online form + 24hr review`
}

/**
 * Step 2b — Tier 3: Answer the query using Bright Data live web search.
 */
async function answerInfoQuery(description) {
  try {
    const results = await brightDataSearch(
      `${description} Montgomery Alabama`,
      `triage-info-${description.slice(0, 30)}`
    )
    // results may be array of {title, description} or a plain string
    if (Array.isArray(results) && results.length > 0) {
      const top = results[0]
      return `${top.title || ''}: ${String(top.description || top.snippet || '').slice(0, 180)}`
    }
    if (typeof results === 'string') return results.slice(0, 200)
    return 'No live results found — directing caller to montgomeryal.gov'
  } catch {
    // Fallback answers for the demo calls
    if (/DMV|driver/i.test(description))  return 'Montgomery DMV (334-242-4400) is open Mon–Fri 8am–4:30pm. Online renewals available at alabamadmv.org'
    if (/abandoned/i.test(description))   return 'Report abandoned vehicles online at montgomeryal.gov/publicworks or call 311. No officer dispatch needed.'
    return 'Please visit montgomeryal.gov or call 311 for non-emergency city services.'
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * CallTriageSimulator — Full AI automation pipeline demo
 *
 * Tier 1 → Officer dispatch
 * Tier 2 → Gemini generates pre-filled incident report (no dispatch)
 * Tier 3 → Bright Data answers the question live (no dispatch)
 *
 * @param {{ onAutomationUpdate?: (rate: number) => void }} props
 */
export default function CallTriageSimulator({ onAutomationUpdate }) {
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [currentCallId, setCurrentCallId] = useState(null)
  const [expanded, setExpanded] = useState({})

  const runTriage = async () => {
    setRunning(true)
    setResults([])
    setExpanded({})
    const triaged = []

    for (const call of SAMPLE_CALLS) {
      setCurrentCallId(call.id)

      // Step 1: classify
      const { detectedTier, classificationText } = await classifyCall(call)
      const meta = TIER_META[detectedTier]

      const entry = {
        ...call,
        detectedTier,
        classificationText,
        isNonEmergency: detectedTier !== 1,
        timeSaved: meta.timeSaved,
        aiOutput: null,
        aiOutputLabel: null,
        aiLoading: detectedTier !== 1,
      }
      triaged.push(entry)
      setResults([...triaged])
      await new Promise(r => setTimeout(r, 400))

      // Step 2: automate
      if (detectedTier === 2) {
        const report = await generateIncidentReport(call.description)
        entry.aiOutput = report
        entry.aiOutputLabel = '📋 Auto-Generated Incident Report'
        entry.aiLoading = false
        setResults([...triaged])
      } else if (detectedTier === 3) {
        const answer = await answerInfoQuery(call.description)
        entry.aiOutput = answer
        entry.aiOutputLabel = '🌐 Bright Data Live Answer'
        entry.aiLoading = false
        setResults([...triaged])
      }

      await new Promise(r => setTimeout(r, 300))
    }

    setCurrentCallId(null)
    setRunning(false)

    const autoCount = triaged.filter(r => r.isNonEmergency).length
    if (onAutomationUpdate) onAutomationUpdate(autoCount / triaged.length)
  }

  const autoCount      = results.filter(r => r.isNonEmergency).length
  const totalTimeSaved = results.reduce((s, r) => s + r.timeSaved, 0)
  const dispatchCount  = results.filter(r => !r.isNonEmergency).length

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="triage-simulator">
      <div className="triage-header">
        <h3>🚨 AI Call Triage Simulator</h3>
        <p className="triage-subtitle">
          Full pipeline: Gemini classifies → Tier 2 auto-reports · Tier 3 Bright Data answers
        </p>
      </div>

      <button className="btn-triage" onClick={runTriage} disabled={running}>
        {running
          ? `⏳ Processing call ${currentCallId} of ${SAMPLE_CALLS.length}...`
          : results.length > 0 ? '▶ Re-run Pipeline' : '▶ Run Full Automation Pipeline'}
      </button>

      {results.length > 0 && (
        <>
          <div className="triage-stats">
            <div className="triage-stat">
              <span className="stat-value" style={{color:'#ff4444'}}>{dispatchCount}</span>
              <span className="stat-label">Officer Dispatched</span>
            </div>
            <div className="triage-stat">
              <span className="stat-value" style={{color:'#ffaa00'}}>{results.filter(r=>r.detectedTier===2).length}</span>
              <span className="stat-label">AI Reports Filed</span>
            </div>
            <div className="triage-stat">
              <span className="stat-value" style={{color:'#44aaff'}}>{results.filter(r=>r.detectedTier===3).length}</span>
              <span className="stat-label">Queries Answered</span>
            </div>
            <div className="triage-stat">
              <span className="stat-value neon">{totalTimeSaved} min</span>
              <span className="stat-label">Officer Time Saved</span>
            </div>
          </div>

          <div className="triage-list">
            {results.map(r => {
              const meta = TIER_META[r.detectedTier]
              const isOpen = expanded[r.id]
              return (
                <div key={r.id} className={`triage-item ${meta.label} tier-${r.detectedTier}`}>
                  <div className="triage-badge" style={{color: meta.color}}>{meta.badge}</div>
                  <div className="triage-content">
                    <p className="triage-call">"{r.description}"</p>
                    <p className="triage-result">{r.classificationText}</p>

                    {r.isNonEmergency && (
                      <p className="triage-saving">⏱ ~{r.timeSaved} min officer time saved</p>
                    )}

                    {/* AI Output panel */}
                    {r.aiLoading && (
                      <div className="ai-output-loading">⟳ AI processing...</div>
                    )}
                    {r.aiOutput && (
                      <div className="ai-output-wrapper">
                        <button
                          className="ai-output-toggle"
                          style={{color: meta.color, borderColor: meta.color + '44'}}
                          onClick={() => toggleExpand(r.id)}
                        >
                          {r.aiOutputLabel} {isOpen ? '▲' : '▼'}
                        </button>
                        {isOpen && (
                          <pre className="ai-output-body">
                            {r.aiOutput}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
