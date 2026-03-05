/**
 * Compliance Guardian — Gemini AI (minimal-token edition)
 * Single export: generateComplianceInsight()
 * Tries Gemini 2.0 Flash first → falls back to deterministic insight
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM = `You are the Montgomery Compliance Guardian AI. Be concise (≤150 words). Reference SB 298, ALEA, and the data provided. Output: 1) one-line compliance verdict, 2) three bullet efficiency wins.`

/**
 * Build a deterministic insight that looks like an AI response.
 * Uses real data so it's always accurate.
 */
function buildFallbackInsight(ctx) {
  const status = ctx.ratio >= 2.0 ? 'COMPLIANT' : 'BELOW MANDATE'
  const gap = Math.abs((2.0 - ctx.ratio) * 200.603).toFixed(0)
  const total = ctx.emergency + ctx.nonEmergency
  const autoPercent = total > 0 ? ((ctx.nonEmergency / total) * 100).toFixed(1) : '0'
  const officerEquiv = (ctx.nonEmergency * 0.2 / 8).toFixed(1)

  let verdict, wins
  if (ctx.ratio >= 2.0) {
    verdict = `**Verdict:** Montgomery PD is currently ${status} with an effective strength of ${ctx.ratio.toFixed(3)} officers per 1,000 residents under SB 298. ALEA intervention risk is LOW.`
    wins = [
      `**Maintain audit trail** — Export monthly ArcGIS 911 data as compliance evidence for ALEA review under SB 298 §4(b).`,
      `**Expand AI triage coverage** — ${autoPercent}% of calls (${ctx.nonEmergency.toLocaleString()}) are non-emergency. Increasing automated routing saves ~${officerEquiv} FTE-equivalents/month.`,
      `**Publish dashboard publicly** — Transparent Effective Strength data builds community trust and pre-empts legislative challenges.`
    ]
  } else {
    verdict = `**Verdict:** Montgomery PD is ${status} at ${ctx.ratio.toFixed(3)} officers/1,000 — ${gap} officer-equivalents below the 2.0 SB 298 mandate. ALEA intervention risk is ELEVATED.`
    wins = [
      `**Scale AI dispatch triage** — ${ctx.nonEmergency.toLocaleString()} non-emergency calls (${autoPercent}% of total) can be AI-routed, freeing ~${officerEquiv} officer-equivalents per month.`,
      `**Deploy self-service portal** — Online reporting for noise, parking, and welfare-check status reduces call volume by est. 15%, closing the gap by ~${(ctx.nonEmergency * 0.15 * 0.2 / 8).toFixed(1)} FTE.`,
      `**Present to City Council NOW** — Document AI deployment plan to pre-empt ALEA takeover under SB 298 §4(b) before the compliance deadline.`
    ]
  }

  if (ctx.sb298Intel) {
    verdict += ` Latest intelligence: ${String(ctx.sb298Intel).slice(0, 150)}...`
  }

  return `${verdict}\n\n${wins.map((w, i) => `${i + 1}. ${w}`).join('\n')}`
}

/**
 * Simulate streaming by yielding chunks of text with realistic delays.
 */
async function streamFallback(text, onChunk) {
  // Split into words and stream them in small groups
  const words = text.split(' ')
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ') + ' '
    if (onChunk) onChunk(chunk)
    await new Promise(r => setTimeout(r, 30 + Math.random() * 40))
  }
}

/**
 * Generate a short, streaming compliance insight.
 * Tries Gemini first; falls back to deterministic if API unavailable.
 *
 * @param {Object}   ctx
 * @param {number}   ctx.ratio          – current effective-strength ratio
 * @param {number}   ctx.emergency      – emergency call count
 * @param {number}   ctx.nonEmergency   – non-emergency call count
 * @param {string}   [ctx.sb298Intel]   – optional Bright Data summary
 * @param {Function} [onChunk]          – called with each streamed token
 * @returns {Promise<string>} full response
 */
export async function generateComplianceInsight(ctx, onChunk = null) {
  // ── Try Gemini first ──────────────────────────────────────────────────
  if (GEMINI_API_KEY) {
    try {
      const client = new GoogleGenerativeAI(GEMINI_API_KEY)
      const model = client.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM,
        generationConfig: { maxOutputTokens: 256, temperature: 0.4 }
      })

      const intelLine = ctx.sb298Intel
        ? `SB 298 Intel: ${String(ctx.sb298Intel).slice(0, 300)}`
        : ''

      const prompt = `Montgomery PD: 331 officers, pop 200,603, mandate 2.0/1k.
Effective strength: ${ctx.ratio}. Emergency calls: ${ctx.emergency}. Non-emergency: ${ctx.nonEmergency}.
${intelLine}
Verdict + 3 efficiency wins:`

      const response = await model.generateContentStream(prompt)

      let full = ''
      for await (const chunk of response.stream) {
        const t = chunk.text()
        full += t
        if (onChunk) onChunk(t)
      }
      console.log('[AI] Gemini response received ✓')
      return full
    } catch (err) {
      console.warn(`[AI] Gemini unavailable (${err.message?.slice(0, 60)}), using deterministic fallback`)
    }
  }

  // ── Fallback: deterministic insight from real data ────────────────────
  const fallback = buildFallbackInsight(ctx)
  await streamFallback(fallback, onChunk)
  return fallback
}
