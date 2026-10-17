import type { Quote } from '@/lib/types'
import { fmtDate } from '@/lib/format'

// Turns raw records into a short, ordered to-do list: the things someone has
// to act on today. Each item names the action and links to where it happens.

type Row = Record<string, unknown>

export type AttentionItem = {
  id: string
  urgency: 0 | 1 | 2 // 0 = overdue or blocking, 1 = due now, 2 = good to do
  title: string
  detail: string
  href: string
  cta: string
}

const DAY = 864e5
const daysSince = (iso: string | undefined | null) => {
  if (!iso) return 0
  const t = Date.parse(String(iso).length === 10 ? `${iso}T00:00:00` : String(iso))
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / DAY) : 0
}

export function buildAttention({
  quotes, projects, finance, lowStock, pendingRequests, fmtMoney,
}: {
  quotes: Quote[] | null
  projects: Row[] | null
  finance: Row[] | null
  lowStock: Row[] | null
  pendingRequests: number
  fmtMoney: (n: number) => string
}): AttentionItem[] {
  const items: AttentionItem[] = []
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10)
  const projectByQuote = new Set((projects ?? []).map(p => String(p.quote_id ?? '')).filter(Boolean))
  const status = (q: Quote) => String(q.status ?? 'draft')

  for (const q of quotes ?? []) {
    const who = q.clientName || 'Untitled client'
    if (status(q) === 'approved' && !projectByQuote.has(q.id)) {
      items.push({ id: `convert-${q.id}`, urgency: 1, title: `Create the project for ${who}`,
        detail: `${q.quoteNumber} was approved. Turn it into a project to schedule the installation.`,
        href: `/quotes/${q.id}/team`, cta: 'Convert' })
    } else if (status(q) === 'sent') {
      const age = daysSince(q.updatedAt || q.date)
      if (age >= 7) items.push({ id: `follow-${q.id}`, urgency: age >= 14 ? 0 : 1, title: `Follow up with ${who}`,
        detail: `${q.quoteNumber} was sent ${age} days ago with no decision yet.`, href: `/quotes/${q.id}/team`, cta: 'Open quote' })
    } else if (status(q) === 'draft') {
      const age = daysSince(q.updatedAt || q.date)
      if (age >= 2) items.push({ id: `draft-${q.id}`, urgency: 2, title: `Finish and send the quote for ${who}`,
        detail: `${q.quoteNumber} has been a draft for ${age} days.`, href: `/quotes/${q.id}/team`, cta: 'Continue' })
    }
  }

  for (const p of projects ?? []) {
    const st = String(p.status)
    const name = String(p.name ?? 'Project')
    const date = String(p.scheduled_date ?? '')
    if (st === 'scheduled' && date && date < today) {
      items.push({ id: `late-${p.id}`, urgency: 0, title: `Update ${name}`,
        detail: `Installation was due ${fmtDate(date)} but the project is still marked Scheduled.`, href: `/projects/${p.id}`, cta: 'Update' })
    } else if (st === 'scheduled' && date && date <= soon && !p.team_lead) {
      items.push({ id: `lead-${p.id}`, urgency: 0, title: `Assign a team lead for ${name}`,
        detail: `Installation is on ${fmtDate(date)} and nobody is leading it yet.`, href: `/projects/${p.id}`, cta: 'Assign' })
    } else if (st === 'scheduled' && !date) {
      items.push({ id: `date-${p.id}`, urgency: 2, title: `Schedule ${name}`,
        detail: 'This project has no installation date yet.', href: `/projects/${p.id}`, cta: 'Schedule' })
    } else if (st === 'completed') {
      items.push({ id: `invoice-${p.id}`, urgency: 1, title: `Invoice ${name}`,
        detail: 'The installation is complete. Send the invoice and mark the project invoiced.', href: `/projects/${p.id}`, cta: 'Invoice' })
    }
  }

  for (const f of finance ?? []) {
    const due = Number(f.contract_value ?? 0) - Number(f.total_paid ?? 0)
    if (String(f.status) === 'invoiced' && due > 0) {
      items.push({ id: `collect-${f.id}`, urgency: 1, title: `Collect ${fmtMoney(due)} from ${f.client_name || 'the client'}`,
        detail: `${f.name} is invoiced but not fully paid.`, href: `/projects/${f.id}`, cta: 'Record payment' })
    }
  }

  if (lowStock && lowStock.length > 0) {
    items.push({ id: 'stock', urgency: 1,
      title: lowStock.length === 1 ? `Reorder ${lowStock[0].name}` : `Reorder ${lowStock.length} products`,
      detail: lowStock.length === 1 ? 'It is below its minimum stock level.' : 'They are below their minimum stock levels.',
      href: '/inventory/reorder', cta: 'Reorder list' })
  }

  if (pendingRequests > 0) {
    items.push({ id: 'requests', urgency: 1,
      title: pendingRequests === 1 ? 'One person is waiting for access' : `${pendingRequests} people are waiting for access`,
      detail: 'Approve or deny their request to the workspace.', href: '/admin/access-requests', cta: 'Review' })
  }

  return items.sort((a, b) => a.urgency - b.urgency)
}
