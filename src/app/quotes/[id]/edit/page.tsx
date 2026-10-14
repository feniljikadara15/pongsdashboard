import { dbGetQuote } from "@/lib/db"
import { canAccessQuote } from "@/lib/session"
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import QuoteBuilder from '@/components/QuoteBuilder'

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()
  if (!(await canAccessQuote(quote.ownerEmail))) notFound()

  return (
    <QuoteBuilder
      mode="edit"
      initial={quote}
      title={`Edit ${quote.quoteNumber}`}
      description={[quote.clientName, quote.projectName].filter(Boolean).join(' · ')}
    />
  )
}
