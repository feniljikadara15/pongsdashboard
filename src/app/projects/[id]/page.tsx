'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Pencil, Plus, Trash2, FileText, Receipt, Wallet, MessageSquare, HardHat } from 'lucide-react'
import { StatusBadge, Badge, EmptyState, Modal, Field, PageLoading, Avatar } from '@/components/ui'
import ProjectFormModal, { PROJECT_STATUS_LABELS, teamMembersText, type Project as FormProject } from '@/components/ProjectFormModal'
import { fmtINR, fmtDate } from '@/lib/format'

interface Project extends FormProject { created_at: string }
interface Payment { id: string; type: string; amount: number; payment_date: string; method: string; reference: string; notes: string }
interface Expense { id: string; category: string; description: string; amount: number; expense_date: string; paid_to: string; notes: string }
interface Checklist { id: string; phase: string; item: string; done: number; done_by: string; done_at: string; sort_order: number }
interface Update { id: string; note: string; status: string; created_at: string; created_by: string }

type Tab = 'overview' | 'payments' | 'checklist' | 'updates'
const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'upi', 'card', 'other']
const EXPENSE_CATEGORIES = ['materials', 'labour', 'transport', 'tools', 'subcontract', 'other']
const PHASES = ['pre-install', 'install', 'post-install']
const PHASE_LABEL: Record<string, string> = { 'pre-install': 'Before installation', install: 'Installation', 'post-install': 'After installation' }
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—')

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [contractValue, setContractValue] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [checklist, setChecklist] = useState<Checklist[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ type: 'payment', amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'bank_transfer', reference: '', notes: '' })
  const [showExpModal, setShowExpModal] = useState(false)
  const [expForm, setExpForm] = useState({ category: 'materials', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), paid_to: '', notes: '' })
  const [updateNote, setUpdateNote] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProject = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`)
    if (!r.ok) { setProject(null); setLoading(false); return }
    const data = await r.json()
    const { materials: _m, updates: upd, ...proj } = data
    setProject(proj)
    setUpdates(upd || [])
    setLoading(false)
  }, [id])

  const loadPayments = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}/payments`)
    const data = await r.json()
    setPayments(data.payments || [])
    setExpenses(data.expenses || [])
    setContractValue(data.contractValue || 0)
    setTotalPaid(data.totalPaid || 0)
    setTotalExpenses(data.totalExpenses || 0)
  }, [id])

  const loadChecklist = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}/checklist`)
    const data = await r.json()
    setChecklist(Array.isArray(data) ? data : [])
  }, [id])

  useEffect(() => {
    loadProject()
    loadPayments()
    loadChecklist()
  }, [loadProject, loadPayments, loadChecklist])

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/projects/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payForm, amount: Number(payForm.amount) }) })
    setSaving(false)
    setShowPayModal(false)
    setPayForm({ type: 'payment', amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'bank_transfer', reference: '', notes: '' })
    loadPayments()
  }

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/projects/${id}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expForm, amount: Number(expForm.amount) }) })
    setSaving(false)
    setShowExpModal(false)
    setExpForm({ category: 'materials', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), paid_to: '', notes: '' })
    loadPayments()
  }

  const deleteExpense = async (exp: Expense) => {
    if (!confirm(`Delete the expense "${exp.description}"?`)) return
    await fetch(`/api/projects/${id}/expenses`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expense_id: exp.id }) })
    loadPayments()
  }

  const toggleChecklist = async (itemId: string, done: boolean) => {
    setChecklist(prev => prev.map(c => c.id === itemId ? { ...c, done: done ? 1 : 0 } : c))
    await fetch(`/api/projects/${id}/checklist`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: itemId, done }) })
    loadChecklist()
  }

  const addUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateNote.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${id}/updates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: updateNote }) })
    setSaving(false)
    setUpdateNote('')
    loadProject()
  }

  if (loading) return <PageLoading />
  if (!project) {
    return (
      <div className="card mt-8">
        <EmptyState icon={HardHat} title="Project not found" description="It may have been deleted, or you may not have access."
          action={<a href="/projects/all" className="btn-secondary">All projects</a>} />
      </div>
    )
  }

  const outstanding = contractValue - totalPaid
  const profit = contractValue - totalExpenses
  const profitPct = contractValue > 0 ? (profit / contractValue) * 100 : 0
  const paidPct = contractValue > 0 ? Math.min(100, (totalPaid / contractValue) * 100) : 0
  const checkDone = checklist.filter(c => c.done).length
  const team = teamMembersText(project.team_members)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payments and expenses', count: payments.length + expenses.length },
    { id: 'checklist', label: 'Checklist', count: checklist.length ? undefined : 0 },
    { id: 'updates', label: 'Updates', count: updates.length },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} label={PROJECT_STATUS_LABELS[project.status]} />
            {['urgent', 'high'].includes(project.priority) && <Badge tone={project.priority === 'urgent' ? 'danger' : 'warning'}>{cap(project.priority)} priority</Badge>}
          </div>
          <h1 className="mt-2 text-xl sm:text-[22px] font-semibold tracking-tight text-gray-900">{project.name}</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {[project.client_name, project.city, project.scheduled_date ? `Scheduled ${fmtDate(project.scheduled_date)}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {project.quote_id && <a href={`/quotes/${project.quote_id}/team`} className="btn-secondary"><FileText size={14} /> Source quote</a>}
          <button onClick={() => setEditing(true)} className="btn-primary"><Pencil size={14} /> Edit project</button>
        </div>
      </div>

      {/* Financials */}
      <section className="card mb-6">
        <dl className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          <Money label="Contract value" value={fmtINR(contractValue)} />
          <Money label="Received" value={fmtINR(totalPaid)} hint={contractValue ? `${paidPct.toFixed(0)}% collected` : undefined} />
          <Money label="Outstanding" value={fmtINR(outstanding)} tone={outstanding > 0 ? 'warning' : 'success'} hint={outstanding > 0 ? 'Due from client' : 'Fully paid'} />
          <Money label="Gross profit" value={fmtINR(profit)} tone={profit >= 0 ? 'success' : 'danger'} hint={`${profitPct.toFixed(0)}% after ${fmtINR(totalExpenses)} expenses`} />
        </dl>
        {contractValue > 0 && (
          <div className="px-5 pb-4">
            <div className="h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${paidPct}%` }} /></div>
          </div>
        )}
      </section>

      <nav className="tabs mb-5" aria-label="Project sections">
        {tabs.map(t => (
          <button key={t.id} type="button" className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'checklist' && checklist.length > 0
              ? <span className="text-xs text-gray-400 tabular-nums">{checkDone}/{checklist.length}</span>
              : t.count ? <span className="text-xs text-gray-400 tabular-nums">{t.count}</span> : null}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card">
            <div className="card-header"><h2 className="card-title">Details</h2></div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-5 text-[13px]">
              <Detail label="Client">{project.client_name || '—'}</Detail>
              <Detail label="Phone">{project.client_phone ? <a href={`tel:${project.client_phone}`} className="hover:underline">{project.client_phone}</a> : '—'}</Detail>
              <Detail label="Email">{project.client_email ? <a href={`mailto:${project.client_email}`} className="break-all hover:underline">{project.client_email}</a> : '—'}</Detail>
              <Detail label="City">{project.city || '—'}</Detail>
              <Detail label="Site address" wide>{project.site_address || '—'}</Detail>
              <Detail label="Scheduled">{fmtDate(project.scheduled_date)}</Detail>
              <Detail label="Completed">{fmtDate(project.completion_date)}</Detail>
              <Detail label="Team lead">{project.team_lead || '—'}</Detail>
              <Detail label="Team">{team || '—'}</Detail>
              <Detail label="Ceiling area">{project.ceiling_area_sqft ? `${project.ceiling_area_sqft} sqft` : '—'}</Detail>
              <Detail label="Priority">{cap(project.priority)}</Detail>
              {project.notes && <Detail label="Notes" wide><span className="whitespace-pre-line">{project.notes}</span></Detail>}
            </dl>
          </section>

          <div className="space-y-4">
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Checklist</h2>
                <button className="text-xs font-medium text-gray-600 hover:text-gray-900" onClick={() => setTab('checklist')}>Open</button>
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[22px] font-semibold tabular-nums text-gray-900">{checklist.length ? Math.round((checkDone / checklist.length) * 100) : 0}%</span>
                  <span className="text-xs text-gray-500 tabular-nums">{checkDone} of {checklist.length} done</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${checklist.length ? (checkDone / checklist.length) * 100 : 0}%` }} />
                </div>
                <ul className="mt-4 space-y-2">
                  {PHASES.map(ph => {
                    const items = checklist.filter(c => c.phase === ph)
                    const done = items.filter(c => c.done).length
                    return (
                      <li key={ph} className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-700">{PHASE_LABEL[ph]}</span>
                        <span className="tabular-nums text-gray-500">{done}/{items.length}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Latest update</h2>
                <button className="text-xs font-medium text-gray-600 hover:text-gray-900" onClick={() => setTab('updates')}>All updates</button>
              </div>
              {updates[0] ? (
                <div className="p-5">
                  <p className="text-[13px] text-gray-800 whitespace-pre-line">{updates[0].note}</p>
                  <p className="mt-2 text-xs text-gray-500">{fmtDate(updates[0].created_at)}{updates[0].created_by ? ` · ${updates[0].created_by}` : ''}</p>
                </div>
              ) : <EmptyState icon={MessageSquare} title="No updates yet" compact />}
            </section>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <section className="table-wrap">
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
              <h2 className="card-title">Payments received</h2>
              <button onClick={() => setShowPayModal(true)} className="btn-secondary btn-sm"><Plus size={14} /> Record payment</button>
            </div>
            {payments.length === 0 ? <EmptyState icon={Wallet} title="No payments recorded" compact /> : (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Date</th><th>Type</th><th>Method</th><th className="hidden sm:table-cell">Reference</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap tabular-nums">{fmtDate(p.payment_date)}</td>
                        <td>{cap(p.type)}</td>
                        <td>{cap(p.method)}</td>
                        <td className="hidden sm:table-cell text-gray-500">{p.reference || '—'}</td>
                        <td className="num font-medium text-gray-900">{fmtINR(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {payments.length > 0 && <div className="table-footer"><span>{payments.length} payment{payments.length !== 1 ? 's' : ''}</span><span className="tabular-nums">Total {fmtINR(totalPaid)}</span></div>}
          </section>

          <section className="table-wrap">
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
              <h2 className="card-title">Expenses</h2>
              <button onClick={() => setShowExpModal(true)} className="btn-secondary btn-sm"><Plus size={14} /> Add expense</button>
            </div>
            {expenses.length === 0 ? <EmptyState icon={Receipt} title="No expenses recorded" compact /> : (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="hidden sm:table-cell">Paid to</th><th className="num">Amount</th><th className="w-12"><span className="sr-only">Delete</span></th></tr></thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap tabular-nums">{fmtDate(e.expense_date)}</td>
                        <td className="text-gray-900">{e.description}</td>
                        <td>{cap(e.category)}</td>
                        <td className="hidden sm:table-cell text-gray-500">{e.paid_to || '—'}</td>
                        <td className="num font-medium text-gray-900">{fmtINR(Number(e.amount))}</td>
                        <td className="text-right">
                          <button onClick={() => deleteExpense(e)} className="btn-ghost btn-icon text-gray-400 hover:text-red-700 hover:bg-red-50" aria-label="Delete expense"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {expenses.length > 0 && <div className="table-footer"><span>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span><span className="tabular-nums">Total {fmtINR(totalExpenses)}</span></div>}
          </section>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {PHASES.map(phase => {
            const items = checklist.filter(c => c.phase === phase).sort((a, b) => a.sort_order - b.sort_order)
            const done = items.filter(c => c.done).length
            return (
              <section key={phase} className="card self-start">
                <div className="card-header">
                  <h2 className="card-title">{PHASE_LABEL[phase]}</h2>
                  <span className="text-xs text-gray-500 tabular-nums">{done}/{items.length}</span>
                </div>
                {items.length === 0 ? <p className="px-5 py-6 text-center text-xs text-gray-500">No items</p> : (
                  <ul className="divide-y divide-gray-100">
                    {items.map(item => (
                      <li key={item.id}>
                        <label className="flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={!!item.done} onChange={e => toggleChecklist(item.id, e.target.checked)} className="checkbox mt-0.5" />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[13px] ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.item}</span>
                            {!!item.done && item.done_at && <span className="block text-2xs text-gray-400 mt-0.5">{fmtDate(item.done_at)}{item.done_by ? ` · ${item.done_by}` : ''}</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {tab === 'updates' && (
        <div className="max-w-3xl">
          <form onSubmit={addUpdate} className="card p-4">
            <label htmlFor="update-note" className="label">Post an update</label>
            <textarea id="update-note" value={updateNote} onChange={e => setUpdateNote(e.target.value)}
              placeholder="Progress on site, blockers, what happens next" rows={3} className="input resize-none" />
            <div className="mt-3 flex justify-end">
              <button type="submit" disabled={saving || !updateNote.trim()} className="btn-primary">{saving ? 'Posting…' : 'Post update'}</button>
            </div>
          </form>
          {updates.length === 0 ? (
            <div className="card mt-4"><EmptyState icon={MessageSquare} title="No updates yet" description="Site progress notes from the team appear here." compact /></div>
          ) : (
            <ol className="mt-5 space-y-0">
              {updates.map((u, i) => (
                <li key={u.id} className="relative flex gap-3 pb-5">
                  {i < updates.length - 1 && <span className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-200" />}
                  <Avatar name={u.created_by || 'Team'} size={28} />
                  <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-800">{u.created_by || 'Team'}</span> · {fmtDate(u.created_at)}
                    </p>
                    <p className="mt-1 text-[13px] text-gray-800 whitespace-pre-line">{u.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {showPayModal && (
        <Modal title="Record payment" onClose={() => setShowPayModal(false)} width="max-w-md"
          footer={<>
            <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="pay-form" disabled={saving || !payForm.amount} className="btn-primary">{saving ? 'Saving…' : 'Record payment'}</button>
          </>}>
          <form id="pay-form" onSubmit={addPayment} className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={payForm.type} onChange={e => setPayForm(f => ({ ...f, type: e.target.value }))} className="select">
                <option value="payment">Payment</option>
                <option value="advance">Advance</option>
                <option value="final">Final payment</option>
              </select>
            </Field>
            <Field label="Amount (₹)" required>
              <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="input tabular-nums" autoFocus />
            </Field>
            <Field label="Date">
              <input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} className="input" />
            </Field>
            <Field label="Method">
              <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className="select">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'upi' ? 'UPI' : cap(m)}</option>)}
              </select>
            </Field>
            <Field label="Reference" className="col-span-2">
              <input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} className="input" placeholder="UTR or cheque number" />
            </Field>
            <Field label="Notes" className="col-span-2">
              <input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} className="input" />
            </Field>
          </form>
        </Modal>
      )}

      {showExpModal && (
        <Modal title="Add expense" onClose={() => setShowExpModal(false)} width="max-w-md"
          footer={<>
            <button type="button" onClick={() => setShowExpModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="exp-form" disabled={saving || !expForm.description || !expForm.amount} className="btn-primary">{saving ? 'Saving…' : 'Add expense'}</button>
          </>}>
          <form id="exp-form" onSubmit={addExpense} className="grid grid-cols-2 gap-4">
            <Field label="Description" required className="col-span-2">
              <input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} className="input" autoFocus />
            </Field>
            <Field label="Category">
              <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))} className="select">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{cap(c)}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)" required>
              <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} className="input tabular-nums" />
            </Field>
            <Field label="Date">
              <input type="date" value={expForm.expense_date} onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))} className="input" />
            </Field>
            <Field label="Paid to">
              <input value={expForm.paid_to} onChange={e => setExpForm(f => ({ ...f, paid_to: e.target.value }))} className="input" />
            </Field>
          </form>
        </Modal>
      )}

      {editing && (
        <ProjectFormModal initial={project} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadProject(); loadPayments() }} />
      )}
    </div>
  )
}

function Money({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'success' | 'warning' | 'danger' }) {
  const hintCls = tone === 'success' ? 'text-brand-700' : tone === 'warning' ? 'text-amber-700' : tone === 'danger' ? 'text-red-700' : 'text-gray-500'
  return (
    <div className="px-5 py-4">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight text-gray-900 tabular-nums">{value}</dd>
      {hint && <dd className={`mt-0.5 text-xs ${hintCls}`}>{hint}</dd>}
    </div>
  )
}

function Detail({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{children}</dd>
    </div>
  )
}
