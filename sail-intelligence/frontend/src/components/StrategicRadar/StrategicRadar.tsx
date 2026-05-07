/**
 * src/components/StrategicRadar/StrategicRadar.tsx
 *
 * 5-axis interactive radar chart built with Framer Motion + raw SVG.
 * No third-party chart library — full control over animation and styling.
 *
 * Props:
 *   labels  — exactly 5 axis labels (from KPI config radarLabels)
 *   values  — 5 numbers in [0, 1] — one per axis, in the same order as labels
 *   compare — optional second dataset (e.g. competitor) rendered as a ghost polygon
 */

import { motion } from 'framer-motion'

interface RadarProps {
  labels:   [string, string, string, string, string]
  values:   [number, number, number, number, number]
  compare?: [number, number, number, number, number]
  size?:    number
}

const N = 5   // axes

/** Polar → Cartesian, starting at top (−90°) going clockwise */
function toXY(value: number, index: number, cx: number, cy: number, radius: number) {
  const angle = ((index / N) * 2 * Math.PI) - Math.PI / 2
  return {
    x: cx + radius * value * Math.cos(angle),
    y: cy + radius * value * Math.sin(angle),
  }
}

function polygon(
  values: number[],
  cx: number,
  cy: number,
  radius: number,
): string {
  return values
    .map((v, i) => {
      const { x, y } = toXY(v, i, cx, cy, radius)
      return `${x},${y}`
    })
    .join(' ')
}

// ── Grid rings ────────────────────────────────────────────────────────────────
function GridRings({ cx, cy, radius }: { cx: number; cy: number; radius: number }) {
  const rings = [0.25, 0.5, 0.75, 1.0]
  return (
    <>
      {rings.map((r) => (
        <polygon
          key={r}
          points={polygon(Array(N).fill(r), cx, cy, radius)}
          fill="none"
          stroke="#163059"
          strokeWidth={r === 1 ? 1.5 : 0.75}
        />
      ))}
      {/* Axis lines */}
      {Array.from({ length: N }).map((_, i) => {
        const end = toXY(1, i, cx, cy, radius)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={end.x} y2={end.y}
            stroke="#163059"
            strokeWidth={0.75}
          />
        )
      })}
    </>
  )
}

// ── Axis labels ───────────────────────────────────────────────────────────────
function AxisLabels({
  labels,
  cx,
  cy,
  radius,
}: {
  labels: string[]
  cx: number
  cy: number
  radius: number
}) {
  return (
    <>
      {labels.map((label, i) => {
        const { x, y } = toXY(1.28, i, cx, cy, radius)
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-sail-muted text-[10px] font-sans font-medium"
            style={{ fontSize: 10 }}
          >
            {label}
          </text>
        )
      })}
    </>
  )
}

// ── Radar polygon ─────────────────────────────────────────────────────────────
function RadarPolygon({
  values,
  cx,
  cy,
  radius,
  color,
  opacity,
  delay = 0,
}: {
  values:  number[]
  cx:      number
  cy:      number
  radius:  number
  color:   string
  opacity: number
  delay?:  number
}) {
  const pts = polygon(values, cx, cy, radius)

  return (
    <>
      {/* Filled area */}
      <motion.polygon
        points={pts}
        fill={color}
        fillOpacity={opacity}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ scale: 0, originX: '50%', originY: '50%' }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      />
      {/* Vertex dots */}
      {values.map((v, i) => {
        const { x, y } = toXY(v, i, cx, cy, radius)
        return (
          <motion.circle
            key={i}
            cx={x} cy={y} r={4}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.4 + i * 0.05 }}
          />
        )
      })}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function StrategicRadar({ labels, values, compare, size = 320 }: RadarProps) {
  const cx     = size / 2
  const cy     = size / 2
  const radius = size * 0.34   // leave room for labels

  // Clamp all values to [0, 1]
  const clamped = values.map((v) => Math.min(1, Math.max(0, v ?? 0))) as typeof values
  const cmpClamped = compare?.map((v) => Math.min(1, Math.max(0, v ?? 0))) as typeof compare

  return (
    <div className="card flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <p className="section-label">Strategic Radar</p>
        {compare && (
          <div className="flex items-center gap-3 text-xs text-sail-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-sail-accent rounded" />
              You
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-sail-gold rounded" />
              Competitor
            </span>
          </div>
        )}
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <GridRings cx={cx} cy={cy} radius={radius} />

        {/* Competitor ghost polygon (behind main) */}
        {cmpClamped && (
          <RadarPolygon
            values={cmpClamped}
            cx={cx} cy={cy} radius={radius}
            color="#f0b429"
            opacity={0.08}
            delay={0.1}
          />
        )}

        {/* Primary polygon */}
        <RadarPolygon
          values={clamped}
          cx={cx} cy={cy} radius={radius}
          color="#00d4ff"
          opacity={0.15}
          delay={0}
        />

        <AxisLabels labels={labels} cx={cx} cy={cy} radius={radius} />
      </svg>

      {/* Numeric summary row */}
      <div className="grid grid-cols-5 w-full gap-1">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-sm font-semibold text-sail-accent">
              {(clamped[i]! * 100).toFixed(0)}
            </span>
            <span className="text-[9px] text-sail-muted text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
