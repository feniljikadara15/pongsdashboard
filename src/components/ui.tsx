import type { ReactNode, InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
export { Modal } from '@/components/Modal'
import type { LucideIcon } from 'lucide-react'

// Shared presentation primitives. Every page composes these so headings,
// metrics, statuses and empty states look and behave the same everywhere.

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-[22px] font-semibold tracking-tight text-gray-900 truncate">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-gray-500">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const c = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }[cols]
  return <div className={`grid grid-cols-2 ${c} gap-3 mb-6`}>{children}</div>
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  href,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: 'neutral' | 'danger' | 'warning' | 'success'
  href?: string
}) {
  const hintTone = { neutral: 'text-gray-500', danger: 'text-red-700', warning: 'text-amber-700', success: 'text-brand-700' }[tone]
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="stat-label truncate">{label}</span>
        {Icon && <Icon size={15} className="text-gray-400 shrink-0" strokeWidth={1.75} />}
      </div>
      <div className="stat-value truncate">{value}</div>
      {hint && <div className={`mt-1 text-xs ${hintTone} truncate`}>{hint}</div>}
    </>
  )
  if (href) return <a href={href} className="stat-card block hover:border-gray-300 transition-colors">{body}</a>
  return <div className="stat-card">{body}</div>
}

export function Card({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = 'p-5',
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'badge-neutral',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  accent: 'badge-accent',
}
const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-gray-400',
  info: 'bg-sky-500',
  success: 'bg-brand-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  accent: 'bg-violet-500',
}

// Every status string used across modules maps to one tone here, so the same
// word always carries the same colour.
const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  sent: 'info',
  approved: 'success',
  rejected: 'danger',
  scheduled: 'info',
  in_progress: 'warning',
  'in progress': 'warning',
  completed: 'success',
  invoiced: 'accent',
  paid: 'success',
  on_hold: 'neutral',
  cancelled: 'danger',
  canceled: 'danger',
  pending: 'warning',
  received: 'success',
  partial: 'warning',
  ordered: 'info',
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
  denied: 'danger',
  lead: 'info',
  prospect: 'info',
  in: 'success',
  out: 'danger',
  adjustment: 'neutral',
  high: 'danger',
  urgent: 'danger',
  normal: 'neutral',
  low: 'neutral',
}

export function toneFor(status: string | null | undefined): Tone {
  return STATUS_TONE[String(status ?? '').toLowerCase()] ?? 'neutral'
}

export function humanize(s: string | null | undefined): string {
  const v = String(s ?? '').replace(/[_-]+/g, ' ').trim()
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : '—'
}

export function Badge({ tone = 'neutral', dot = false, children, className = '' }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`${TONE_CLASS[tone]} ${className}`}>
      {dot && <span className={`dot ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  )
}

export function StatusBadge({ status, label, className = '' }: { status: string | null | undefined; label?: ReactNode; className?: string }) {
  const tone = toneFor(status)
  return <Badge tone={tone} dot className={className}>{label ?? humanize(status)}</Badge>
}

export function statusDot(status: string | null | undefined) {
  return TONE_DOT[toneFor(status)]
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-10' : 'py-16'}`}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 shadow-sm">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 h-12">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="skeleton h-3" style={{ width: j === 0 ? '28%' : `${12 + ((i + j) % 3) * 4}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-3.5 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-4 space-y-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="card">
        <LoadingRows />
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  required,
  children,
  className = '',
}: {
  label: ReactNode
  hint?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  )
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = String(name || '?').split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials || '?'}
    </span>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">{children}</div>
}

export function SearchInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative w-full sm:max-w-xs ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input type="search" className="input pl-8" {...props} />
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={`inline-flex items-start gap-2.5 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
      {(label || description) && (
        <span className="leading-tight">
          {label && <span className="block text-[13px] font-medium text-gray-900">{label}</span>}
          {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
        </span>
      )}
    </label>
  )
}

// Radio-card group for choosing one of a few named options with a short note.
export function OptionCards<T extends string>({
  value,
  onChange,
  options,
  columns = 'grid-cols-2 sm:grid-cols-3',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; note?: ReactNode }[]
  columns?: string
}) {
  return (
    <div role="radiogroup" className={`grid gap-2 ${columns}`}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`relative rounded-md border px-3 py-2.5 text-left transition-colors ${
              on ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className={`block text-[13px] font-medium ${on ? 'text-brand-800' : 'text-gray-900'}`}>{o.label}</span>
            {o.note && <span className={`mt-0.5 block text-xs ${on ? 'text-brand-700/80' : 'text-gray-500'}`}>{o.note}</span>}
          </button>
        )
      })}
    </div>
  )
}
