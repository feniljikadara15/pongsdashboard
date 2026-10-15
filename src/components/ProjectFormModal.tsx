'use client'
import { useState } from 'react'
import { Modal, Field } from '@/components/ui'
import { Select, DatePicker } from '@/components/controls'

export type Project = {
  id: string; name: string; client_name: string; client_phone: string; client_email: string;
  site_address: string; city: string; status: string; scheduled_date: string; completion_date: string;
  team_lead: string; team_members: string; ceiling_area_sqft: number; contract_value: number;
  priority: string; notes: string; quote_id: string;
}

export const PROJECT_STATUSES = ['scheduled', 'in_progress', 'on_hold', 'completed', 'invoiced', 'cancelled']
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', invoiced: 'Invoiced', cancelled: 'Cancelled', on_hold: 'On hold',
}
export const PRIORITIES = ['urgent', 'high', 'normal', 'low']

export const EMPTY_PROJECT: Project = {
  id: '', name: '', client_name: '', client_phone: '', client_email: '', site_address: '', city: '', status: 'scheduled',
  scheduled_date: '', completion_date: '', team_lead: '', team_members: '', ceiling_area_sqft: 0, contract_value: 0,
  priority: 'normal', notes: '', quote_id: '',
}

// team_members is stored either as a JSON array or as the comma-separated
// string typed into this form; normalise to the comma form for editing.
export function teamMembersText(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ')
  const s = String(v ?? '').trim()
  if (s.startsWith('[')) {
    try { const a = JSON.parse(s); if (Array.isArray(a)) return a.join(', ') } catch { /* not JSON */ }
  }
  return s
}

// Create or edit a project. Saves through the projects API and calls onSaved.
export default function ProjectFormModal({ initial, onClose, onSaved }: { initial: Project; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Project>({ ...initial, team_members: teamMembersText(initial.team_members) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof Project, v: string | number) { setForm(f => ({ ...f, [k]: v })) }

  async function save(e?: React.FormEvent) {
    e?.preventDefault()
    setSaving(true); setError('')
    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/projects/${form.id}` : '/api/projects'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Could not save the project.'); return }
    onSaved()
  }

  return (
    <Modal title={form.id ? 'Edit project' : 'New project'} onClose={onClose} width="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="project-form" disabled={saving || !form.name || !form.client_name} className="btn-primary">
            {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create project'}
          </button>
        </>
      }>
      <form id="project-form" onSubmit={save} className="space-y-6">
        {error && <div className="alert-error">{error}</div>}
        <section>
          <h3 className="section-title mb-3">Project</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project name" required className="sm:col-span-2">
              <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="Corporate office ceiling" autoFocus />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={v => set('status', v)} ariaLabel="Status"
                options={PROJECT_STATUSES.map(s => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))} />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={v => set('priority', v)} ariaLabel="Priority"
                options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
            </Field>
            <Field label="Ceiling area (sqft)">
              <input type="number" value={form.ceiling_area_sqft} onChange={e => set('ceiling_area_sqft', parseFloat(e.target.value) || 0)} className="input tabular-nums" />
            </Field>
            <Field label="Contract value (₹)">
              <input type="number" value={form.contract_value} onChange={e => set('contract_value', parseFloat(e.target.value) || 0)} className="input tabular-nums" />
            </Field>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="section-title mb-3">Client and site</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client name" required>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} className="input" />
            </Field>
            <Field label="Phone">
              <input value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className="input" type="tel" />
            </Field>
            <Field label="Email">
              <input value={form.client_email} onChange={e => set('client_email', e.target.value)} className="input" type="email" />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={e => set('city', e.target.value)} className="input" />
            </Field>
            <Field label="Site address" className="sm:col-span-2">
              <input value={form.site_address} onChange={e => set('site_address', e.target.value)} className="input" />
            </Field>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="section-title mb-3">Schedule and team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Scheduled date">
              <DatePicker value={form.scheduled_date} onChange={v => set('scheduled_date', v)} ariaLabel="Scheduled date" />
            </Field>
            <Field label="Completion date">
              <DatePicker value={form.completion_date} onChange={v => set('completion_date', v)} ariaLabel="Completion date" />
            </Field>
            <Field label="Team lead">
              <input value={form.team_lead ?? ''} onChange={e => set('team_lead', e.target.value)} className="input" />
            </Field>
            <Field label="Team members" hint="Separate names with commas.">
              <input value={form.team_members ?? ''} onChange={e => set('team_members', e.target.value)} className="input" placeholder="Ravi, Suresh" />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} className="input resize-none" rows={3} />
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  )
}
