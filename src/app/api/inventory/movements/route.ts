export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET() {
  const _auth = await requirePermission('inventory', 'view')
  if ('error' in _auth) return _auth.error
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_movements ORDER BY movement_date DESC')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  const _auth = await requirePermission('inventory', 'create')
  if ('error' in _auth) return _auth.error
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO inv_movements (id, product_id, product_name, movement_type, quantity, reference_type, reference_id, notes, movement_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.product_id ?? null, body.product_name ?? null, body.movement_type ?? 'IN', Number(body.quantity ?? 0), body.reference_type ?? null, body.reference_id ?? null, body.notes ?? null, body.movement_date ?? new Date().toISOString()],
  )
  // Keep the product's stock level in step with the movement log. This used to
  // happen client-side on one page only, so movements recorded elsewhere (e.g.
  // the product detail page) never changed the stock.
  if (body.product_id) {
    const delta = String(body.movement_type ?? 'IN').toUpperCase() === 'OUT' ? -Number(body.quantity ?? 0) : Number(body.quantity ?? 0)
    await db.execute('UPDATE inv_products SET current_stock = COALESCE(current_stock, 0) + ? WHERE id = ?', [delta, body.product_id])
  }
  const result = await db.execute('SELECT * FROM inv_movements WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
