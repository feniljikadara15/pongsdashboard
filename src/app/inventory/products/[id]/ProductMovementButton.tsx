'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'
import { Modal, Field } from '@/components/ui'

export default function ProductMovementButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ movement_type: 'IN', quantity: 0, reference_type: 'manual', notes: '' })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // The movements API also adjusts the product's stock level.
    await fetch('/api/inventory/movements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, product_id: productId, product_name: productName, quantity: Number(form.quantity) }),
    })
    setSaving(false); setOpen(false)
    setForm({ movement_type: 'IN', quantity: 0, reference_type: 'manual', notes: '' })
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary"><ArrowLeftRight size={14} /> Record movement</button>
      {open && (
        <Modal title="Record movement" onClose={() => setOpen(false)} width="max-w-md"
          footer={<>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="movement-form" disabled={saving || form.quantity <= 0} className="btn-primary">{saving ? 'Saving…' : 'Record'}</button>
          </>}>
          <form id="movement-form" onSubmit={save} className="space-y-4">
            <p className="text-[13px] text-gray-600">{productName}</p>
            <div className="segmented w-full" role="radiogroup" aria-label="Direction">
              {[['IN', 'Received into stock'], ['OUT', 'Issued from stock']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={form.movement_type === v} data-active={form.movement_type === v}
                  className="flex-1" onClick={() => setForm(f => ({ ...f, movement_type: v }))}>{l}</button>
              ))}
            </div>
            <Field label="Quantity" required>
              <input type="number" min="0" step="any" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} className="input tabular-nums" autoFocus />
            </Field>
            <Field label="Reference" hint="Purchase order, project or reason.">
              <input value={form.reference_type} onChange={e => setForm(f => ({ ...f, reference_type: e.target.value }))} className="input" />
            </Field>
            <Field label="Notes">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} />
            </Field>
          </form>
        </Modal>
      )}
    </>
  )
}
