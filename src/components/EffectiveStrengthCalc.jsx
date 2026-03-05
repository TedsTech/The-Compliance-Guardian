import './EffectiveStrengthCalc.css'

/**
 * Props:
 *   effectiveData  — from computeEffectiveStrength() { effectiveOfficers, officerEquivalents, automatedHours, ratio }
 *   liveStats      — from getLatestMonthStats()       { emergency, nonEmergency, total, automationRate, monthLabel, year }
 *   currentOfficers, population (static fallback)
 *   effectiveRatio, automationRate (static fallback)
 */
export default function EffectiveStrengthCalc({
  currentOfficers, population,
  automationRate: staticRate, effectiveRatio,
  effectiveData = null, liveStats = null
}) {
  const isLive = effectiveData !== null && liveStats !== null

  const ratio          = isLive ? effectiveData.ratio            : effectiveRatio
  const officerEquiv   = isLive ? effectiveData.officerEquivalents : (staticRate * 10).toFixed(1)
  const effOfficers    = isLive ? effectiveData.effectiveOfficers  : (currentOfficers + parseFloat(officerEquiv)).toFixed(0)
  const popThousands   = (population / 1000).toFixed(1)
  const autoRate       = isLive ? liveStats.automationRate       : staticRate
  const nonEmCount     = isLive ? liveStats.nonEmergency         : null
  const autoHours      = isLive ? effectiveData.automatedHours   : null

  return (
    <div className="effective-strength-calc">
      <h2>
        Effective Strength Formula
        {isLive && <span className="live-tag">🟢 LIVE</span>}
      </h2>

      <div className="formula-display">
        <div className="formula-line">
          <span className="formula-label">Sworn Officers:</span>
          <span className="formula-value">{currentOfficers}</span>
        </div>

        <div className="formula-plus">+</div>

        <div className="formula-line highlight">
          <span className="formula-label">AI Equiv. Officers:</span>
          <span className="formula-value">{officerEquiv}</span>
        </div>

        <div className="formula-divider">÷</div>

        <div className="formula-line">
          <span className="formula-label">Population (÷1000):</span>
          <span className="formula-value">{popThousands}</span>
        </div>

        <div className="formula-line result">
          <span className="formula-label">=</span>
          <span className={`formula-result ${ratio >= 2.0 ? 'ok' : 'warn'}`}>{Number(ratio).toFixed(3)}</span>
          <span className="formula-unit">Effective Ratio</span>
        </div>
      </div>

      <div className="automation-breakdown">
        <h3>Automation Breakdown</h3>

        {isLive && (
          <>
            <div className="breakdown-item">
              <label>Monthly Emergency:</label>
              <span className="breakdown-value emergency-val">{liveStats.emergency.toLocaleString()}</span>
            </div>
            <div className="breakdown-item highlight">
              <label>Monthly Non-Emergency:</label>
              <span className="breakdown-value">{nonEmCount.toLocaleString()}</span>
            </div>
            <div className="breakdown-item">
              <label>Automated Hours Freed:</label>
              <span className="breakdown-value">{Number(autoHours).toLocaleString()} hrs</span>
            </div>
          </>
        )}

        <div className="breakdown-item">
          <label>Automation Rate:</label>
          <span className="breakdown-value">{(autoRate * 100).toFixed(1)}%</span>
        </div>
        <div className="breakdown-item">
          <label>Effective Officers:</label>
          <span className="breakdown-value">{effOfficers}</span>
        </div>
      </div>
    </div>
  )
}
