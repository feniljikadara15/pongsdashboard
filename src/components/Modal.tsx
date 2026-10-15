'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Single dialog surface for the whole product. Escape closes it (unless an
// open dropdown inside consumed the key first), the page behind stops
// scrolling, and focus moves into the dialog and back out when it closes.
// It renders into document.body so no page container can trap it beneath the
// navigation.

let openCount = 0

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: {
  title: ReactNode
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const titleId = useId()
  const downOnBackdrop = useRef(false)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    openCount++
    document.body.style.overflow = 'hidden'
    // Respect a field that already took focus via autoFocus.
    if (!ref.current?.contains(document.activeElement)) {
      const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]')
        ?? ref.current?.querySelector<HTMLElement>('.modal-body input:not([type=hidden]):not([disabled]), .modal-body textarea')
      ;(first ?? ref.current)?.focus({ preventScroll: true })
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // Only the topmost dialog responds.
      const dialogs = document.querySelectorAll('[data-modal]')
      if (dialogs[dialogs.length - 1] !== ref.current) return
      closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openCount--
      if (openCount === 0) document.body.style.overflow = ''
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={e => { downOnBackdrop.current = e.target === e.currentTarget }}
      onMouseUp={e => { if (downOnBackdrop.current && e.target === e.currentTarget) onClose(); downOnBackdrop.current = false }}
    >
      <div
        ref={ref}
        data-modal
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal ${width} max-h-[90vh] flex flex-col outline-none`}
      >
        <div className="modal-header shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="modal-title truncate">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost btn-icon -mr-2 shrink-0" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body overflow-y-auto">{children}</div>
        {footer && <div className="modal-footer shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
