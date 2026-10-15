'use client'

// Branded form controls that replace the browser's native select, date picker
// and datalist so every dropdown in the product looks and behaves the same.
// Floating panels render in a portal with fixed positioning, so they are never
// clipped by modals, cards or scrolling tables.

import {
  useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Calendar, Search, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------------- */
/* Anchored floating panel                                                    */
/* ------------------------------------------------------------------------- */

type Placement = { top: number; left: number; width: number; maxHeight: number; above: boolean }

function useAnchoredPanel(open: boolean, close: () => void, minWidth = 0, preferredHeight = 320, align: 'start' | 'end' = 'start') {
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<Placement | null>(null)

  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(Math.max(r.width, minWidth), vw - 16)
    const below = vh - r.bottom - 8
    const aboveSpace = r.top - 8
    // Flip upwards only when the panel's real height does not fit below.
    const natural = panelRef.current?.scrollHeight || preferredHeight
    const need = Math.min(preferredHeight, natural)
    const above = below < need && aboveSpace > below
    const maxHeight = Math.max(160, Math.min(preferredHeight, (above ? aboveSpace : below) - 4))
    let left = align === 'end' ? r.right - width : r.left
    if (left + width > vw - 8) left = vw - 8 - width
    left = Math.max(8, left)
    setPos({ top: above ? r.top - 4 : r.bottom + 4, left, width, maxHeight, above })
  }, [minWidth, preferredHeight, align])

  useLayoutEffect(() => {
    if (!open) return
    place()
    // Re-place once the panel has rendered and its height is known.
    const raf = requestAnimationFrame(place)
    const onScroll = (e: Event) => {
      // Scrolling inside the panel itself must not reposition it.
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      place()
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])

  return { triggerRef, panelRef, pos }
}

function FloatingPanel({ pos, panelRef, children, className = '', role, id, label }: {
  pos: Placement | null
  panelRef: React.MutableRefObject<HTMLDivElement | null>
  children: ReactNode
  className?: string
  role?: string
  id?: string
  label?: string
}) {
  if (!pos || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={label}
      style={{
        position: 'fixed',
        left: pos.left,
        width: pos.width,
        ...(pos.above ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
      }}
      className={`z-[80] rounded-lg border border-gray-200 bg-white shadow-lg animate-scale-in ${pos.above ? 'origin-bottom' : 'origin-top'} ${className}`}
    >
      {children}
    </div>,
    document.body,
  )
}

const TRIGGER = 'input flex items-center gap-2 text-left cursor-pointer disabled:cursor-not-allowed'

/* ------------------------------------------------------------------------- */
/* Select                                                                     */
/* ------------------------------------------------------------------------- */

export type SelectOption<T extends string = string> = {
  value: T
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  /** Text used for search and typeahead when label is not a string. */
  text?: string
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  size = 'md',
  className = '',
  disabled,
  searchable,
  ariaLabel,
  id,
  minPanelWidth = 200,
  clearable,
}: {
  value: T | '' | null | undefined
  onChange: (v: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  searchable?: boolean
  ariaLabel?: string
  id?: string
  minPanelWidth?: number
  /** Show a clear button that resets to the empty value. */
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const close = useCallback(() => { setOpen(false); setQuery('') }, [])
  const { triggerRef, panelRef, pos } = useAnchoredPanel(open, close, minPanelWidth)
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ buf: '', t: 0 })

  const textOf = (o: SelectOption<T>) => o.text ?? (typeof o.label === 'string' ? o.label : String(o.value))
  const showSearch = searchable ?? options.length > 8
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => textOf(o).toLowerCase().includes(q)) : options
  }, [options, query]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const i = filtered.findIndex(o => o.value === value)
    setActive(i >= 0 ? i : 0)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function choose(o: SelectOption<T> | undefined) {
    if (!o || o.disabled) return
    onChange(o.value)
    close()
    ;(triggerRef.current as HTMLButtonElement | null)?.focus()
  }

  function move(delta: number) {
    if (!filtered.length) return
    let i = active
    for (let n = 0; n < filtered.length; n++) {
      i = (i + delta + filtered.length) % filtered.length
      if (!filtered[i].disabled) break
    }
    setActive(i)
  }

  function onKey(e: ReactKeyboardEvent) {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(filtered.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); close(); (triggerRef.current as HTMLButtonElement | null)?.focus() }
    else if (e.key === 'Tab') close()
    else if (!showSearch && e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now()
      typeahead.current.buf = now - typeahead.current.t > 600 ? e.key.toLowerCase() : typeahead.current.buf + e.key.toLowerCase()
      typeahead.current.t = now
      const i = filtered.findIndex(o => textOf(o).toLowerCase().startsWith(typeahead.current.buf))
      if (i >= 0) setActive(i)
    }
  }

  const h = size === 'sm' ? 'h-8 text-xs' : size === 'lg' ? 'h-10' : ''

  return (
    <div className={`relative ${className}`}>
      <button
        ref={el => { triggerRef.current = el }}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={onKey}
        className={`${TRIGGER} ${h} ${open ? 'border-brand-600 ring-[3px] ring-brand-600/10' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span role="button" tabIndex={-1} aria-label="Clear" onClick={e => { e.stopPropagation(); onChange('' as T) }}
            className="-mr-1 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={13} />
          </span>
        )}
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <FloatingPanel pos={pos} panelRef={panelRef} className="flex flex-col overflow-hidden">
          {showSearch && (
            <div className="border-b border-gray-100 p-1.5">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => { setQuery(e.target.value); setActive(0) }}
                  onKeyDown={onKey}
                  placeholder="Search"
                  className="h-8 w-full rounded-md bg-gray-50 pl-8 pr-2 text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:ring-1 focus:ring-gray-200"
                  aria-label="Search options"
                />
              </div>
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            onKeyDown={onKey}
            className="overflow-y-auto p-1 outline-none"
            style={{ maxHeight: (pos?.maxHeight ?? 320) - (showSearch ? 48 : 0) }}
          >
            {filtered.length === 0 && <li className="px-2.5 py-6 text-center text-xs text-gray-500">No matches</li>}
            {filtered.map((o, i) => {
              const isSel = o.value === value
              return (
                <li
                  key={o.value}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 text-[13px] ${
                    o.disabled ? 'cursor-not-allowed opacity-40' : i === active ? 'bg-gray-100' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${isSel ? 'font-medium text-gray-900' : 'text-gray-800'}`}>{o.label}</span>
                    {o.description && <span className="block text-xs text-gray-500">{o.description}</span>}
                  </span>
                  <Check size={14} className={`mt-0.5 shrink-0 text-brand-600 ${isSel ? '' : 'invisible'}`} />
                </li>
              )
            })}
          </ul>
        </FloatingPanel>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* DatePicker                                                                 */
/* ------------------------------------------------------------------------- */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseISO(v: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  size = 'md',
  className = '',
  disabled,
  clearable = true,
  ariaLabel,
  id,
  required,
}: {
  value: string | null | undefined
  onChange: (v: string) => void
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  clearable?: boolean
  ariaLabel?: string
  id?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, pos } = useAnchoredPanel(open, close, 280, 340)
  const selected = parseISO(value)
  const today = new Date()
  const [view, setView] = useState(() => selected ?? today)
  const [focus, setFocus] = useState<Date>(() => selected ?? today)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const base = parseISO(value) ?? new Date()
    setView(base)
    setFocus(base)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) gridRef.current?.focus()
  }, [open, pos])

  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  function pick(d: Date) {
    onChange(toISO(d))
    close()
    ;(triggerRef.current as HTMLButtonElement | null)?.focus()
  }
  function shiftMonth(n: number) {
    setView(v => new Date(v.getFullYear(), v.getMonth() + n, 1))
  }
  function moveFocus(days: number) {
    setFocus(f => {
      const d = new Date(f)
      d.setDate(f.getDate() + days)
      if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(new Date(d.getFullYear(), d.getMonth(), 1))
      return d
    })
  }
  function onGridKey(e: ReactKeyboardEvent) {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (map[e.key] !== undefined) { e.preventDefault(); moveFocus(map[e.key]) }
    else if (e.key === 'PageUp') { e.preventDefault(); shiftMonth(-1) }
    else if (e.key === 'PageDown') { e.preventDefault(); shiftMonth(1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(focus) }
    else if (e.key === 'Escape') { e.preventDefault(); close(); (triggerRef.current as HTMLButtonElement | null)?.focus() }
  }

  const h = size === 'sm' ? 'h-8 text-xs' : size === 'lg' ? 'h-10' : ''
  const label = selected ? `${String(selected.getDate()).padStart(2, '0')} ${MONTHS_SHORT[selected.getMonth()]} ${selected.getFullYear()}` : ''

  return (
    <div className={`relative ${className}`}>
      <button
        ref={el => { triggerRef.current = el }}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}${label ? `, ${label}` : ''}` : undefined}
        aria-required={required}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}
        className={`${TRIGGER} ${h} ${open ? 'border-brand-600 ring-[3px] ring-brand-600/10' : ''}`}
      >
        <Calendar size={15} className="shrink-0 text-gray-400" />
        <span className={`min-w-0 flex-1 truncate tabular-nums ${label ? 'text-gray-900' : 'text-gray-400'}`}>{label || placeholder}</span>
        {clearable && label && !disabled && (
          <span role="button" tabIndex={-1} aria-label="Clear date" onClick={e => { e.stopPropagation(); onChange('') }}
            className="-mr-1 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <FloatingPanel pos={pos} panelRef={panelRef} role="dialog" label="Choose date" className="w-[280px] p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="btn-ghost btn-icon h-7 w-7" aria-label="Previous month"><ChevronLeft size={15} /></button>
            <span className="text-[13px] font-semibold text-gray-900">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="btn-ghost btn-icon h-7 w-7" aria-label="Next month"><ChevronRight size={15} /></button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {WEEK.map(w => <span key={w} className="pb-1 text-2xs font-medium text-gray-500">{w}</span>)}
          </div>
          <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} role="grid" aria-label={`${MONTHS[view.getMonth()]} ${view.getFullYear()}`}
            className="grid grid-cols-7 gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20">
            {days.map(d => {
              const inMonth = d.getMonth() === view.getMonth()
              const isSel = sameDay(d, selected)
              const isToday = sameDay(d, today)
              const isFocus = sameDay(d, focus)
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  tabIndex={-1}
                  role="gridcell"
                  aria-selected={isSel}
                  onClick={() => pick(d)}
                  className={`relative h-8 rounded-md text-xs tabular-nums transition-colors ${
                    isSel ? 'bg-brand-700 font-semibold text-white'
                      : isFocus ? 'bg-gray-100 text-gray-900'
                        : inMonth ? 'text-gray-800 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {d.getDate()}
                  {isToday && !isSel && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-600" />}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <button type="button" onClick={() => pick(new Date())} className="btn-ghost btn-xs">Today</button>
            {clearable && value && (
              <button type="button" onClick={() => { onChange(''); close() }} className="btn-ghost btn-xs text-gray-500">Clear</button>
            )}
          </div>
        </FloatingPanel>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Combobox: free text with suggestions (replaces <datalist>)                 */
/* ------------------------------------------------------------------------- */

export function Combobox({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  ariaLabel,
  inputClassName = '',
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  ariaLabel?: string
  inputClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const close = useCallback(() => { setOpen(false); setActive(-1) }, [])
  const { triggerRef, panelRef, pos } = useAnchoredPanel(open, close, 220, 260)
  const listId = useId()
  const q = value.trim().toLowerCase()
  const matches = suggestions.filter(s => !q || (s.toLowerCase().includes(q) && s.toLowerCase() !== q)).slice(0, 50)

  function onKey(e: ReactKeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(matches.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && open && active >= 0 && matches[active]) { e.preventDefault(); onChange(matches[active]); close() }
    else if (e.key === 'Escape' && open) { e.preventDefault(); close() }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={el => { triggerRef.current = el }}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`input ${inputClassName}`}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <FloatingPanel pos={pos} panelRef={panelRef}>
          <ul id={listId} role="listbox" className="overflow-y-auto p-1" style={{ maxHeight: pos?.maxHeight ?? 260 }}>
            {matches.map((s, i) => (
              <li key={s} role="option" aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(s); close() }}
                className={`cursor-pointer truncate rounded-md px-2.5 py-1.5 text-[13px] text-gray-800 ${i === active ? 'bg-gray-100' : ''}`}>
                {s}
              </li>
            ))}
          </ul>
        </FloatingPanel>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Menu: action list anchored to a trigger                                    */
/* ------------------------------------------------------------------------- */

type MenuTriggerProps = {
  ref: (el: HTMLElement | null) => void
  onClick: (e: React.MouseEvent) => void
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
}

export function Menu({
  trigger,
  children,
  align = 'end',
  width = 208,
  label,
}: {
  trigger: (props: MenuTriggerProps) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  width?: number
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, pos } = useAnchoredPanel(open, close, width, 360, align)

  // Move focus into the menu once it has rendered, so arrow keys work at once.
  const focused = useRef(false)
  useEffect(() => {
    if (!open) { focused.current = false; return }
    if (focused.current || !pos) return
    const first = panelRef.current?.querySelector<HTMLElement>('[aria-checked=true],[role=menuitem],[role=menuitemradio]')
    if (first) { first.focus({ preventScroll: true }); focused.current = true }
  }, [open, pos, panelRef])

  function onKey(e: ReactKeyboardEvent) {
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role=menuitem],[role=menuitemradio]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); close(); triggerRef.current?.focus() }
    else if (e.key === 'Tab') close()
  }

  return (
    <>
      {trigger({
        ref: el => { triggerRef.current = el },
        onClick: e => { e.stopPropagation(); setOpen(v => !v) },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}
      {open && (
        <FloatingPanel pos={pos} panelRef={panelRef} role="menu" label={label} className="p-1">
          <div onKeyDown={onKey} onClick={e => e.stopPropagation()}>{children(close)}</div>
        </FloatingPanel>
      )}
    </>
  )
}

export function MenuItem({ href, onClick, icon: Icon, children, tone, selected, role = 'menuitem' }: {
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  children: ReactNode
  tone?: 'danger'
  selected?: boolean
  role?: 'menuitem' | 'menuitemradio'
}) {
  const cls = `flex w-full items-center gap-2 rounded-md px-2 h-8 text-left text-[13px] outline-none transition-colors ${
    tone === 'danger' ? 'text-red-700 hover:bg-red-50 focus:bg-red-50' : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900'
  }`
  const inner = (
    <>
      {Icon && <Icon size={14} className={tone === 'danger' ? '' : 'text-gray-400'} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected && <Check size={14} className="shrink-0 text-brand-600" />}
    </>
  )
  const aria = role === 'menuitemradio' ? { 'aria-checked': !!selected } : {}
  if (href) return <a role={role} href={href} className={cls} tabIndex={-1} {...aria}>{inner}</a>
  return <button role={role} type="button" onClick={onClick} className={cls} tabIndex={-1} {...aria}>{inner}</button>
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 border-t border-gray-100" />
}
