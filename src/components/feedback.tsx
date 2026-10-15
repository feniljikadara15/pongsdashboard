'use client'

// Branded replacements for window.confirm and window.alert. Call
// confirmDialog() or toast() from anywhere on the client; FeedbackHost, mounted
// once in the root layout, renders them.

import { useEffect, useSyncExternalStore } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { Modal } from '@/components/Modal'

type Tone = 'default' | 'danger'
type ConfirmRequest = {
  id: number
  title: string
  body?: string
  confirmLabel: string
  cancelLabel: string
  tone: Tone
  resolve: (ok: boolean) => void
}
type ToastTone = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; description?: string; tone: ToastTone }

let seq = 0
let confirms: ConfirmRequest[] = []
let toasts: Toast[] = []
const listeners = new Set<() => void>()
let snapshot = { confirms, toasts }
const emit = () => { snapshot = { confirms, toasts }; listeners.forEach(l => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const EMPTY = { confirms: [] as ConfirmRequest[], toasts: [] as Toast[] }

export function confirmDialog(opts: {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
}): Promise<boolean> {
  return new Promise(resolve => {
    confirms = [...confirms, {
      id: ++seq,
      title: opts.title,
      body: opts.body,
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      tone: opts.tone ?? 'default',
      resolve,
    }]
    emit()
  })
}

export function toast(message: string, opts: { tone?: ToastTone; description?: string } = {}) {
  const t: Toast = { id: ++seq, message, description: opts.description, tone: opts.tone ?? 'success' }
  toasts = [...toasts.slice(-3), t]
  emit()
}

function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

function settle(id: number, ok: boolean) {
  const c = confirms.find(x => x.id === id)
  confirms = confirms.filter(x => x.id !== id)
  emit()
  c?.resolve(ok)
}

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info }
const TOAST_ICON_CLASS = { success: 'text-brand-600', error: 'text-red-600', info: 'text-sky-600' }

function ToastItem({ t }: { t: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(t.id), t.tone === 'error' ? 7000 : 4000)
    return () => clearTimeout(timer)
  }, [t.id, t.tone])
  const Icon = TOAST_ICON[t.tone]
  return (
    <div role={t.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3.5 py-3 shadow-lg animate-scale-in">
      <Icon size={16} className={`mt-px shrink-0 ${TOAST_ICON_CLASS[t.tone]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-gray-900">{t.message}</p>
        {t.description && <p className="mt-0.5 text-xs text-gray-500 break-words">{t.description}</p>}
      </div>
      <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss"
        className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700">
        <X size={14} />
      </button>
    </div>
  )
}

export function FeedbackHost() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY)
  const c = state.confirms[0]

  return (
    <>
      {c && (
        <Modal
          title={c.title}
          onClose={() => settle(c.id, false)}
          width="max-w-sm"
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => settle(c.id, false)}>{c.cancelLabel}</button>
              <button type="button" data-autofocus
                className={c.tone === 'danger' ? 'btn-destructive' : 'btn-primary'}
                onClick={() => settle(c.id, true)}>
                {c.confirmLabel}
              </button>
            </>
          }
        >
          <div className="flex gap-3">
            {c.tone === 'danger' && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={16} />
              </span>
            )}
            <p className="text-[13px] leading-relaxed text-gray-600">{c.body ?? 'Are you sure you want to continue?'}</p>
          </div>
        </Modal>
      )}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {state.toasts.map(t => <ToastItem key={t.id} t={t} />)}
      </div>
    </>
  )
}
