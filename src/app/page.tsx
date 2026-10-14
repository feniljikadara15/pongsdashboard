'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CalendarClock, FileText, PackageCheck, Plus } from 'lucide-react'
import { useMe, can } from '@/lib/useMe'
import type { Quote } from '@/lib/types'
import { calculateQuote, fmtINR } from '@/lib/calculations'
import { fmtDate, fmtDateLong, monthShort, toDate } from '@/lib/format'
import { PageHeader, Stat, StatGrid, StatusBadge, EmptyState, LoadingRows, PageLoading } from '@/components/ui'

type Row = Record<string, unknown>

function totalOf(q: Quote) {
  try { return calculateQuote(q).grandTotal } catch { return 0 }
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// The Dashboard is an admin-controlled board. Users without explicit dashboard
// access are routed to the Quotes module instead of being shown an error.
export default function HomePage() {
  const { me, loading } = useMe()
  const [quotes, setQuotes] = useState<Quote[] | null>(null)
  const [projects, setProjects] = useState<Row[] | null>(null)
  const [lowStock, setLowStock] = useState<Row[] | null>(null)

  const canQuotes = can(me, 'quotes', 'view')
  const canProjects = can(me, 'projects', 'view')
  const canInventory = can(me, 'inventory', 'view')

  useEffect(() => {
    if (!me) return
    if (canQuotes) fetch('/api/quotes').then(r => r.json()).then(d => setQuotes(Array.isArray(d) ? d : [])).catch(() => setQuotes([]))
    if (canProjects) fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => setProjects([]))
    if (canInventory) fetch('/api/notifications').then(r => r.json()).then(d => setLowStock(d?.lowStock ?? [])).catch(() => setLowStock([]))
  }, [me, canQuotes, canProjects, canInventory])

  if (loading) return <PageLoading />

  if (!can(me, 'dashboard', 'view')) {
    if (typeof window !== 'undefined') window.location.replace('/quotes')
    return null
  }

  const q = quotes ?? []
  const status = (x: Quote) => String((x as unknown as Row).status ?? 'draft')
  const month = new Date().toISOString().slice(0, 7)
  const open = q.filter(x => ['draft', 'sent'].includes(status(x)))
  const won = q.filter(x => status(x) === 'approved')
  const decided = q.filter(x => ['approved', 'rejected'].includes(status(x))).length
  const sentAwaiting = q.filter(x => status(x) === 'sent')

  const today = new Date().toISOString().slice(0, 10)
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
  const p = projects ?? []
  const active = p.filter(x => !['completed', 'invoiced', 'cancelled'].includes(String(x.status)))
  const upcoming = p
    .filter(x => String(x.scheduled_date ?? '') >= today && String(x.scheduled_date ?? '') <= in14 && !['completed', 'invoiced', 'cancelled'].includes(String(x.status)))
    .sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))

  const recent = [...q].sort((a, b) => String(b.updatedAt ?? b.date).localeCompare(String(a.updatedAt ?? a.date))).slice(0, 6)
  const firstName = me?.name?.split(' ')[0]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description={fmtDateLong(new Date(), { weekday: true })}
        actions={canQuotes ? <a href="/quotes/new" className="btn-primary"><Plus size={15} strokeWidth={2.25} /> New quote</a> : undefined}
      />

      <StatGrid>
        {canQuotes && (
          <>
            <Stat label="Open pipeline" value={quotes ? fmtINR(open.reduce((s, x) => s + totalOf(x), 0)) : '—'}
              hint={quotes ? `${open.length} quotes in draft or sent` : ' '} href="/quotes" />
            <Stat label="Won this month" value={quotes ? fmtINR(won.filter(x => x.date?.startsWith(month)).reduce((s, x) => s + totalOf(x), 0)) : '—'}
              hint={quotes ? (decided ? `${Math.round((won.length / decided) * 100)}% win rate overall` : 'No decisions yet') : ' '} tone="success" />
          </>
        )}
        {canProjects && (
          <>
            <Stat label="Active projects" value={projects ? active.length : '—'}
              hint={projects ? fmtINR(active.reduce((s, x) => s + Number(x.contract_value ?? 0), 0)) + ' contracted' : ' '} href="/projects" />
            <Stat label="Installs next 14 days" value={projects ? upcoming.length : '—'}
              hint={projects ? (upcoming[0] ? `Next on ${fmtDate(String(upcoming[0].scheduled_date))}` : 'Nothing scheduled') : ' '} href="/projects/calendar" />
          </>
        )}
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        {canQuotes && (
          <section className="table-wrap lg:col-span-2">
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
              <h2 className="card-title">Recent quotations</h2>
              <a href="/quotes" className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">
                View all <ArrowRight size={13} />
              </a>
            </div>
            {!quotes ? <LoadingRows rows={5} cols={4} /> : recent.length === 0 ? (
              <EmptyState icon={FileText} title="No quotations yet" description="Your latest quotations will appear here."
                action={<a href="/quotes/new" className="btn-secondary btn-sm"><Plus size={14} /> New quote</a>} compact />
            ) : (
              <div className="table-scroll">
                <table className="table table-hover">
                  <tbody>
                    {recent.map(x => (
                      <tr key={x.id} className="cursor-pointer" onClick={() => { window.location.href = `/quotes/${x.id}/team` }}>
                        <td className="w-[96px]"><span className="mono text-xs text-gray-500">{x.quoteNumber}</span></td>
                        <td className="max-w-[280px]">
                          <div className="truncate font-medium text-gray-900">{x.clientName}</div>
                          <div className="truncate text-xs text-gray-500">{[x.projectName, x.location].filter(Boolean).join(' · ') || '—'}</div>
                        </td>
                        <td className="hidden sm:table-cell"><StatusBadge status={status(x)} /></td>
                        <td className="num font-medium text-gray-900 whitespace-nowrap">{fmtINR(totalOf(x))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quotes && sentAwaiting.length > 0 && (
              <div className="table-footer">
                <span>{sentAwaiting.length} sent {sentAwaiting.length === 1 ? 'quote is' : 'quotes are'} awaiting a client decision</span>
                <span className="tabular-nums">{fmtINR(sentAwaiting.reduce((s, x) => s + totalOf(x), 0))}</span>
              </div>
            )}
          </section>
        )}

        <div className="space-y-4">
          {canProjects && (
            <section className="card">
              <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
                <h2 className="card-title">Upcoming installations</h2>
                <a href="/projects/calendar" className="text-xs font-medium text-gray-600 hover:text-gray-900">Schedule</a>
              </div>
              {!projects ? <LoadingRows rows={3} cols={2} /> : upcoming.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing in the next two weeks" compact />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {upcoming.slice(0, 5).map(x => {
                    const d = toDate(String(x.scheduled_date)) ?? new Date()
                    return (
                      <li key={String(x.id)}>
                        <a href={`/projects/${x.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                          <span className="flex w-10 shrink-0 flex-col items-center rounded-md border border-gray-200 bg-white py-1 leading-none">
                            <span className="text-2xs font-medium uppercase text-gray-500">{monthShort(d)}</span>
                            <span className="mt-0.5 text-[15px] font-semibold tabular-nums text-gray-900">{d.getDate()}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-gray-900">{String(x.name)}</span>
                            <span className="block truncate text-xs text-gray-500">
                              {[x.client_name, x.team_lead ? `Lead: ${x.team_lead}` : null].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {canInventory && (
            <section className="card">
              <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
                <h2 className="card-title">Stock alerts</h2>
                <a href="/inventory/reorder" className="text-xs font-medium text-gray-600 hover:text-gray-900">Reorder list</a>
              </div>
              {!lowStock ? <LoadingRows rows={3} cols={2} /> : lowStock.length === 0 ? (
                <EmptyState icon={PackageCheck} title="All products above minimum" compact />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {lowStock.slice(0, 6).map(x => {
                    const cur = Number(x.current_stock ?? 0)
                    const min = Number(x.min_stock ?? 0)
                    const pct = min > 0 ? Math.min(100, Math.round((cur / min) * 100)) : 0
                    return (
                      <li key={String(x.id)} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-[13px] font-medium text-gray-900">{String(x.name)}</span>
                          <span className="shrink-0 text-xs tabular-nums text-gray-500">{cur} / {min}</span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-gray-100">
                          <div className={`h-1 rounded-full ${pct < 50 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
