import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { OFFICER_MONTHLY_HOURS, WEIGHTED_HRS_PER_CALL } from '../lib/montgomery911'
import './ComplianceROI.css'

const CURRENT_OFFICERS = 331
const POPULATION = 200603

export default function ComplianceROI({ deficit, currentRatio, mandateRatio, automationRate, nonEmergencyCalls }) {
  // Officer FTE freed when ALL non-emergency calls are automated (full deployment)
  const maxOfficerFTE = (nonEmergencyCalls * WEIGHTED_HRS_PER_CALL) / OFFICER_MONTHLY_HOURS
  const maxRatio = Math.min(3.0, (CURRENT_OFFICERS + maxOfficerFTE) / (POPULATION / 1000))

  // Project ratio from today → full automation over 12 months (linear ramp)
  const projectionData = []
  for (let month = 0; month <= 12; month++) {
    const t = month / 12
    const ratio = +(currentRatio + t * (maxRatio - currentRatio)).toFixed(2)
    // Compliance deficit in officer-equivalents against the mandate threshold
    const remainingDeficit = Math.max(0, Math.round(mandateRatio * (POPULATION / 1000) - ratio * (POPULATION / 1000)))
    projectionData.push({
      month: month === 0 ? 'Now' : `M${month}`,
      deficit: remainingDeficit,
      ratio: ratio.toFixed(2)
    })
  }

  // Fix: findIndex returns 0 when already compliant; 0 is falsy so `|| 12` was wrong
  const idx = projectionData.findIndex(d => parseFloat(d.ratio) >= mandateRatio)
  const monthsTilCompliance = idx === -1 ? 12 : idx

  return (
    <div className="compliance-roi">
      <h2>Compliance ROI Projection</h2>
      
      <div className="roi-metrics">
        <div className="roi-metric">
          <span className="roi-label">Current Deficit</span>
          <span className="roi-value">{deficit} officers</span>
        </div>
        <div className="roi-metric">
          <span className="roi-label">Projected Timeline</span>
          <span className="roi-value">
            {monthsTilCompliance === 0 ? 'Compliant now' : `${monthsTilCompliance} months`}
          </span>
        </div>
      </div>

      <div className="roi-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={projectionData}
            margin={{ top: 5, right: 10, left: -20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0, 255, 136, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#a0a0a0' }}
              stroke="#a0a0a0"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#a0a0a0' }}
              stroke="#a0a0a0"
              domain={[0, 'dataMax + 20']}
              label={{ value: 'Deficit', angle: -90, position: 'insideLeft', fill: '#a0a0a0' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#a0a0a0' }}
              stroke="#a0a0a0"
              domain={[1.0, 3.0]}
              label={{ value: 'Ratio', angle: 90, position: 'insideRight', fill: '#a0a0a0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 14, 39, 0.95)',
                border: '1px solid #00ff88',
                borderRadius: '4px',
                color: '#e0e0e0'
              }}
              labelStyle={{ color: '#a0a0a0' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="deficit"
              stroke="#ff3333"
              dot={false}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ratio"
              stroke="#00ff88"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="roi-footer">
        <p className="roi-note">
          📊 Full AI deployment reaches {maxRatio.toFixed(2)} effective ratio. At current automation ({(automationRate * 100).toFixed(1)}%), compliance {monthsTilCompliance === 0 ? 'is already achieved' : `is reached in ${monthsTilCompliance} months`}.
        </p>
      </div>
    </div>
  )
}
