'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Copy, ChevronDown, Check, GitBranch, History, MoreHorizontal,
  FileText, Pencil, FileDown,
} from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR, calculateQuote } from '@/lib/calculations'
import { listCompanies } from '@/lib/companies'
import { PageHeader, Stat, StatGrid, EmptyState, LoadingRows, SearchInput, StatusBadge, statusDot } from '@/components/ui'
import { fmtDate } from '@/lib/format'

const TIER_LABEL: Record<string, string> = {
  dealer: 'Dealer', msp: 'MSP', specifiors: 'Specifier', manual: 'Manual', manual_custom: 'Custom',
}

type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected'
const STATUSES: QuoteStatus[] = ['draft', 'sent', 'approved', 'rejected']
const STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'Draft', sent: 'Sent', approved: 'Approved', rejected: 'Rejected' }

function getStatus(quote: Quote): QuoteStatus {
  return ((quote as unknown as Record<string, unknown>).status as QuoteStatus) ?? 'draft'
}

function totalOf(q: Quote) {
  try { return calculateQuote(q).grandTotal } catch { return 0 }
}

// Shared register used by both the Dashboard (`/`) and the Quotes module
// (`/quotes`). Ownership scoping is enforced server-side, so a standard user's
// list already contains only their own quotes.
export default function QuoteRegister({ variant = 'dashboard' }: { variant?: 'dashboard' | 'quotes' }) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [me, setMe] = useState<{ name?: string; role?: string; email?: string; isAdmin?: boolean } | null>(null)
  const isAdmin = !!me?.isAdmin

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe(d)).catch(() => {})
  }, [])

  const fetchQuotes = useCallback(async (q = '', company = 'all') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes?q=${encodeURIComponent(q)}&company=${encodeURIComponent(company)}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setLoadError((data && data.error) ? String(data.error) : `The server returned ${res.status}.`)
        setQuotes([])
      } else {
        setLoadError('')
        setQuotes(Array.isArray(data) ? data : [])
      }
    } catch {
      setLoadError('Could not reach the server.')
      setQuotes([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchQuotes(search, companyFilter), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search, companyFilter, fetchQuotes])

  const value = quotes.reduce((s, q) => s + totalOf(q), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthQuotes = quotes.filter(q => q.date?.startsWith(thisMonth))
  const thisMonthValue = thisMonthQuotes.reduce((s, q) => s + totalOf(q), 0)
  const approved = quotes.filter(q => getStatus(q) === 'approved')
  const approvedValue = approved.reduce((s, q) => s + totalOf(q), 0)
  const decided = quotes.filter(q => ['approved', 'rejected'].includes(getStatus(q))).length
  const conversionRate = decided > 0 ? Math.round((approved.length / decided) * 100) : 0
  const openValue = quotes.filter(q => ['draft', 'sent'].includes(getStatus(q))).reduce((s, q) => s + totalOf(q), 0)

  const statusCounts = STATUSES.map(s => ({ s, n: quotes.filter(q => getStatus(q) === s).length }))
  const filtered = statusFilter === 'all' ? quotes : quotes.filter(q => getStatus(q) === statusFilter)

  async function updateStatus(id: string, status: QuoteStatus) {
    const quote = quotes.find(q => q.id === id)
    if (!quote) return
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } as Quote : q))
    await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...quote, status }),
    })
  }

  async function deleteQuote(id: string, name: string) {
    if (!confirm(`Delete the quote for "${name}"? This cannot be undone.`)) return
    setBusy(id)
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setQuotes(prev => prev.filter(q => q.id !== id))
    setBusy(null)
  }

  async function duplicateQuote(quote: Quote) {
    setBusy(quote.id)
    const payload = {
      ...quote,
      id: undefined,
      quoteNumber: undefined,
      clientName: quote.clientName + ' (Copy)',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    }
    const res = await fetch('/api/quotes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const created = await res.json()
    setBusy(null)
    window.location.href = `/quotes/${created.id}/edit`
  }

  // Create a linked revision (never overwrites the original) then open it for editing.
  async function reviseQuote(quote: Quote) {
    setBusy(quote.id)
    const res = await fetch(`/api/quotes/${quote.id}/revisions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    setBusy(null)
    if (!res.ok) { alert('Could not create a revision.'); return }
    const created = await res.json()
    window.location.href = `/quotes/${created.id}/edit`
  }

  const companies = [{ id: 'all', label: 'All companies' }, ...listCompanies().map(c => ({ id: c.id, label: c.shortName }))]
  const firstName = me?.name ? me.name.split(' ')[0] : null

  const heading = variant === 'quotes'
    ? 'Quotes'
    : (isAdmin ? 'Quotations' : firstName ? `${firstName}'s quotations` : 'My quotations')

  const description = variant === 'quotes'
    ? (isAdmin ? 'Every quotation issued across STC and NLS.' : 'Quotations you have created.')
    : 'Pipeline overview and the latest quotations.'

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={heading}
        description={description}
        actions={
          <>
            <div className="segmented" role="tablist" aria-label="Company">
              {companies.map(c => (
                <button key={c.id} data-active={companyFilter === c.id} onClick={() => setCompanyFilter(c.id)}>{c.label}</button>
              ))}
            </div>
            <a href="/quotes/new" className="btn-primary"><Plus size={15} strokeWidth={2.25} /> New quote</a>
          </>
        }
      />

      <StatGrid>
        <Stat label={isAdmin ? 'Total quotes' : 'My quotes'} value={loading ? '—' : quotes.length}
          hint={loading ? ' ' : `${thisMonthQuotes.length} created this month`} />
        <Stat label="Open pipeline" value={loading ? '—' : fmtINR(openValue)} hint="Draft and sent" />
        <Stat label="Won" value={loading ? '—' : fmtINR(approvedValue)}
          hint={decided ? `${conversionRate}% win rate on decided quotes` : 'No decisions yet'} tone={decided ? 'success' : 'neutral'} />
        <Stat label="Quoted this month" value={loading ? '—' : fmtINR(thisMonthValue)} hint={`${fmtINR(value)} across all quotes`} />
      </StatGrid>

      <div className="table-wrap">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-0.5 px-0.5">
            <button className="chip" data-active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
              All <span className="tabular-nums opacity-60">{quotes.length}</span>
            </button>
            {statusCounts.map(({ s, n }) => (
              <button key={s} className="chip" data-active={statusFilter === s} onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}>
                <span className={`dot ${statusDot(s)}`} />
                {STATUS_LABELS[s]} <span className="tabular-nums opacity-60">{n}</span>
              </button>
            ))}
          </div>
          <SearchInput placeholder="Search client, project, number" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <LoadingRows rows={6} cols={5} />
        ) : loadError ? (
          <div className="p-5">
            <div className="alert-error" role="alert">
              <span><span className="font-medium">Quotations could not be loaded.</span> {loadError}</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? 'No quotes match your search' : statusFilter !== 'all' ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} quotes` : 'No quotations yet'}
            description={search ? 'Try a client name, project or quote number.' : statusFilter === 'all' ? 'Create a quotation to start building your pipeline.' : undefined}
            action={!search && statusFilter === 'all' ? <a href="/quotes/new" className="btn-primary"><Plus size={15} /> New quote</a> : undefined}
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th className="w-[110px]">Quote</th>
                  <th>Client and project</th>
                  <th className="hidden md:table-cell">Pricing</th>
                  <th className="hidden lg:table-cell">Date</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                  <th className="w-12"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(quote => (
                  <QuoteRow key={quote.id} quote={quote} busy={busy === quote.id}
                    onDelete={() => deleteQuote(quote.id, quote.clientName)}
                    onDuplicate={() => duplicateQuote(quote)}
                    onRevise={() => reviseQuote(quote)}
                    onStatusChange={s => updateStatus(quote.id, s)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="table-footer">
            <span>{filtered.length} of {quotes.length} quotes</span>
            <span className="tabular-nums">Total {fmtINR(filtered.reduce((s, q) => s + totalOf(q), 0))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open, close])
  return ref
}

function QuoteRow({ quote, busy, onDelete, onDuplicate, onRevise, onStatusChange }: {
  quote: Quote
  busy: boolean
  onDelete: () => void
  onDuplicate: () => void
  onRevise: () => void
  onStatusChange: (s: QuoteStatus) => void
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeStatus = useCallback(() => setStatusOpen(false), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const statusRef = useDismiss(statusOpen, closeStatus)
  const menuRef = useDismiss(menuOpen, closeMenu)

  const status = getStatus(quote)
  const date = fmtDate(quote.date)
  const itemCount = quote.items?.length ?? 0
  const rev = Number(quote.revision ?? 0)
  const grandTotal = totalOf(quote)
  const href = `/quotes/${quote.id}/team`

  return (
    <tr className={`cursor-pointer ${busy ? 'opacity-50' : ''}`} onClick={e => {
      if ((e.target as HTMLElement).closest('button,a')) return
      window.location.href = href
    }}>
      <td>
        <a href={href} className="mono text-xs font-medium text-gray-900 hover:underline">{quote.quoteNumber}</a>
        {rev > 0 && <div className="mt-0.5 text-2xs text-gray-500">Revision {rev}</div>}
      </td>
      <td className="max-w-[340px]">
        <div className="truncate font-medium text-gray-900">{quote.clientName || 'Untitled client'}</div>
        <div className="truncate text-xs text-gray-500">
          {[quote.projectName, quote.location, `${itemCount} item${itemCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
        </div>
      </td>
      <td className="hidden md:table-cell">
        <span className="text-xs text-gray-700">{quote.company ?? 'STC'}</span>
        <span className="text-xs text-gray-400"> · {TIER_LABEL[quote.priceTier] ?? quote.priceTier}</span>
      </td>
      <td className="hidden lg:table-cell text-xs text-gray-600 tabular-nums whitespace-nowrap">{date}</td>
      <td>
        <div ref={statusRef} className="relative inline-block">
          <button onClick={() => setStatusOpen(v => !v)} aria-haspopup="listbox" className="group inline-flex items-center gap-0.5">
            <StatusBadge status={status} />
            <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-700" />
          </button>
          {statusOpen && (
            <div className="absolute top-full left-0 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg z-20 animate-scale-in origin-top-left" role="listbox">
              {STATUSES.map(s => (
                <button key={s} role="option" aria-selected={s === status} onClick={() => { onStatusChange(s); setStatusOpen(false) }}
                  className="flex w-full items-center gap-2 rounded-md px-2 h-8 text-[13px] text-gray-700 hover:bg-gray-100">
                  <span className={`dot ${statusDot(s)}`} />
                  <span className="flex-1 text-left">{STATUS_LABELS[s]}</span>
                  {s === status && <Check size={14} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="num font-medium text-gray-900 whitespace-nowrap">{grandTotal > 0 ? fmtINR(grandTotal) : '—'}</td>
      <td className="text-right">
        <div ref={menuRef} className="relative inline-block">
          <button onClick={() => setMenuOpen(v => !v)} className="btn-ghost btn-icon" aria-label="Quote actions" aria-haspopup="menu" disabled={busy}>
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-gray-200 bg-white p-1 shadow-lg z-20 animate-scale-in origin-top-right text-left">
              <MenuItem href={`/quotes/${quote.id}/edit`} icon={Pencil}>Edit quote</MenuItem>
              <MenuItem href={`/quotes/${quote.id}/client`} icon={FileDown}>Client PDF</MenuItem>
              <MenuItem href={`/quotes/${quote.id}/revisions`} icon={History}>Revision history</MenuItem>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem onClick={() => { setMenuOpen(false); onRevise() }} icon={GitBranch}>Create revision</MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onDuplicate() }} icon={Copy}>Duplicate</MenuItem>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem onClick={() => { setMenuOpen(false); onDelete() }} icon={Trash2} danger>Delete</MenuItem>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function MenuItem({ href, onClick, icon: Icon, children, danger }: {
  href?: string; onClick?: () => void; icon: typeof Pencil; children: React.ReactNode; danger?: boolean
}) {
  const cls = `flex w-full items-center gap-2 rounded-md px-2 h-8 text-[13px] ${danger ? 'text-red-700 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'}`
  const inner = <><Icon size={14} className={danger ? '' : 'text-gray-400'} />{children}</>
  if (href) return <a role="menuitem" href={href} className={cls}>{inner}</a>
  return <button role="menuitem" type="button" onClick={onClick} className={cls}>{inner}</button>
}
