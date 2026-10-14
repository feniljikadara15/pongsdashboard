import type { ModulePermission } from './permissions'

// Collapse a module's four flags into one readable level.
export type AccessLevel = 'full' | 'edit' | 'view' | 'none'

export function accessLevel(p: ModulePermission | undefined): AccessLevel {
  if (!p || !p.view) return 'none'
  if (p.create && p.edit && p.delete) return 'full'
  if (p.create || p.edit || p.delete) return 'edit'
  return 'view'
}

export const ACCESS_LABEL: Record<AccessLevel, string> = { full: 'Full', edit: 'Edit', view: 'View', none: 'None' }
export const ACCESS_TONE: Record<AccessLevel, 'success' | 'info' | 'neutral' | 'neutral'> = { full: 'success', edit: 'info', view: 'neutral', none: 'neutral' }
