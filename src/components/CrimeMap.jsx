import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import './CrimeMap.css'

export default function CrimeMap({ calls = [], trendData = [], liveStats = null, loading = false, title }) {
  const MONTGOMERY = [32.3792, -86.3077]

  const emergencyCount    = calls.filter(c => c.emergency).length
  const nonEmergencyCount = calls.length - emergencyCount

  return (
    <div className="crime-map">
      <h2 className="map-title">
        {title}
        {liveStats && (
          <span className="map-month-tag">
            {liveStats.monthLabel?.split(' - ')[1]} {liveStats.year}
          </span>
        )}
      </h2>

      {loading && <div className="map-loading">⏳ Fetching live 911 feed...</div>}

      <div className="map-wrapper">
        <MapContainer
          center={MONTGOMERY}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-container-custom"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {calls.map((c) => (
            <CircleMarker
              key={c.id}
              center={[c.lat, c.lon]}
              radius={4}
              pathOptions={{
                color:       c.emergency ? '#ff4444' : '#00aaff',
                fillColor:   c.emergency ? '#ff4444' : '#00aaff',
                fillOpacity: 0.72,
                weight: 1
              }}
            >
              <Tooltip direction="top" className="incident-tooltip">
                <strong>{c.incidentType}</strong>
                {c.address && <><br />{c.address}</>}
                {c.district && <><br />District: {c.district}</>}
                {c.responseTime != null && <><br />Response: {c.responseTime} min</>}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="chart-wrapper">
        <h3 className="chart-title">12-Month Call Trend</h3>
        {trendData.length === 0 ? (
          <div className="chart-empty">No trend data yet…</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2640" />
              <XAxis dataKey="label" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }}
                     tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <RTooltip
                contentStyle={{ background: '#1a1f3a', border: '1px solid #00ff88', color: '#fff' }}
                formatter={(val, name) => [val.toLocaleString(), name]}
              />
              <Legend wrapperStyle={{ color: '#a0a0a0', fontSize: 12 }} />
              <Bar dataKey="emergency"    name="Emergency"     fill="#ff4444" radius={[2,2,0,0]} />
              <Bar dataKey="nonEmergency" name="Non-Emergency" fill="#00aaff" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="map-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: '#ff4444' }} /> Emergency{emergencyCount > 0 && ` (${emergencyCount.toLocaleString()})`}</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#00aaff' }} /> Non-Emergency{nonEmergencyCount > 0 && ` (${nonEmergencyCount.toLocaleString()})`}</div>
        {liveStats && (
          <div className="legend-item total">Monthly total: {liveStats.total.toLocaleString()} calls</div>
        )}
      </div>
    </div>
  )
}
