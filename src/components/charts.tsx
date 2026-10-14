'use client'
import { useState, type ReactNode } from 'react'

// Chart conventions shared by every chart in the product. Colours were run
// through the dataviz palette validator against the white chart surface.

// Single-series marks (brand green, chroma-adjusted so it reads as a hue).
export const CHART_PRIMARY = '#1f8a63'
// Fixed categorical order, never cycled. A ninth series folds into "Other".
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

export const AXIS_TICK = { fontSize: 11, fill: '#76766f' }
export const GRID_STROKE = '#ececea'
export const BAR_MAX = 24
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]
export const BAR_RADIUS_H: [number, number, number, number] = [0, 4, 4, 0]

// Indian compact currency for axis ticks: ₹950, ₹12K, ₹3.4L, ₹1.2Cr.
export function compactINR(v: number): string {
  const n = Math.abs(Number(v) || 0)
  const sign = v < 0 ? '−' : ''
  if (n >= 1e7) return `${sign}₹${trim(n / 1e7)}Cr`
  if (n >= 1e5) return `${sign}₹${trim(n / 1e5)}L`
  if (n >= 1e3) return `${sign}₹${trim(n / 1e3)}K`
  return `${sign}₹${Math.round(n)}`
}
function trim(x: number) { return x >= 10 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, '') }

export function fullINR(v: number) { return '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN') }

// Tooltip: the value leads in strong ink, the series/category name follows.
type TooltipEntry = { value?: number | string; name?: string | number; color?: string }

// Recharts injects active/payload/label when this is passed as `content`.
export function ChartTooltip({ active, payload, label, format = fullINR, labelFormat }: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  format?: (v: number) => string
  labelFormat?: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      {label !== undefined && <p className="mb-1 text-gray-500">{labelFormat ? labelFormat(String(label)) : String(label)}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          {payload.length > 1 && <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} />}
          <span className="font-semibold text-gray-900 tabular-nums">{format(Number(p.value))}</span>
          {payload.length > 1 && <span className="text-gray-500">{p.name}</span>}
        </div>
      ))}
    </div>
  )
}

// Card that frames a chart with a title and a Chart / Table switch, so every
// plotted value is also readable without hovering.
export function ChartCard({ title, description, table, children, actions, className = '' }: {
  title: ReactNode
  description?: ReactNode
  table?: { columns: string[]; rows: (string | number)[][]; alignRight?: number[] }
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <section className={`card ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="card-title">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {table && (
            <div className="segmented" role="tablist" aria-label="View">
              <button data-active={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
              <button data-active={view === 'table'} onClick={() => setView('table')}>Table</button>
            </div>
          )}
        </div>
      </div>
      {view === 'chart' || !table ? (
        <div className="px-3 pb-4">{children}</div>
      ) : (
        <div className="max-h-[320px] overflow-auto border-t border-gray-100">
          <table className="table">
            <thead><tr>{table.columns.map((c, i) => <th key={c} className={table.alignRight?.includes(i) ? 'num' : ''}>{c}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri}>{r.map((v, ci) => <td key={ci} className={table.alignRight?.includes(ci) ? 'num' : ''}>{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function ChartEmpty({ children = 'No data for this period yet.' }: { children?: ReactNode }) {
  return <div className="flex h-[220px] items-center justify-center text-[13px] text-gray-500">{children}</div>
}
