// Petits graphiques en SVG, sans bibliothèque : légers et lisibles hors ligne.

export interface BarDatum {
  label: string
  parts: { value: number; tone: 'green' | 'orange' }[]
}

export function BarChart({ data, unit, ariaLabel }: { data: BarDatum[]; unit: string; ariaLabel: string }) {
  const W = 340
  const H = 140
  const pad = { top: 18, bottom: 22 }
  const totals = data.map((d) => d.parts.reduce((s, p) => s + p.value, 0))
  const max = Math.max(1, ...totals)
  const slot = W / data.length
  const barW = Math.min(26, slot * 0.62)
  const scale = (v: number) => (v / max) * (H - pad.top - pad.bottom)

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <line x1="0" x2={W} y1={H - pad.bottom} y2={H - pad.bottom} className="chart-axis" />
      {data.map((d, i) => {
        const x = i * slot + (slot - barW) / 2
        let y = H - pad.bottom
        const total = totals[i]
        const isLast = i === data.length - 1
        return (
          <g key={i}>
            <title>{`${d.label} : ${Math.round(total)} ${unit}`}</title>
            {d.parts.map((p, j) => {
              const h = scale(p.value)
              y -= h
              return h > 0 ? <rect key={j} x={x} y={y} width={barW} height={h} rx="3" className={`bar-${p.tone}`} /> : null
            })}
            {(isLast || total === max) && total > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" className="chart-value">
                {Math.round(total)}
              </text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="chart-label">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function LineChart({ points, unit, ariaLabel }: { points: { x: number; y: number; label: string }[]; unit: string; ariaLabel: string }) {
  const W = 340
  const H = 150
  const pad = { l: 34, r: 10, t: 14, b: 22 }
  if (points.length === 0) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)]
  let [yMin, yMax] = [Math.min(...ys), Math.max(...ys)]
  if (yMax - yMin < 2) {
    yMin -= 1
    yMax += 1
  }
  const sx = (x: number) => (xMax === xMin ? (W + pad.l - pad.r) / 2 : pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r))
  const sy = (y: number) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * (H - pad.t - pad.b)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
  const ticks = [yMin, (yMin + yMax) / 2, yMax]
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} className="chart-grid" />
          <text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" className="chart-label">
            {t.toFixed(1).replace('.', ',')}
          </text>
        </g>
      ))}
      <path d={path} className="chart-line" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={points.length > 40 ? 0 : 3} className="chart-dot">
          <title>{`${p.label} : ${p.y.toString().replace('.', ',')} ${unit}`}</title>
        </circle>
      ))}
      <text x={pad.l} y={H - 6} className="chart-label">
        {first.label}
      </text>
      {points.length > 1 && (
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="chart-label">
          {last.label}
        </text>
      )}
    </svg>
  )
}
