// team_members is stored as a JSON array, but older rows and the edit form use
// a comma-separated string. These helpers accept any of those shapes.

export function teamMembersList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  let s = String(v ?? '').trim()
  // Unwrap values that were JSON-encoded more than once.
  for (let i = 0; i < 3 && (s.startsWith('[') || s.startsWith('"')); i++) {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) return parsed.map(x => String(x).trim()).filter(Boolean)
      if (typeof parsed !== 'string') break
      s = parsed.trim()
    } catch { break }
  }
  return s.split(',').map(x => x.trim()).filter(Boolean)
}

export function teamMembersText(v: unknown): string {
  return teamMembersList(v).join(', ')
}
