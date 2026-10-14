export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { dbLogActivity } from '@/lib/db'
import { loadSampleData, removeSampleData, sampleDataCounts } from '@/lib/sampleData'

// Admin-only demonstration data. Every sample row has an id starting with
// "sample-", so removal never touches real records.

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json({ counts: await sampleDataCounts() })
}

export async function POST() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const counts = await loadSampleData(auth.user.email)
    await dbLogActivity(auth.user.userId, 'sample_data.load', 'Loaded sample data')
    return NextResponse.json({ ok: true, counts })
  } catch (e) {
    console.error('sample data load failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    await removeSampleData()
    await dbLogActivity(auth.user.userId, 'sample_data.remove', 'Removed sample data')
    return NextResponse.json({ ok: true, counts: await sampleDataCounts() })
  } catch (e) {
    console.error('sample data removal failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
