import { useState, useEffect } from 'react'
import { brightDataSearch } from '../lib/brightdata'
import './CallTriageSimulator.css'

// ─── Sample calls for demo mode ───────────────────────────────────────────────
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

function keywordClassify(description) {
  const EMERGENCY = /shoot|shot|gun|stab|knife|weapon|fire|smoke|burn|robbery|rob|assault|attack|fight|brawl|crash|accident|injur|bleed|unconscious|hostage|kidnap|bomb|threat|break.?in|intruder|domestic|overdose|heart attack|stroke|seizure|not breathing|suicide|homicide|murder|carjack/i
  const INFO      = /hours of operation|business hours|operating hours|what time (does|do|is)|when (does|do) .* (open|close)|where (do|can) i (pay|get|find|report|apply)|how (do|can) i (pay|get|report|apply|renew|register)|phone number|website|pay (a|my)? (ticket|fine|fee|bill)|cost of|fee for|renew|register|permit|apply|application|driver.?s license|\bdmv\b|city hall|report online|self.?report|directions to/i

  if (EMERGENCY.test(description)) return { detectedTier: 1, classificationText: 'EMERGENCY — immediate threat to life or safety' }
  if (INFO.test(description))      return { detectedTier: 3, classificationText: 'TIER3_INFO — caller needs information, no dispatch required' }
                                   return { detectedTier: 2, classificationText: 'TIER2_ADMIN — non-emergency, report or admin action needed' }
}

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
  return keywordClassify(call.description)
}

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
  return `Case Type: Property Damage / Minor Incident
Location: To be confirmed by caller
Incident Summary: ${description.slice(0, 80)}
Recommended Action: Submit online report at montgomeryal.gov/police — no dispatch needed
Estimated Resolution: Online form + 24hr review`
}

async function answerInfoQuery(description) {
  try {
    const results = await brightDataSearch(
      `${description} Montgomery Alabama`,
      `triage-info-${description.slice(0, 30)}`
    )
    if (Array.isArray(results) && results.length > 0) {
      const top = results[0]
      return `${top.title || ''}: ${String(top.description || top.snippet || '').slice(0, 180)}`
    }
    if (typeof results === 'string') return results.slice(0, 200)
    return 'No live results found — directing caller to montgomeryal.gov'
  } catch {
    if (/DMV|driver/i.test(description))
      return 'Montgomery DMV (334-242-4400) is open Mon–Fri 8am–4:30pm. Online renewals available at alabamadmv.org'
    if (/abandoned/i.test(description))
      return 'Report abandoned vehicles online at montgomeryal.gov/publicworks or call 311. No officer dispatch needed.'
    return 'Please visit montgomeryal.gov or call 311 for non-emergency city services.'
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CallTriageSimulator({ onAutomationUpdate }) {
  const [queue, setQueue] = useState([])
  const [running, setRunning] = useState(false)
  const [processingLive, setProcessingLive] = useState(false)
  const [currentCallId, setCurrentCallId] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [inputText, setInputText] = useState('')
  const [copied, setCopied] = useState({})

  // Notify parent whenever queue changes
  useEffect(() => {
    if (queue.length === 0 || !onAutomationUpdate) return
    const autoCount = queue.filter(r => r.isNonEmergency).length
    onAutomationUpdate(autoCount / queue.length)
  }, [queue.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core: run one call through the triage pipeline and append to queue ──────
  const processCall = async (call) => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const processedAt = new Date().toLocaleTimeString()

    const { detectedTier, classificationText } = await classifyCall(call)
    const meta = TIER_META[detectedTier]

    const entry = {
      uid,
      processedAt,
      description: call.description,
      detectedTier,
      classificationText,
      isNonEmergency: detectedTier !== 1,
      timeSaved: meta.timeSaved,
      aiOutput: null,
      aiOutputLabel: null,
      aiLoading: detectedTier !== 1,
    }

    // Prepend so newest call appears at top
    setQueue(prev => [entry, ...prev])
    await new Promise(r => setTimeout(r, 300))

    if (detectedTier === 2) {
      const report = await generateIncidentReport(call.description)
      setQueue(prev => prev.map(e =>
        e.uid === uid
          ? { ...e, aiOutput: report, aiOutputLabel: '📋 Incident Report', aiLoading: false }
          : e
      ))
    } else if (detectedTier === 3) {
      const answer = await answerInfoQuery(call.description)
      setQueue(prev => prev.map(e =>
        e.uid === uid
          ? { ...e, aiOutput: answer, aiOutputLabel: '🌐 Live Answer', aiLoading: false }
          : e
      ))
    }
  }

  // ── Live: dispatcher types a real call ──────────────────────────────────────
  const handleSubmitCall = async () => {
    const desc = inputText.trim()
    if (!desc || processingLive || running) return
    setProcessingLive(true)
    setInputText('')
    await processCall({ description: desc, tier: 2 })
    setProcessingLive(false)
  }

  // ── Demo: run 6 sample calls ────────────────────────────────────────────────
  const runDemo = async () => {
    setRunning(true)
    for (const call of SAMPLE_CALLS) {
      setCurrentCallId(call.id)
      await processCall(call)
      await new Promise(r => setTimeout(r, 200))
    }
    setCurrentCallId(null)
    setRunning(false)
  }

  // ── Copy output to clipboard ────────────────────────────────────────────────
  const copyToClipboard = async (uid, text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for non-HTTPS contexts
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(prev => ({ ...prev, [uid]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [uid]: false })), 2000)
  }

  // ── Export session as printable PDF report ──────────────────────────────────
  const exportSessionReport = () => {
    if (queue.length === 0) return

    const now = new Date().toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    const totalTimeSaved = queue.reduce((s, r) => s + r.timeSaved, 0)
    const dispatchCount  = queue.filter(r => !r.isNonEmergency).length
    const reportsFiled   = queue.filter(r => r.detectedTier === 2).length
    const queriesAnswered = queue.filter(r => r.detectedTier === 3).length

    const callRows = [...queue].reverse().map((r, i) => {
      const tierLabel = r.detectedTier === 1 ? 'DISPATCHED' : r.detectedTier === 2 ? 'AI REPORT' : 'INFO ANSWERED'
      const outputRow = r.aiOutput
        ? `<tr><td></td><td colspan="4" class="report-output">${r.aiOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</td></tr>`
        : ''
      return `
        <tr>
          <td>${i + 1}</td>
          <td style="white-space:nowrap">${r.processedAt || ''}</td>
          <td><strong>${tierLabel}</strong></td>
          <td>${r.description.replace(/</g, '&lt;')}</td>
          <td>${r.timeSaved > 0 ? r.timeSaved + ' min' : '—'}</td>
        </tr>${outputRow}`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>MPD AI Triage Report — ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 1.5cm; color: #111; font-size: 13px; }
  h1 { font-size: 17px; margin: 0 0 4px; border-bottom: 2px solid #111; padding-bottom: 8px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
  .stat-box { border: 1px solid #ccc; padding: 10px; text-align: center; border-radius: 4px; }
  .stat-num { font-size: 26px; font-weight: 700; }
  .stat-lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f0f0f0; padding: 7px 8px; text-align: left; border: 1px solid #ccc; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 6px 8px; border: 1px solid #e0e0e0; vertical-align: top; }
  .report-output { background: #f7f7f7; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.5; }
  .footer { margin-top: 1.5cm; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; line-height: 1.6; }
  @media print { body { margin: 1cm; } }
</style></head><body>
<h1>Montgomery Police Department — AI-Assisted Call Triage Report</h1>
<div class="meta">
  Generated: ${now} &nbsp;|&nbsp; System: Compliance Guardian &nbsp;|&nbsp; Purpose: SB 298 Compliance Documentation
</div>
<div class="stats">
  <div class="stat-box"><div class="stat-num">${queue.length}</div><div class="stat-lbl">Total Calls</div></div>
  <div class="stat-box"><div class="stat-num" style="color:#cc0000">${dispatchCount}</div><div class="stat-lbl">Officers Dispatched</div></div>
  <div class="stat-box"><div class="stat-num" style="color:#cc7700">${reportsFiled}</div><div class="stat-lbl">AI Reports Filed</div></div>
  <div class="stat-box"><div class="stat-num" style="color:#007700">${totalTimeSaved} min</div><div class="stat-lbl">Officer Time Saved</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Time</th><th>Action Taken</th><th>Call Description</th><th>Time Saved</th></tr></thead>
  <tbody>${callRows}</tbody>
</table>
<div class="footer">
  This report documents AI-assisted call triage for SB 298 compliance purposes. Non-emergency calls handled by AI automation
  count toward Montgomery's Effective Strength ratio under the officer-equivalency calculation (${reportsFiled} AI reports filed,
  ${queriesAnswered} queries answered without dispatch = ${totalTimeSaved} officer-minutes reclaimed this session).<br>
  Compliance Guardian · Montgomery Police Department · Generated ${new Date().getFullYear()}
</div>
</body></html>`

    const w = window.open('', '_blank')
    if (!w) { alert('Allow pop-ups to export the report.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    // Small delay so styles render before print dialog
    setTimeout(() => w.print(), 400)
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalTimeSaved = queue.reduce((s, r) => s + r.timeSaved, 0)
  const dispatchCount  = queue.filter(r => !r.isNonEmergency).length
  const toggleExpand   = (uid) => setExpanded(prev => ({ ...prev, [uid]: !prev[uid] }))

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="triage-simulator">
      <div className="triage-header">
        <h3>🚨 Live Call Triage</h3>
        <p className="triage-subtitle">
          Type what the caller is reporting — AI classifies, files the report, or answers the query instantly
        </p>
      </div>

      {/* Live input — primary action */}
      <div className="call-input-row">
        <input
          className="call-input"
          type="text"
          placeholder="What is the caller reporting? (press Enter or click Triage)"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmitCall()}
          disabled={processingLive || running}
          aria-label="Call description"
        />
        <button
          className="btn-submit-call"
          onClick={handleSubmitCall}
          disabled={!inputText.trim() || processingLive || running}
        >
          {processingLive ? '⟳' : '▶ Triage'}
        </button>
      </div>

      {/* Demo button — secondary */}
      <button
        className="btn-triage btn-demo"
        onClick={runDemo}
        disabled={running || processingLive}
      >
        {running
          ? `⏳ Processing call ${currentCallId} of ${SAMPLE_CALLS.length}...`
          : '▶ Load 6 Demo Calls'}
      </button>

      {/* Session stats + queue — only shown once calls exist */}
      {queue.length > 0 && (
        <>
          <div className="triage-stats">
            <div className="triage-stat">
              <span className="stat-value" style={{ color: '#ff4444' }}>{dispatchCount}</span>
              <span className="stat-label">Dispatched</span>
            </div>
            <div className="triage-stat">
              <span className="stat-value" style={{ color: '#ffaa00' }}>{queue.filter(r => r.detectedTier === 2).length}</span>
              <span className="stat-label">Reports Filed</span>
            </div>
            <div className="triage-stat">
              <span className="stat-value" style={{ color: '#44aaff' }}>{queue.filter(r => r.detectedTier === 3).length}</span>
              <span className="stat-label">Queries Answered</span>
            </div>
            <div className="triage-stat">
              <span className="stat-value neon">{totalTimeSaved} min</span>
              <span className="stat-label">Time Saved</span>
            </div>
          </div>

          <div className="triage-list">
            {queue.map(r => {
              const meta   = TIER_META[r.detectedTier]
              const isOpen = expanded[r.uid]
              return (
                <div key={r.uid} className={`triage-item tier-${r.detectedTier}`}>
                  <div>
                    <div className="triage-badge" style={{ color: meta.color }}>{meta.badge}</div>
                    {r.processedAt && (
                      <div className="triage-time">{r.processedAt}</div>
                    )}
                  </div>
                  <div className="triage-content">
                    <p className="triage-call">"{r.description}"</p>
                    <p className="triage-result">{r.classificationText}</p>

                    {r.isNonEmergency && (
                      <p className="triage-saving">⏱ ~{r.timeSaved} min officer time saved</p>
                    )}

                    {r.aiLoading && (
                      <div className="ai-output-loading">⟳ AI processing…</div>
                    )}

                    {r.aiOutput && (
                      <div className="ai-output-wrapper">
                        <div className="ai-output-actions">
                          <button
                            className="ai-output-toggle"
                            style={{ color: meta.color, borderColor: meta.color + '44' }}
                            onClick={() => toggleExpand(r.uid)}
                          >
                            {r.aiOutputLabel} {isOpen ? '▲' : '▼'}
                          </button>
                          <button
                            className="btn-copy"
                            onClick={() => copyToClipboard(r.uid, r.aiOutput)}
                          >
                            {copied[r.uid] ? '✅ Copied' : '📋 Copy'}
                          </button>
                        </div>
                        {isOpen && (
                          <pre className="ai-output-body">{r.aiOutput}</pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button className="btn-export" onClick={exportSessionReport}>
            📄 Export Session Report (Print / Save as PDF)
          </button>
        </>
      )}
    </div>
  )
}
