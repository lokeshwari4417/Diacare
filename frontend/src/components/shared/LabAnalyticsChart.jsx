import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LabAnalyticsChart({ testName, trendPoints = [], riskFlags = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  if (!trendPoints || trendPoints.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-3xl text-xs text-muted">
        No trend data points available for {testName}.
      </div>
    )
  }

  // Extract units and reference bounds
  const unit = trendPoints[0]?.unit || ''
  const refLow = trendPoints[0]?.ref_low ?? 0
  const refHigh = trendPoints[0]?.ref_high ?? 100

  // Calculate SVG dimensions and coordinate scales
  const values = trendPoints.map((p) => p.value_numeric)
  const minVal = Math.min(...values, refLow) * 0.85
  const maxVal = Math.max(...values, refHigh) * 1.15
  const valRange = maxVal - minVal || 1

  const width = 640
  const height = 260
  const padding = { top: 30, right: 40, bottom: 40, left: 55 }

  const graphW = width - padding.left - padding.right
  const graphH = height - padding.top - padding.bottom

  const getX = (index) => {
    if (trendPoints.length === 1) return padding.left + graphW / 2
    return padding.left + (index / (trendPoints.length - 1)) * graphW
  }

  const getY = (val) => {
    return padding.top + graphH - ((val - minVal) / valRange) * graphH
  }

  // Normal Range Band Coordinates
  const bandTopY = getY(refHigh)
  const bandBottomY = getY(refLow)
  const bandHeight = Math.max(2, bandBottomY - bandTopY)

  // Build SVG Path
  const pointsCoords = trendPoints.map((p, i) => ({
    x: getX(i),
    y: getY(p.value_numeric),
    point: p,
  }))

  const linePathD = pointsCoords
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
    .join(' ')

  return (
    <div className="space-y-6">
      {/* 1. Interactive Trend Chart Card */}
      <div className="glass-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-display font-bold text-ink">{testName} Longitudinal Trend</h3>
            <p className="text-xs text-muted">
              Reference Band: <span className="font-semibold text-emerald-700">{refLow} - {refHigh} {unit}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted font-medium">
              <span className="w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-300 inline-block"></span> Normal Band
            </span>
            <span className="flex items-center gap-1.5 text-muted font-medium">
              <span className="w-3 h-0.5 border-b border-dashed border-slate-400 inline-block"></span> Bounds
            </span>
          </div>
        </div>

        {/* SVG Container */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
            {/* Background Shaded Normal Reference Range Band */}
            <rect
              x={padding.left}
              y={bandTopY}
              width={graphW}
              height={bandHeight}
              fill="#ecfdf5"
              stroke="#a7f3d0"
              strokeDasharray="4 4"
              strokeWidth="0.8"
              rx="4"
            />

            {/* Dashed Reference Line (High) */}
            <line
              x1={padding.left}
              y1={bandTopY}
              x2={width - padding.right}
              y2={bandTopY}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Dashed Reference Line (Low) */}
            <line
              x1={padding.left}
              y1={bandBottomY}
              x2={width - padding.right}
              y2={bandBottomY}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Reference Y-Axis Labels */}
            <text x={padding.left - 8} y={bandTopY + 4} textAnchor="end" fill="#64748b" fontSize="10" fontWeight="bold">
              {refHigh}
            </text>
            <text x={padding.left - 8} y={bandBottomY + 4} textAnchor="end" fill="#64748b" fontSize="bold">
              {refLow}
            </text>

            {/* Trend Line Path */}
            <path d={linePathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data Points */}
            {pointsCoords.map((pt, i) => {
              const isAbnormal = pt.point.status_enum === 'high' || pt.point.status_enum === 'low'
              const circleColor = isAbnormal ? '#dc2626' : '#16a34a'
              return (
                <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                  <circle cx={pt.x} cy={pt.y} r="6" fill={circleColor} stroke="#ffffff" strokeWidth="2" />
                  {/* X-Axis Date Label */}
                  <text x={pt.x} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">
                    {pt.point.report_date}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute bg-ink text-white p-2.5 rounded-xl text-xs space-y-0.5 shadow-xl pointer-events-none z-20"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="font-bold">{hoveredPoint.point.report_date}</div>
              <div className="font-mono text-emerald-300">
                {hoveredPoint.point.value_numeric} {hoveredPoint.point.unit}
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-300">
                Status: {hoveredPoint.point.status_enum}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Horizontal Risk Flag Timeline */}
      {riskFlags && riskFlags.length > 0 && (
        <div className="glass-card space-y-4">
          <h3 className="text-sm font-display font-bold text-ink flex items-center gap-2">
            <span>🚩</span> Clinical Risk Pattern Timeline
          </h3>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
            {riskFlags.map((rf, idx) => {
              const isHigh = rf.likelihood_enum === 'high'
              const isMod = rf.likelihood_enum === 'moderate'
              const dotBg = isHigh ? 'bg-rose-600' : isMod ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <div key={rf.risk_flag_id || idx} className="relative space-y-1">
                  {/* Severity Dot Marker */}
                  <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${dotBg} border-2 border-white ring-2 ring-slate-100`}></span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">{rf.condition_name}</span>
                    <span className={`pill text-[9px] uppercase font-bold border ${
                      isHigh ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {rf.likelihood_enum} Severity
                    </span>
                  </div>
                  <p className="text-xs text-muted bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="font-semibold text-ink">Rationale:</span> {rf.rationale_text}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
