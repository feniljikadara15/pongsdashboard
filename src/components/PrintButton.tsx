'use client'
import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-secondary">
      <Printer size={14} /> {label}
    </button>
  )
}
