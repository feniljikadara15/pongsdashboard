// Demonstration data for reviewing the app before real data is migrated.
//
// Every record created here has an id beginning with SAMPLE_PREFIX, so
// removeSampleData() deletes exactly these rows (and their child rows) and can
// never touch real records. Sample quote numbers contain no digits (SAMPLE-A…)
// so they do not affect the Q-0001 numbering of real quotes.

import {
  getDbClient, initQuotesTable, initInventoryTables, initProjectsTables,
  initClientsTable, initPaymentsTable, dbSaveQuote, dbSeedProjectChecklist,
} from './db'
import type { CeilingItem } from './types'

export const SAMPLE_PREFIX = 'sample-'

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10)
const sid = (s: string) => `${SAMPLE_PREFIX}${s}`

function item(id: string, name: string, d1: number, d2: number, lightType: CeilingItem['lightType'] = 'none', fabricType = 'Descor Premium'): CeilingItem {
  return {
    id, name, surface: 'ceiling', shape: 'rectangle', unit: 'mm', dimensions: { dim1: d1, dim2: d2 },
    fabricType, withPrinting: false, withFleece: false, lightType, lightDepth: 6, ledWidth: 'standard',
    gripperType: 'CW', quantity: 1, jointType: 'none', jointPosition: 0,
    ledSpacingMM: lightType === 'single_color' || lightType === 'single_color_dimmable' ? 150 : 125,
    ledModuleType: 'standard', daliDriver: 'dt8', driverOverrides: {}, lightingConfig: 'non_looped', marginMM: 0, notes: '',
  }
}

// Child tables keyed by a parent id rather than their own id.
const CHILD_TABLES: [string, string][] = [
  ['project_updates', 'project_id'], ['project_payments', 'project_id'], ['project_expenses', 'project_id'],
  ['project_checklists', 'project_id'], ['project_materials', 'project_id'], ['inv_purchase_items', 'purchase_id'],
]
const OWN_TABLES = ['pongs_quotes', 'clients', 'projects', 'inv_products', 'inv_suppliers', 'inv_purchases', 'inv_movements', 'inv_work_completions']

async function initAll() {
  await Promise.all([initQuotesTable(), initInventoryTables(), initProjectsTables(), initClientsTable(), initPaymentsTable()])
}

export async function sampleDataCounts(): Promise<Record<string, number>> {
  await initAll()
  const db = getDbClient()
  const out: Record<string, number> = {}
  for (const t of OWN_TABLES) {
    const r = await db.execute(`SELECT COUNT(*) AS c FROM ${t} WHERE id LIKE ?`, [`${SAMPLE_PREFIX}%`])
    out[t] = Number((r.rows[0] as Record<string, unknown>).c ?? 0)
  }
  return out
}

export async function removeSampleData() {
  await initAll()
  const db = getDbClient()
  for (const [t, col] of CHILD_TABLES) await db.execute(`DELETE FROM ${t} WHERE ${col} LIKE ?`, [`${SAMPLE_PREFIX}%`])
  for (const t of OWN_TABLES) await db.execute(`DELETE FROM ${t} WHERE id LIKE ?`, [`${SAMPLE_PREFIX}%`])
}

// Replaces any existing sample data with a fresh set. Quotes are owned by
// ownerEmail (the admin loading the data).
export async function loadSampleData(ownerEmail: string) {
  await removeSampleData()
  const db = getDbClient()
  const now = new Date().toISOString()

  // Clients
  const clients: [string, string, string, string, string, string][] = [
    ['c1', 'Aarav Mehta', 'Mehta Residences', 'Bengaluru', 'referral', '+91 98450 21734'],
    ['c2', 'Priya Nair', 'Studio Lumen Architects', 'Kochi', 'referral', '+91 98470 66210'],
    ['c3', 'Rohan Kapoor', 'Kapoor Hospitality Group', 'Mumbai', 'direct', '+91 98200 45512'],
    ['c4', 'Ananya Rao', 'Prestige Interiors', 'Bengaluru', 'direct', '+91 99000 31877'],
    ['c5', 'Vikram Shetty', 'Shetty Builders', 'Mangaluru', 'exhibition', '+91 98860 74120'],
    ['c6', 'Meera Iyer', 'Iyer Design Co.', 'Chennai', 'website', '+91 98410 58836'],
  ]
  for (const [k, name, company, city, source, phone] of clients) {
    await db.execute(
      `INSERT INTO clients (id,name,company,email,phone,city,address,gst_number,source,status,notes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [sid(k), name, company, `${name.split(' ')[0].toLowerCase()}@example.com`, phone, city, city, null, source, 'active', 'Sample client', now, now],
    )
  }

  // Quotes (totals are computed by dbSaveQuote)
  const quotes: [string, string, string, string, string, number, CeilingItem[]][] = [
    ['q1', 'Mehta Residences', 'Villa living room', 'Whitefield, Bengaluru', 'approved', -6, [item('i1', 'Living room', 6200, 4800, 'single_color'), item('i2', 'Dining', 4200, 3600, 'tunable')]],
    ['q2', 'Studio Lumen Architects', 'Boutique hotel lobby', 'Fort Kochi', 'sent', -10, [item('i1', 'Lobby ceiling', 9800, 7200, 'rgbw', 'Descor Translucent')]],
    ['q3', 'Kapoor Hospitality Group', 'Rooftop restaurant', 'Bandra, Mumbai', 'draft', -16, [item('i1', 'Main hall', 12000, 8000, 'tunable'), item('i2', 'Bar counter', 3000, 1800, 'rgb')]],
    ['q4', 'Prestige Interiors', 'Corporate boardroom', 'MG Road, Bengaluru', 'approved', -38, [item('i1', 'Boardroom', 7200, 5400, 'single_color_dimmable', 'Descor Premium Acoustic')]],
    ['q5', 'Shetty Builders', 'Show apartment', 'Kadri, Mangaluru', 'rejected', -9, [item('i1', 'Bedroom', 4200, 3800), item('i2', 'Kids room', 3600, 3200, 'single_color')]],
    ['q6', 'Iyer Design Co.', 'Dental clinic', 'Adyar, Chennai', 'sent', -7, [item('i1', 'Reception', 5400, 4200, 'single_color')]],
  ]
  const letters = 'ABCDEF'
  for (let i = 0; i < quotes.length; i++) {
    const [k, client, project, location, status, offset, items] = quotes[i]
    const id = sid(k)
    await dbSaveQuote({
      id, quoteNumber: `SAMPLE-${letters[i]}`, clientName: client, clientEmail: '', clientPhone: '',
      projectName: project, location, date: day(offset), validUntil: day(offset + 30), priceTier: 'msp',
      markupPercent: 0, items, installationRatePerSqft: 120, transportCost: 2500, includeGst: true,
      displayMode: 'total', notes: 'Sample quotation for review.', status, company: 'STC', ownerEmail,
      rootId: id, revision: 0, createdAt: now, updatedAt: now,
    })
  }

  // Projects
  const projects: [string, string, string, string, string, number, string | null, number, number, string, string | null, number | null][] = [
    ['p1', 'Villa living room', 'Mehta Residences', 'Bengaluru', 'in_progress', 2, 'Suresh K', 682, 612000, 'high', 'q1', null],
    ['p2', 'Corporate boardroom', 'Prestige Interiors', 'Bengaluru', 'completed', -14, 'Imran Ali', 418, 412000, 'normal', 'q4', -12],
    ['p3', 'Boutique hotel lobby', 'Studio Lumen Architects', 'Kochi', 'scheduled', 9, 'Suresh K', 760, 1180000, 'high', 'q2', null],
    ['p4', 'Dental clinic reception', 'Iyer Design Co.', 'Chennai', 'scheduled', 16, 'Imran Ali', 244, 198000, 'normal', null, null],
    ['p5', 'Show apartment', 'Shetty Builders', 'Mangaluru', 'on_hold', 21, null, 290, 224000, 'low', null, null],
  ]
  for (const [k, name, client, city, status, sched, lead, area, value, priority, quote, done] of projects) {
    const id = sid(k)
    await db.execute(
      `INSERT INTO projects (id,name,client_name,client_phone,client_email,site_address,city,quote_id,status,scheduled_date,completion_date,team_lead,team_members,ceiling_area_sqft,contract_value,priority,notes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, name, client, null, null, city, city, quote ? sid(quote) : null, status, day(sched), done !== null ? day(done) : null, lead, '[]', area, value, priority, 'Sample project', now, now],
    )
    await dbSeedProjectChecklist(id)
  }
  await db.execute('INSERT INTO project_payments (id,project_id,type,amount,payment_date,method,reference,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('pay1'), sid('p1'), 'advance', 300000, day(-10), 'bank_transfer', 'UTR 4471', null])
  await db.execute('INSERT INTO project_payments (id,project_id,type,amount,payment_date,method,reference,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('pay2'), sid('p2'), 'final', 412000, day(-12), 'cheque', 'CHQ 002318', null])
  await db.execute('INSERT INTO project_expenses (id,project_id,category,description,amount,expense_date,paid_to,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('exp1'), sid('p1'), 'materials', 'Fabric and gripper', 96000, day(-8), 'Descor Fabrics India', null])
  await db.execute('INSERT INTO project_updates (id,project_id,note,status,created_by) VALUES (?,?,?,?,?)',
    [sid('upd1'), sid('p1'), 'Gripper installation complete. Fabric stretching scheduled for tomorrow.', null, 'Suresh K'])

  // Suppliers and products
  await db.execute('INSERT INTO inv_suppliers (id,name,contact_name,email,phone,city,address,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('s1'), 'Descor Fabrics India', 'Rahul Desai', 'sales@example.com', '+91 80 4000 1200', 'Bengaluru', 'Peenya Industrial Area', 'Sample supplier'])
  await db.execute('INSERT INTO inv_suppliers (id,name,contact_name,email,phone,city,address,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('s2'), 'Lumina LED Systems', 'Kavya Menon', 'orders@example.com', '+91 44 2800 3300', 'Chennai', 'Guindy', 'Sample supplier'])
  const products: [string, string, string, string, string, number, number, number, number, string][] = [
    ['pr1', 'Descor Premium Fabric', 'Pongs Descor Fabric', 'FAB-DP-01', 'sqm', 420, 150, 780, 1300, 's1'],
    ['pr2', 'Descor Translucent Fabric', 'Pongs Descor Fabric', 'FAB-DT-02', 'sqm', 90, 100, 1500, 2800, 's1'],
    ['pr3', 'CW Gripper Profile', 'Gripper', 'GRP-CW-01', 'rmt', 1200, 400, 95, 320, 's1'],
    ['pr4', 'Flexible CC Gripper', 'Gripper', 'GRP-FCC-02', 'rmt', 140, 200, 210, 530, 's1'],
    ['pr5', 'Single Colour LED Strip', 'LED Lights', 'LED-SC-01', 'mtr', 800, 300, 110, 270, 's2'],
    ['pr6', 'Tunable LED Strip', 'LED Lights', 'LED-TW-02', 'mtr', 260, 250, 190, 370, 's2'],
    ['pr7', '100W Driver', 'Driver', 'DRV-100', 'nos', 18, 20, 1450, 2600, 's2'],
    ['pr8', 'DALI DT8 Controller', 'DALI Driver', 'DALI-DT8', 'nos', 6, 10, 3200, 5400, 's2'],
  ]
  for (const [k, name, cat, sku, unit, stock, min, cost, sell, sup] of products) {
    await db.execute(
      `INSERT INTO inv_products (id,name,category,sku,unit,current_stock,min_stock,cost_price,sell_price,supplier_id,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [sid(k), name, cat, sku, unit, stock, min, cost, sell, sid(sup), 'Sample product'],
    )
  }

  // Purchases
  await db.execute('INSERT INTO inv_purchases (id,purchase_number,supplier_id,supplier_name,purchase_date,total_amount,status,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('po1'), 'SAMPLE-PO-A', sid('s1'), 'Descor Fabrics India', day(-12), 156000, 'received', null])
  await db.execute('INSERT INTO inv_purchase_items (id,purchase_id,product_id,description,category,quantity,unit,unit_price,total_price) VALUES (?,?,?,?,?,?,?,?,?)',
    [sid('poi1'), sid('po1'), sid('pr1'), 'Descor Premium Fabric', 'Pongs Descor Fabric', 200, 'sqm', 780, 156000])
  await db.execute('INSERT INTO inv_purchases (id,purchase_number,supplier_id,supplier_name,purchase_date,total_amount,status,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('po2'), 'SAMPLE-PO-B', sid('s2'), 'Lumina LED Systems', day(-3), 84000, 'pending', null])
  await db.execute('INSERT INTO inv_purchase_items (id,purchase_id,product_id,description,category,quantity,unit,unit_price,total_price) VALUES (?,?,?,?,?,?,?,?,?)',
    [sid('poi2'), sid('po2'), sid('pr5'), 'Single Colour LED Strip', 'LED Lights', 500, 'mtr', 110, 55000])
  await db.execute('INSERT INTO inv_purchase_items (id,purchase_id,product_id,description,category,quantity,unit,unit_price,total_price) VALUES (?,?,?,?,?,?,?,?,?)',
    [sid('poi3'), sid('po2'), sid('pr7'), '100W Driver', 'Driver', 20, 'nos', 1450, 29000])

  // Stock movements (logged only; product stock levels above are already final)
  const moves: [string, string, string, string, number, string, number][] = [
    ['m1', 'pr1', 'Descor Premium Fabric', 'OUT', 64, 'Villa living room', -2],
    ['m2', 'pr3', 'CW Gripper Profile', 'OUT', 120, 'Villa living room', -4],
    ['m3', 'pr5', 'Single Colour LED Strip', 'IN', 500, 'SAMPLE-PO-B', -3],
    ['m4', 'pr2', 'Descor Translucent Fabric', 'OUT', 72, 'Boutique hotel lobby', -6],
    ['m5', 'pr7', '100W Driver', 'OUT', 4, 'Corporate boardroom', -14],
  ]
  for (const [k, p, name, type, qty, ref, off] of moves) {
    await db.execute(
      'INSERT INTO inv_movements (id,product_id,product_name,movement_type,quantity,reference_type,reference_id,notes,movement_date) VALUES (?,?,?,?,?,?,?,?,?)',
      [sid(k), sid(p), name, type, qty, ref, null, null, new Date(Date.now() + off * 864e5).toISOString()],
    )
  }

  await db.execute('INSERT INTO inv_work_completions (id,project_name,client_name,location,completion_date,status,amount,notes) VALUES (?,?,?,?,?,?,?,?)',
    [sid('w1'), 'Corporate boardroom', 'Prestige Interiors', 'MG Road, Bengaluru', day(-12), 'completed', 412000, 'Sample record'])

  return sampleDataCounts()
}
