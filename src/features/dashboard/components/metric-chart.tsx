'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

interface SeriesDef {
  key: string
  name: string
  color: string
}

interface ChartProps {
  data: unknown[]
  xKey: string
  series: SeriesDef[]
  height?: number
  /** When true, the chart keeps a per-group min width and scrolls horizontally instead of squeezing every group into view. */
  scrollX?: boolean
}

const AXIS = { fontSize: 11, fill: '#94a3b8' }

export function BarMetricChart({ data, xKey, series, height = 280, scrollX = false }: ChartProps) {
  if (data.length === 0) return <EmptyChart />
  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
  if (!scrollX) return chart
  // Reserve ~16px per bar plus padding per group so many groups stay legible behind a horizontal scrollbar.
  const minWidth = Math.max(data.length * (series.length * 16 + 36), 320)
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>{chart}</div>
    </div>
  )
}

export function LineMetricChart({ data, xKey, series, height = 280 }: ChartProps) {
  if (data.length === 0) return <EmptyChart />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
      No data for this range yet.
    </div>
  )
}
