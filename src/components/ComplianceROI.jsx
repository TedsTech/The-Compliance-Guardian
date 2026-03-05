import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './ComplianceROI.css'

export default function ComplianceROI({ deficit, currentRatio, mandateRatio, automationRate }) {
  // Project deficit reduction over 12 months with automation
  const projectionData = []
  const baselineCalls = 100
  
  for (let month = 0; month <= 12; month++) {
    const reducedCallsPerMonth = (month * automationRate * baselineCalls) / 12
    const remainingDeficit = Math.max(0, deficit - (reducedCallsPerMonth / 10))
    
    projectionData.push({
      month: month === 0 ? 'Now' : `M${month}`,
      deficit: Math.round(remainingDeficit),
      ratio: Math.min(3.0, (currentRatio + (month * (0.5 / 12)))).toFixed(2)
    })
  }

  const monthsTilCompliance = projectionData.findIndex(d => parseFloat(d.ratio) >= mandateRatio) || 12

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
          <span className="roi-value">{monthsTilCompliance} months</span>
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
          📊 At {(automationRate * 100).toFixed(1)}% automation, Montgomery achieves {parseFloat(projectionData[monthsTilCompliance]?.ratio || 3.0).toFixed(2)} effective ratio in {monthsTilCompliance} months.
        </p>
      </div>
    </div>
  )
}
