import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import './SovereigntyGauge.css'

export default function SovereigntyGauge({ currentRatio, mandate, status }) {
  // Scale against mandate (100% = exactly meeting mandate), not the gauge max of 3.0
  const compliancePercent = (currentRatio / mandate) * 100
  const mandatePercent = (mandate / mandate) * 100  // always 100 — kept for reference
  
  const data = [
    {
      name: 'Effective Strength Ratio',
      value: currentRatio,
      fill: status === 'compliant' ? '#00ff88' : '#ff3333'
    }
  ]

  const getStatusColor = () => {
    if (currentRatio >= mandate + 0.2) return '#00ff88'
    if (currentRatio >= mandate) return '#ffaa00'
    return '#ff3333'
  }

  return (
    <div className="sovereignty-gauge">
      <h2>Sovereignty Gauge</h2>
      <div className="gauge-container">
        <ResponsiveContainer width="100%" height={250}>
          <RadialBarChart
            cx="50%"
            cy="70%"
            innerRadius="60%"
            outerRadius="100%"
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 3.0]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background
              dataKey="value"
              cornerRadius={10}
              fill="#00ff88"
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        <div className="gauge-overlay">
          <div className="ratio-display">
            <span className="ratio-value" style={{ color: getStatusColor() }}>
              {currentRatio.toFixed(2)}
            </span>
            <span className="ratio-label">Effective Ratio</span>
          </div>
          
          <div className="mandate-display">
            <span className="mandate-value">{mandate.toFixed(2)}</span>
            <span className="mandate-label">State Mandate</span>
          </div>
        </div>
      </div>

      <div className={`status-indicator ${status}`}>
        {status === 'compliant' ? (
          <>
            <span className="status-icon">✅</span>
            <span className="status-text">COMPLIANT - Sovereignty Maintained</span>
          </>
        ) : (
          <>
            <span className="status-icon">⚠️</span>
            <span className="status-text">AT RISK - ALEA Takeover Pending</span>
          </>
        )}
      </div>

      <div className="gauge-metrics">
        <div className="metric">
          <span className="metric-label">Compliance Margin</span>
          <span className="metric-value">
            {(currentRatio - mandate).toFixed(2)}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Compliance %</span>
          <span className="metric-value">
            {Math.min(100, (compliancePercent)).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}
