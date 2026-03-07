/**
 * Montgomery 911 Live Data Client
 * ArcGIS FeatureServer: services7.arcgis.com/xNUwUjOJqYE54USz
 *
 * Real schema (aggregate — no geometry):
 *   Year, Month, Call_Category, Call_Count_by_Phone_Service_Pro,
 *   Call_Origin, Call_Count_By_Origin
 *
 * Strategy: sum Call_Count_by_Phone_Service_Pro grouped by Year+Month+Call_Category
 */

const BASE =
  import.meta.env.VITE_MONTGOMERY_ARCGIS_BASE ||
  'https://services7.arcgis.com/xNUwUjOJqYE54USz/arcgis/rest/services/911_Calls_Data/FeatureServer/0'

const QUERY = `${BASE}/query`

// ─── Core fetcher ──────────────────────────────────────────────────────────────

/**
 * Fetch all records summed by Year + Month + Call_Category.
 * Returns [{ year, month, monthLabel, category, total }]
 */
export async function fetchMonthlySummary() {
  const params = new URLSearchParams({
    f: 'json',
    where: "Call_Category IN ('Emergency','Non-Emergency')",
    outStatistics: JSON.stringify([{
      statisticType: 'sum',
      onStatisticField: 'Call_Count_by_Phone_Service_Pro',
      outStatisticFieldName: 'TotalCalls'
    }]),
    groupByFieldsForStatistics: 'Year,Month,Call_Category',
    orderByFields: 'Year DESC,Month DESC',
    returnGeometry: 'false',
    cacheHint: 'true'
  })

  const res = await fetch(`${QUERY}?${params}`)
  if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`ArcGIS: ${json.error.message}`)

  return json.features.map(f => {
    const a = f.attributes
    const monthNum = parseInt(a.Month?.split(' - ')[0] || '0', 10)
    return {
      year: a.Year,
      month: monthNum,
      monthLabel: a.Month || '',
      category: a.Call_Category,
      total: a.TotalCalls || 0
    }
  })
}

// ─── Derived stats ─────────────────────────────────────────────────────────────

/**
 * Most-recent month with both Emergency + Non-Emergency data.
 * Returns { year, monthLabel, emergency, nonEmergency, total, automationRate }
 */
export async function getLatestMonthStats() {
  const rows = await fetchMonthlySummary()
  const byMonth = rollupByMonth(rows)
  const sorted = Object.values(byMonth)
    .sort((a, b) =>
      `${b.year}${String(b.month).padStart(2, '0')}`
        .localeCompare(`${a.year}${String(a.month).padStart(2, '0')}`)
    )
    .filter(v => v.emergency > 0 && v.nonEmergency > 0)

  if (!sorted.length) throw new Error('No 911 data returned from ArcGIS')
  const latest = sorted[0]
  const total = latest.emergency + latest.nonEmergency
  return {
    year: latest.year,
    monthLabel: latest.monthLabel,
    emergency: latest.emergency,
    nonEmergency: latest.nonEmergency,
    total,
    automationRate: latest.nonEmergency / total
  }
}

/**
 * Last 12 months sorted oldest→newest for the trend chart.
 * Returns [{ label, emergency, nonEmergency, total }]
 */
export async function getTrendData() {
  const rows = await fetchMonthlySummary()
  const byMonth = rollupByMonth(rows)
  return Object.values(byMonth)
    .filter(v => v.emergency > 0 || v.nonEmergency > 0)
    .sort((a, b) => {
      const ak = `${a.year}${String(a.month).padStart(2, '0')}`
      const bk = `${b.year}${String(b.month).padStart(2, '0')}`
      return ak.localeCompare(bk)
    })
    .slice(-12)
    .map(v => ({
      label: shortMonth(v.monthLabel),
      emergency: v.emergency,
      nonEmergency: v.nonEmergency,
      total: v.emergency + v.nonEmergency
    }))
}

// ─── Compliance math ───────────────────────────────────────────────────────────

/**
 * Monthly work hours per officer (2,080 annual ÷ 12).
 * Used to convert "hours freed by AI" → FTE officer-equivalents.
 */
export const OFFICER_MONTHLY_HOURS = 173

/**
 * Tier-weighted average officer-hours consumed per non-emergency call:
 *   63% Tier 2 (admin) × 1.0 hr  +  37% Tier 3 (info) × 0.25 hr = 0.7225 hr/call
 */
export const WEIGHTED_HRS_PER_CALL = 0.63 * 1.0 + 0.37 * 0.25

/**
 * SB 298 Effective Strength formula:
 *   (currentOfficers + officerFTE) / (population / 1000)
 *
 * officerFTE = (nonEmergencyCalls × weightedHrsPerCall) / monthlyWorkHours
 */
export function computeEffectiveStrength({
  currentOfficers = 331,
  population = 200603,
  nonEmergencyCalls
}) {
  const automatedHours = nonEmergencyCalls * WEIGHTED_HRS_PER_CALL
  const officerEquivalents = automatedHours / OFFICER_MONTHLY_HOURS
  const effectiveOfficers = currentOfficers + officerEquivalents
  return {
    effectiveOfficers: Math.round(effectiveOfficers),
    officerEquivalents: +officerEquivalents.toFixed(1),
    automatedHours: +automatedHours.toFixed(0),
    ratio: +(effectiveOfficers / (population / 1000)).toFixed(3)
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function rollupByMonth(rows) {
  const map = {}
  rows.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (!map[key])
      map[key] = { year: r.year, month: r.month, monthLabel: r.monthLabel, emergency: 0, nonEmergency: 0 }
    if (r.category === 'Emergency')     map[key].emergency    += r.total
    if (r.category === 'Non-Emergency') map[key].nonEmergency += r.total
  })
  return map
}

function shortMonth(raw = '') {
  // "02 - February" → "Feb"  |  "01 - Janurary" → "Jan"
  const name = raw.split(' - ')[1] || raw
  return name.slice(0, 3)
}

// ─── Officer Action Tier System ────────────────────────────────────────────────

/**
 * Three-tier call classification for the Officer ROI argument.
 *
 * Tier 1 → PROTECT  : sworn officers respond immediately
 * Tier 2 → AUTOMATE : Copilot Agent handles reporting / filing
 * Tier 3 → DEFLECT  : Bright Data MCP provides instant web answers
 */
export const CALL_TIERS = {
  TIER1_HIGH_PRIORITY: {
    id: 1,
    label: 'Tier 1: High Priority',
    strategy: 'PROTECT',
    strategyDetail: 'Direct all sworn officers here immediately.',
    color: '#ff4444',
    glowColor: 'rgba(255, 68, 68, 0.35)',
    icon: '🚨',
    avgHoursPerCall: 2.5,
    examples: 'Robbery, Assault, Shots Fired',
    // All calls flagged as Emergency by ArcGIS fall here
    arcgisCategory: 'Emergency'
  },
  TIER2_LOW_RISK_ADMIN: {
    id: 2,
    label: 'Tier 2: Low-Risk / Admin',
    strategy: 'AUTOMATE',
    strategyDetail: 'Use the Copilot Agent to handle reporting / filing.',
    color: '#ffaa00',
    glowColor: 'rgba(255, 170, 0, 0.30)',
    icon: '🤖',
    avgHoursPerCall: 1.0,
    examples: 'Abandoned Vehicle, Barking Dog, Lost Property',
    // ~63 % of Non-Emergency calls are automatable admin/reporting
    nonEmergencyShare: 0.63
  },
  TIER3_INFO_SERVICE: {
    id: 3,
    label: 'Tier 3: Info / Service',
    strategy: 'DEFLECT',
    strategyDetail: 'Use Bright Data MCP to provide instant web answers.',
    color: '#44aaff',
    glowColor: 'rgba(68, 170, 255, 0.25)',
    icon: '🌐',
    avgHoursPerCall: 0.25,
    examples: 'Traffic Info, Directions, General Queries',
    // ~37 % of Non-Emergency calls are simple info/service queries
    nonEmergencyShare: 0.37
  }
}

/**
 * Build the ROI breakdown from ArcGIS monthly totals.
 *
 * The ArcGIS dataset only exposes "Emergency" and "Non-Emergency" aggregates,
 * so we apply empirical shares to split non-emergency into Tier 2 vs Tier 3.
 *
 * @param {{ emergency: number, nonEmergency: number }} monthStats
 * @returns {Array} Tier objects with callCount, officerHours, officerShifts,
 *                  and officerHoursSaved (hours freed from sworn officers)
 */
export function getTierBreakdown({ emergency, nonEmergency }) {
  const t2Count = Math.round(nonEmergency * CALL_TIERS.TIER2_LOW_RISK_ADMIN.nonEmergencyShare)
  const t3Count = nonEmergency - t2Count

  const tiers = [
    { ...CALL_TIERS.TIER1_HIGH_PRIORITY, callCount: emergency },
    { ...CALL_TIERS.TIER2_LOW_RISK_ADMIN, callCount: t2Count },
    { ...CALL_TIERS.TIER3_INFO_SERVICE,   callCount: t3Count }
  ]

  return tiers.map(tier => {
    const officerHours = parseFloat((tier.callCount * tier.avgHoursPerCall).toFixed(1))
    // Hours "saved" = the hours Tier 2 + Tier 3 calls would have consumed if sworn officers handled them
    const officerHoursSaved = tier.id === 1 ? 0 : officerHours
    return {
      ...tier,
      officerHours,
      officerShifts: parseFloat((officerHours / 8).toFixed(2)),
      officerHoursSaved
    }
  })
}

/**
 * Classify an individual call category string into its tier id (1 | 2 | 3).
 * Used when processing individual call records (e.g., live ArcGIS features).
 * Uncategorized calls default to Tier 2 (admin triage).
 * @param {string} category
 * @returns {number}
 */
export function classifyCallTier(category) {
  const HIGH_PRIORITY = [
    'robbery', 'assault', 'shots_fired', 'homicide', 'burglary',
    'domestic_violence', 'kidnapping', 'carjacking', 'armed_robbery',
    'aggravated_assault', 'shooting', 'stabbing', 'pursuit', 'trespass_report'
  ]
  const INFO_SERVICE = [
    'traffic_info', 'directions', 'general_query', 'information_request',
    'traffic_stop', 'road_closure', 'non_emergency_info', 'community_info',
    'lost_person_info', 'business_check', 'permit_inquiry', 'noise_ordinance_info'
  ]
  if (HIGH_PRIORITY.includes(category)) return 1
  if (INFO_SERVICE.includes(category))  return 3
  return 2
}

// ─── Fire/EMS Incident Points (OpenDataData — real lat/lon) ─────────────────

const INCIDENTS_BASE =
  'https://services7.arcgis.com/xNUwUjOJqYE54USz/arcgis/rest/services/OpenDataData_2024YTD_9_19_24/FeatureServer/0'

// Fire/EMS incident types classified as emergency (life-safety / active fire):
//   EMS medical calls, structure fires, vehicle fires, MVAs with injuries,
//   person in distress, extrication, hazmat, gas leaks
// Everything else (false alarms, service calls, smoke scares, cancellations) = non-emergency
const EMERGENCY_RE = /EMS call|building fire|structure.*fire|cooking fire|vehicle fire|rubbish fire|brush.*fire|natural vegetation fire|outside.*fire|chimney.*fire|fire in portable|accident with injur|MV Ped|person in distress|extrication|gas leak|chemical spill|carbon monoxide incident|hazmat|hazardous/i

/**
 * Fetch geo-located Fire/EMS incident points from the Montgomery open data Feature Layer.
 * Returns [{ id, incidentType, address, district, lat, lon, date, responseTime, emergency }]
 *
 * NOTE: This dataset is Fire/EMS dispatch, not police crime data.
 * Police crime data is only available via CrimeMapping.com (no public API).
 *
 * The service is static (frozen at 2024-09-19) with up to 1000 records per page.
 * We fetch the most-recent `limit` records ordered by ObjectId DESC.
 */
export async function fetchCrimeIncidents({ limit = 1000 } = {}) {
  const params = new URLSearchParams({
    f: 'json',
    where: 'Latitude IS NOT NULL AND Longitude IS NOT NULL',
    outFields: [
      'ObjectId',
      'Incident_Number',
      'Incident_Type',
      'Location_Street_Address',
      'District',
      'Latitude',
      'Longitude',
      'Days_in_PSAP_Received_DateTime',
      'Unit_Response_Time'
    ].join(','),
    returnGeometry: 'false',
    orderByFields: 'ObjectId DESC',
    resultRecordCount: String(Math.min(limit, 1000)),
    cacheHint: 'true'
  })

  const res = await fetch(`${INCIDENTS_BASE}/query?${params}`)
  if (!res.ok) throw new Error(`ArcGIS Incidents HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`ArcGIS Incidents: ${json.error.message}`)

  return (json.features || []).map(f => {
    const a = f.attributes
    return {
      id: a.Incident_Number || String(a.ObjectId),
      incidentType: a.Incident_Type || 'Unknown',
      address: a.Location_Street_Address || '',
      district: a.District || '',
      lat: a.Latitude,
      lon: a.Longitude,
      date: a.Days_in_PSAP_Received_DateTime,
      responseTime: a.Unit_Response_Time,
      emergency: EMERGENCY_RE.test(a.Incident_Type || '')
    }
  })
}

// ─── 311 Service Requests (mgmgis — real non-emergency data with lat/lon) ────

const SERVICE_311_BASE =
  'https://mgmgis.montgomeryal.gov/arcgis/rest/services/HostedDatasets/Received_311_Service_Request/FeatureServer/0'

// Request types that are pure info/FAQ queries → Tier 3 (DEFLECT)
const TIER3_RE = /^(Inquiries|Ask 3-1-1|FAQ|Frequently Ask)/i

/**
 * Fetch recent geo-located 311 service requests from Montgomery city GIS.
 * Returns the same shape as fetchCrimeIncidents so they can be merged into the map.
 *
 * 207,127 total records (Jan 2021 – Feb 2026). We fetch the most recent `limit`.
 * All 311 requests are non-emergency; `tier` distinguishes Tier 2 (admin) vs 3 (info).
 */
export async function fetch311Requests({ limit = 1000 } = {}) {
  const params = new URLSearchParams({
    f: 'json',
    where: 'Latitude IS NOT NULL AND Longitude IS NOT NULL',
    outFields: [
      'OBJECTID',
      'Request_ID',
      'Request_Type',
      'Address',
      'District',
      'Department',
      'Status',
      'Latitude',
      'Longitude',
      'Create_Date'
    ].join(','),
    returnGeometry: 'false',
    orderByFields: 'Create_Date DESC',
    resultRecordCount: String(Math.min(limit, 2000))
  })

  const res = await fetch(`${SERVICE_311_BASE}/query?${params}`)
  if (!res.ok) throw new Error(`311 Service HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`311 Service: ${json.error.message}`)

  return (json.features || []).map(f => {
    const a = f.attributes
    const reqType = a.Request_Type || 'Unknown'
    return {
      id: `311-${a.Request_ID || a.OBJECTID}`,
      incidentType: reqType,
      address: a.Address || '',
      district: a.District ? String(a.District) : '',
      lat: a.Latitude,
      lon: a.Longitude,
      date: a.Create_Date,
      responseTime: null,
      emergency: false,                        // all 311 = non-emergency
      tier: TIER3_RE.test(reqType) ? 3 : 2,   // info/FAQ → Tier 3, everything else → Tier 2
      source: '311',
      department: a.Department || '',
      status: a.Status || ''
    }
  })
}

// ─── Mock data generator (dev / offline fallback) ──────────────────────────────

/**
 * Generate mock monthly stats shaped like ArcGIS output.
 * Based on real Montgomery 911 data (2025–2026 ArcGIS FeatureServer):
 *   ~67 % Emergency · ~33 % Non-Emergency
 *   Range: 28,871 (Feb '26 low) – 42,879 (Jul '25 peak)
 *   Latest month: 19,466 E + 9,405 NE = 28,871 total
 *
 * @returns {{ emergency: number, nonEmergency: number, total: number, automationRate: number }}
 */
export function generateMockMonthStats() {
  const emergency    = 19400 + Math.floor(Math.random() * 9600)  // 19,400–29,000
  const nonEmergency = 9400  + Math.floor(Math.random() * 4600)  //  9,400–14,000
  const total        = emergency + nonEmergency
  return {
    year: 2026,
    monthLabel: '03 - March',
    emergency,
    nonEmergency,
    total,
    automationRate: nonEmergency / total
  }
}
