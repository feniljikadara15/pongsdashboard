'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, CalendarClock } from 'lucide-react'

interface NotifData {
  total: number
  lowStockCount: number
  todayJobsCount: number
  lowStock: { id: string; name: string; current_stock: number; min_stock: number }[]
  todayJobs: { id: string; name: string; client_name: string; team_lead: string }[]
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotifData | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications').then(r => (r.ok ? r.json() : null)).then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  const total = data?.total ?? 0
  const jobs = data?.todayJobs ?? []
  const low = data?.lowStock ?? []

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative btn-ghost btn-icon" aria-label={`Notifications${total ? `, ${total} unread` : ''}`}>
        <Bell size={16} strokeWidth={1.75} />
        {total > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden animate-scale-in origin-top-right">
          <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100">
            <p className="text-[13px] font-semibold text-gray-900">Notifications</p>
            {total > 0 && <span className="text-xs text-gray-500 tabular-nums">{total} open</span>}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {total === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-[13px] font-medium text-gray-900">Nothing needs attention</p>
                <p className="text-xs text-gray-500 mt-0.5">Jobs due today and low stock show up here.</p>
              </div>
            )}

            {jobs.length > 0 && <SectionLabel>Scheduled today</SectionLabel>}
            {jobs.map(j => (
              <a key={j.id} href={`/projects/${j.id}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600"><CalendarClock size={14} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-gray-900">{j.name}</span>
                  <span className="block truncate text-xs text-gray-500">{j.client_name}{j.team_lead ? ` · ${j.team_lead}` : ''}</span>
                </span>
              </a>
            ))}

            {low.length > 0 && <SectionLabel>Below minimum stock</SectionLabel>}
            {low.map(p => (
              <a key={p.id} href="/inventory/reorder" className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700"><AlertTriangle size={14} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-gray-900">{p.name}</span>
                  <span className="block text-xs text-gray-500 tabular-nums">{p.current_stock} in stock · minimum {p.min_stock}</span>
                </span>
              </a>
            ))}
          </div>
          {low.length > 0 && (
            <a href="/inventory/reorder" className="block border-t border-gray-100 px-4 h-10 leading-10 text-center text-xs font-medium text-gray-700 hover:bg-gray-50">
              View reorder list
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pt-3 pb-1 text-2xs font-medium text-gray-500">{children}</p>
}
