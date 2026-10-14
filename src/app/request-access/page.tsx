'use client'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import { Field } from '@/components/ui'

const ROLES = ['viewer', 'sales', 'installer', 'manager', 'admin']
const ROLE_DESCRIPTIONS: Record<string, string> = {
  viewer: 'Read-only access to quotes and projects.',
  sales: 'Create and manage quotes and projects.',
  installer: 'View and update assigned projects.',
  manager: 'Full access except user management.',
  admin: 'Full access, including user management.',
}

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', requested_role: 'viewer', reason: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Could not submit your request.'); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
          <CheckCircle2 size={20} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900">Request submitted</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          An administrator will review your request. You can sign in with <span className="font-medium text-gray-700">{form.email}</span> once it is approved.
        </p>
        <a href="/login" className="btn-secondary mt-8 h-10">Back to sign in</a>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Request access</h1>
      <p className="mt-1.5 text-sm text-gray-500">Tell us who you are. An administrator approves every account.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Full name" required>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input h-10" autoComplete="name" required />
        </Field>
        <Field label="Work email" required>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input h-10" placeholder="name@company.com" autoComplete="email" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="input h-10" placeholder="+91 98765 43210" autoComplete="tel" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={e => set('city', e.target.value)} className="input h-10" placeholder="Bengaluru" />
          </Field>
        </div>
        <Field label="Access level" hint={ROLE_DESCRIPTIONS[form.requested_role]}>
          <select value={form.requested_role} onChange={e => set('requested_role', e.target.value)} className="select h-10">
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Why do you need access?">
          <textarea value={form.reason} onChange={e => set('reason', e.target.value)} className="input resize-none" rows={3}
            placeholder="Your role and what you will use the system for." />
        </Field>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <button type="submit" disabled={loading || !form.name || !form.email} className="btn-primary w-full h-10 text-sm">
          {loading ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      <p className="mt-8 text-[13px] text-gray-500">
        Already approved?{' '}
        <a href="/login" className="font-medium text-gray-900 underline-offset-2 hover:underline">Sign in</a>
      </p>
    </AuthLayout>
  )
}
