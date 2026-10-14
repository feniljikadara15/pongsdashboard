// Product categories offered in forms. Imported data may carry others; those
// still display and filter, they just are not suggested for new products.
export const PRODUCT_CATEGORIES = [
  'Pongs Descor Fabric', 'LED Lights', 'Driver', 'Controller', 'DALI Driver', 'Gripper', 'Service', 'Power Repeater',
]

export type StockState = 'out' | 'low' | 'ok' | 'untracked'

export function stockState(current: number, min: number): StockState {
  if (current <= 0) return 'out'
  if (min > 0 && current <= min) return 'low'
  if (min <= 0) return 'untracked'
  return 'ok'
}

export const STOCK_LABEL: Record<StockState, string> = {
  out: 'Out of stock', low: 'Below minimum', ok: 'In stock', untracked: 'In stock',
}
export const STOCK_TONE: Record<StockState, 'danger' | 'warning' | 'success' | 'neutral'> = {
  out: 'danger', low: 'warning', ok: 'success', untracked: 'neutral',
}
