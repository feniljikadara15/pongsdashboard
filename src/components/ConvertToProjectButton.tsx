'use client'
import { useState } from 'react'
import { ArrowUpRight, HardHat } from 'lucide-react'
import { confirmDialog, toast } from '@/components/feedback'

// Converts a quote into a project. When a project already exists for the quote
// we link to it instead of offering a second conversion.
export default function ConvertToProjectButton({ quoteId, projectId }: { quoteId: string; projectId: string | null }) {
  const [converting, setConverting] = useState(false)

  if (projectId) {
    return (
      <a href={`/projects/${projectId}`} className="btn-secondary">
        <HardHat size={14} /> View project <ArrowUpRight size={13} className="text-gray-400" />
      </a>
    )
  }

  const convert = async () => {
    const ok = await confirmDialog({ title: 'Convert to project', body: 'A project is created with this quote\'s client, site and contract value, and the quote is marked as approved.', confirmLabel: 'Create project' })
    if (!ok) return
    setConverting(true)
    const r = await fetch(`/api/quotes/${quoteId}/to-project`, { method: 'POST' })
    const data = await r.json().catch(() => ({}))
    setConverting(false)
    if (data.project_id) {
      window.location.href = `/projects/${data.project_id}`
    } else {
      toast('Could not create the project', { tone: 'error', description: data.error })
    }
  }

  return (
    <button onClick={convert} disabled={converting} className="btn-secondary">
      <HardHat size={14} /> {converting ? 'Creating project…' : 'Convert to project'}
    </button>
  )
}
