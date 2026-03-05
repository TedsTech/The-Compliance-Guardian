/**
 * Bright Data MCP Client — SSE Transport
 *
 * Protocol (MCP over SSE):
 *  1. GET  /sse?token=TOKEN&groups=GROUPS  → EventSource stream
 *  2. Server emits `endpoint` event  → gives us the session POST URL
 *  3. POST JSON-RPC 2.0 to that URL  → tool call
 *  4. Server emits `message` event   → JSON-RPC response lands on stream
 *
 * Groups enabled: advanced_scraping, social, research
 * Free tools always on: search_engine, scrape_as_markdown
 * Budget: 200 sponsored credits — ALWAYS cache, never auto-poll
 */

const TOKEN  = import.meta.env.VITE_BRIGHTDATA_TOKEN
const GROUPS = import.meta.env.VITE_BRIGHTDATA_GROUPS || 'advanced_scraping,social,research'

// Dev: Vite reverse-proxy paths (avoids CORS)
// Prod: direct Bright Data origin
const SSE_URL = import.meta.env.DEV
  ? `/brightdata-sse?token=${TOKEN}&groups=${GROUPS}`
  : `https://mcp.brightdata.com/sse?token=${TOKEN}&groups=${GROUPS}`

const MSG_ORIGIN = import.meta.env.DEV
  ? ''          // relative — proxy rewrites /brightdata-message → /message
  : 'https://mcp.brightdata.com'

const MSG_PREFIX = import.meta.env.DEV ? '/brightdata-message' : '/message'

let _requestId = 1

// Singleton session promise — one SSE connection per page load
let _sessionPromise = null

// Local cache — same query never costs twice
const cache = {}

// ─── Session bootstrap ────────────────────────────────────────────────────────

/**
 * Open (or reuse) the SSE session.
 * Resolves with { es: EventSource, postUrl: string }
 */
function getSession() {
  if (_sessionPromise) return _sessionPromise

  _sessionPromise = new Promise((resolve, reject) => {
    console.log('[BrightData] Opening SSE session...')
    const es = new EventSource(SSE_URL)

    const timeout = setTimeout(() => {
      es.close()
      _sessionPromise = null
      reject(new Error('Bright Data SSE connection timeout (10s)'))
    }, 10_000)

    // Server sends the POST endpoint once the session is established
    es.addEventListener('endpoint', (evt) => {
      clearTimeout(timeout)
      // evt.data is something like: /message?sessionId=abc123
      // In dev, rewrite to use the Vite proxy path
      const serverPath = evt.data        // e.g. "/message?sessionId=XYZ"
      const postUrl = MSG_ORIGIN + serverPath.replace('/message', MSG_PREFIX)
      console.log(`[BrightData] ✅ Session ready → POST ${postUrl}`)
      resolve({ es, postUrl })
    })

    es.onerror = (err) => {
      clearTimeout(timeout)
      es.close()
      _sessionPromise = null
      reject(new Error('Bright Data SSE connection failed'))
    }
  })

  return _sessionPromise
}

// ─── Core tool caller ─────────────────────────────────────────────────────────

/**
 * Call any MCP tool via the established SSE session.
 * @param {string} toolName  - e.g. 'search_engine'
 * @param {Object} toolArgs  - tool-specific arguments
 * @returns {Promise<any>}   - parsed result
 */
async function callMCPTool(toolName, toolArgs) {
  if (!TOKEN) throw new Error('VITE_BRIGHTDATA_TOKEN is not set in .env')

  const { es, postUrl } = await getSession()
  const id = _requestId++

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      es.removeEventListener('message', handler)
      reject(new Error(`Tool call '${toolName}' timed out after 30s`))
    }, 30_000)

    // Listen for the matching JSON-RPC response on the SSE stream
    function handler(evt) {
      let json
      try { json = JSON.parse(evt.data) } catch { return }
      if (json.id !== id) return

      clearTimeout(timeout)
      es.removeEventListener('message', handler)

      if (json.error) {
        reject(new Error(`MCP error ${json.error.code}: ${json.error.message}`))
        return
      }

      // MCP result: { content: [{ type: 'text', text: '...' }] }
      const text = json.result?.content?.[0]?.text ?? ''
      try { resolve(JSON.parse(text)) } catch { resolve(text) }
    }

    es.addEventListener('message', handler)

    // Fire the tool call
    fetch(postUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name: toolName, arguments: toolArgs }
      })
    }).then(r => {
      if (!r.ok) {
        clearTimeout(timeout)
        es.removeEventListener('message', handler)
        reject(new Error(`HTTP ${r.status} posting to MCP session`))
      }
    }).catch(err => {
      clearTimeout(timeout)
      es.removeEventListener('message', handler)
      reject(err)
    })
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Web search — always cache, ~2 credits
 */
export async function brightDataSearch(query, cacheKey = null) {
  const key = cacheKey || query
  if (cache[key]) { console.log(`[BrightData] ✅ Cache: ${key}`); return cache[key] }
  console.log(`[BrightData] 🔍 search: ${query}`)
  const result = await callMCPTool('search_engine', { query, num_results: 5 })
  cache[key] = result
  return result
}

/**
 * Scrape URL as Markdown — always cache, ~3 credits
 */
export async function brightDataScrape(url, cacheKey = null) {
  const key = cacheKey || url
  if (cache[key]) { console.log(`[BrightData] ✅ Cache: ${key}`); return cache[key] }
  console.log(`[BrightData] 📄 scrape: ${url}`)
  const result = await callMCPTool('scrape_as_markdown', { url })
  cache[key] = result
  return result
}

/**
 * SB 298 legislative status — run ONCE on load
 */
export async function monitorSB298() {
  return brightDataSearch(
    'Alabama Senate Bill 298 2026 police staffing mandate Montgomery municipality',
    'sb298-status'
  )
}

/**
 * Montgomery Advertiser — run ON DEMAND only
 */
export async function scrapeLocalNewsSentiment() {
  return brightDataScrape(
    'https://www.montgomeryadvertiser.com',
    'local-news-montgomery-advertiser'
  )
}

/**
 * Reddit safety sentiment — run ONCE, cache result
 */
export async function monitorRedditSentiment() {
  return brightDataSearch(
    'site:reddit.com (r/Montgomery OR r/Alabama) police safety crime 2026',
    'reddit-montgomery-safety'
  )
}

// ─── Local City Intel (on-demand, each cached after first call) ───────────────

/**
 * WSFA 12 News — Montgomery's main local TV station.
 * Crime, MPD activity, city hall coverage. ~3 credits, cached.
 */
export async function scrapeWSFANews() {
  return brightDataScrape(
    'https://www.wsfa.com/news/crime/',
    'wsfa-montgomery-crime'
  )
}

/**
 * AL.com Montgomery crime & safety section. ~3 credits, cached.
 */
export async function scrapeALdotCom() {
  return brightDataScrape(
    'https://www.al.com/news/montgomery/',
    'aldotcom-montgomery-news'
  )
}

/**
 * Search for MPD press releases + city council public safety coverage. ~2 credits, cached.
 */
export async function searchMontgomeryPoliceNews() {
  return brightDataSearch(
    'Montgomery Alabama Police Department MPD press release 2026 staffing city council public safety',
    'mpd-pressrelease-2026'
  )
}

/**
 * Run all three local city intel sources in parallel.
 * Fire once on demand; results are individually cached so repeat calls are free.
 * Combined cost: ~8 credits (first call), 0 credits (subsequent).
 * @returns {{ wsfa, alcom, mpd }}
 */
export async function fetchLocalCityIntel() {
  const [wsfa, alcom, mpd] = await Promise.allSettled([
    scrapeWSFANews(),
    scrapeALdotCom(),
    searchMontgomeryPoliceNews()
  ]).then(r => r.map(x => x.status === 'fulfilled' ? x.value : null))
  return { wsfa, alcom, mpd }
}

// ─── MPD Hiring Pipeline (on-demand, cached) ────────────────────────────────

/**
 * Scrape MPD open job postings from GovernmentJobs.com.
 * Live evidence that MPD can't hire fast enough — AI automation is the only path.
 * Cost: ~3 credits (cached after first call).
 */
export async function scrapeMPDJobPostings() {
  return brightDataScrape(
    'https://www.governmentjobs.com/careers/montgomeryal?keyword=police',
    'mpd-job-postings'
  )
}

/** Credit / cache status summary */
export function getCacheStatus() {
  const keys = Object.keys(cache)
  return {
    cachedResults: keys.length,
    cacheKeys: keys,
    estimatedCreditsUsed:
      keys.filter(k => !k.startsWith('http')).length * 2 +
      keys.filter(k => k.startsWith('http')).length * 3
  }
}

/** Force-close the SSE session (e.g. on page unload) */
export function closeSession() {
  if (_sessionPromise) {
    _sessionPromise.then(({ es }) => es.close()).catch(() => {})
    _sessionPromise = null
  }
}

/** Clear cache — dev/testing only */
export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k])
  console.log('[BrightData] Cache cleared')
}
