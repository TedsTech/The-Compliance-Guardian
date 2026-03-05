import './OfficerROI.css'

/**
 * OfficerROI — Three-Tier Officer ROI Breakdown
 *
 * Visualises how 911 calls are split across action tiers and how many
 * officer-hours can be redirected to sworn-officer (Tier 1) duties via AI.
 *
 * @param {{ tierBreakdown: Array, totalCalls: number, loading: boolean }} props
 */
export default function OfficerROI({ tierBreakdown = [], totalCalls = 0, loading = false }) {
  const tier1 = tierBreakdown.find(t => t.id === 1)
  const tier2 = tierBreakdown.find(t => t.id === 2)
  const tier3 = tierBreakdown.find(t => t.id === 3)

  const savedHours  = (tier2?.officerHours ?? 0) + (tier3?.officerHours ?? 0)
  const savedShifts = (savedHours / 8).toFixed(1)
  const pctReclaimable = totalCalls
    ? (((tier2?.callCount ?? 0) + (tier3?.callCount ?? 0)) / totalCalls * 100).toFixed(1)
    : '—'

  return (
    <div className="officer-roi">
      <div className="roi-header">
        <h2>Officer ROI Breakdown</h2>
        <p className="roi-subtitle">
          Montgomery 911 · {totalCalls.toLocaleString()} calls this month
        </p>
      </div>

      {loading ? (
        <div className="roi-loading">⟳ Loading 911 data…</div>
      ) : (
        <>
          <div className="tier-grid">
            {tierBreakdown.map(tier => (
              <TierCard key={tier.id} tier={tier} totalCalls={totalCalls} />
            ))}
          </div>

          <div className="roi-summary">
            <div className="summary-stat">
              <span className="stat-value highlight-green">
                {savedHours.toLocaleString()}
              </span>
              <span className="stat-label">Officer&nbsp;Hours&nbsp;Freed / Month</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="stat-value highlight-green">
                {savedShifts}
              </span>
              <span className="stat-label">Equivalent&nbsp;8‑Hr&nbsp;Shifts</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="stat-value highlight-green">
                {pctReclaimable}%
              </span>
              <span className="stat-label">Calls&nbsp;AI‑Reclaimable</span>
            </div>
          </div>

          <p className="roi-conclusion">
            <strong>{pctReclaimable}%</strong> of all calls can be handled by AI —
            freeing&nbsp;<strong>{savedShifts} officer shifts</strong> every month
            to focus exclusively on Tier&nbsp;1 emergencies.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function TierCard({ tier, totalCalls }) {
  const pct = totalCalls ? ((tier.callCount / totalCalls) * 100).toFixed(1) : '0.0'

  const strategyClass = {
    PROTECT:  'badge-protect',
    AUTOMATE: 'badge-automate',
    DEFLECT:  'badge-deflect'
  }[tier.strategy] ?? ''

  return (
    <div
      className="tier-card"
      style={{ '--tier-color': tier.color, '--tier-glow': tier.glowColor }}
    >
      {/* Header row */}
      <div className="tier-card-header">
        <span className="tier-icon">{tier.icon}</span>
        <div className="tier-title-block">
          <span className="tier-label">{tier.label}</span>
          <span className={`tier-badge ${strategyClass}`}>{tier.strategy}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="tier-bar-track">
        <div className="tier-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="tier-bar-label">{pct}% of calls this month</p>

      {/* Stats */}
      <div className="tier-stats">
        <div className="tier-stat">
          <span className="tstat-value">{tier.callCount.toLocaleString()}</span>
          <span className="tstat-label">Calls</span>
        </div>
        <div className="tier-stat">
          <span className="tstat-value">{tier.officerHours.toLocaleString()}</span>
          <span className="tstat-label">Officer&nbsp;Hrs</span>
        </div>
        <div className="tier-stat">
          <span className="tstat-value">{tier.officerShifts}</span>
          <span className="tstat-label">Shifts</span>
        </div>
      </div>

      {/* Examples */}
      <p className="tier-examples">{tier.examples}</p>

      {/* Strategy detail */}
      <p className="tier-strategy-detail">{tier.strategyDetail}</p>
    </div>
  )
}
