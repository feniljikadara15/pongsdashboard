'use client'
import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      <Printer size={14} /> {label}
    </button>
  )
}
