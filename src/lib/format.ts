export function fmtINR(n: number): string {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

// Date formatting is done by hand rather than with toLocaleDateString so the
// server render and the browser render produce identical text (ICU data
// differs between Node and browsers, which causes hydration mismatches).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Accepts Date, ISO date-time, or a plain YYYY-MM-DD (read as a calendar date,
// never shifted by timezone).
export function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d))
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d)
  return isNaN(date.getTime()) ? null : date
}

// 14 Oct 2026
export function fmtDate(d: string | Date | null | undefined): string {
  const date = toDate(d)
  if (!date) return d ? String(d) : '—'
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// 14 October 2026, optionally prefixed with the weekday.
export function fmtDateLong(d: string | Date | null | undefined, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const date = toDate(d)
  if (!date) return '—'
  const { weekday = false, year = true } = opts
  const core = `${date.getDate()} ${MONTHS_LONG[date.getMonth()]}${year ? ` ${date.getFullYear()}` : ''}`
  return weekday ? `${WEEKDAYS[date.getDay()]}, ${core}` : core
}

// October 2026
export function fmtMonth(d: string | Date | null | undefined, short = false): string {
  const date = toDate(d)
  if (!date) return '—'
  return `${(short ? MONTHS : MONTHS_LONG)[date.getMonth()]} ${date.getFullYear()}`
}

export function monthShort(d: Date): string {
  return MONTHS[d.getMonth()]
}
