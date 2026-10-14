'use client'
import { useState } from 'react'
import { Modal, Field } from '@/components/ui'

export type ClientForm = {
  name: string; company: string; email: string; phone: string; city: string; address: string
  gst_number: string; source: string; status: string; notes: string
}

export const CLIENT_SOURCES = ['direct', 'referral', 'social_media', 'website', 'exhibition', 'other']
export const CLIENT_STATUSES = ['active', 'inactive', 'vip', 'blacklisted']
export const SOURCE_LABEL: Record<string, string> = {
  direct: 'Direct', referral: 'Referral', social_media: 'Social media', website: 'Website', exhibition: 'Exhibition', other: 'Other',
  architect: 'Architect', dealer: 'Dealer',
}
export const CLIENT_STATUS_LABEL: Record<string, string> = { active: 'Active', inactive: 'Inactive', vip: 'VIP', blacklisted: 'Blocked' }

export const EMPTY_CLIENT: ClientForm = { name: '', company: '', email: '', phone: '', city: '', address: '', gst_number: '', source: 'direct', status: 'active', notes: '' }

// Create (no id) or edit (id) a client record.
export default function ClientFormModal({ id, initial, onClose, onSaved }: { id?: string; initial: ClientForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ClientForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof ClientForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch(id ? `/api/clients/${id}` : '/api/clients', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Could not save the client.'); return }
    onSaved()
  }

  return (
    <Modal title={id ? 'Edit client' : 'Add client'} onClose={onClose} width="max-w-xl"
      footer={<>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" form="client-form" disabled={saving || !form.name} className="btn-primary">{saving ? 'Saving…' : id ? 'Save changes' : 'Add client'}</button>
      </>}>
      <form id="client-form" onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {error && <div className="alert-error sm:col-span-2">{error}</div>}
        <Field label="Contact name" required><input value={form.name} onChange={set('name')} className="input" autoFocus /></Field>
        <Field label="Company" hint="Quotes raised against this name link to the client."><input value={form.company} onChange={set('company')} className="input" /></Field>
        <Field label="Phone"><input type="tel" value={form.phone} onChange={set('phone')} className="input" /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')} className="input" /></Field>
        <Field label="City"><input value={form.city} onChange={set('city')} className="input" /></Field>
        <Field label="GSTIN"><input value={form.gst_number} onChange={set('gst_number')} className="input mono uppercase" /></Field>
        <Field label="Address" className="sm:col-span-2"><input value={form.address} onChange={set('address')} className="input" /></Field>
        <Field label="Source">
          <select value={form.source} onChange={set('source')} className="select">
            {Array.from(new Set([...CLIENT_SOURCES, form.source].filter(Boolean))).map(s => <option key={s} value={s}>{SOURCE_LABEL[s] ?? s}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')} className="select">
            {CLIENT_STATUSES.map(s => <option key={s} value={s}>{CLIENT_STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Notes" className="sm:col-span-2"><textarea value={form.notes} onChange={set('notes')} rows={3} className="input resize-none" /></Field>
      </form>
    </Modal>
  )
}
