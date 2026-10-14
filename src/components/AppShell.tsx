'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, HardHat, Boxes, Users2, Wallet, BarChart3,
  ShieldCheck, Inbox, DatabaseZap, Menu, X, Plus, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import UserMenu from '@/components/UserMenu'
import { useMe, can } from '@/lib/useMe'
import type { ModuleName } from '@/lib/permissions'

type NavChild = { href: string; label: string }
type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  module?: ModuleName
  admin?: boolean
  children?: NavChild[]
}

// Each link declares the capability that unlocks it. The nav is advisory:
// every destination independently enforces access server-side.
const WORKSPACE: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/quotes', label: 'Quotes', icon: FileText, module: 'quotes' },
  {
    href: '/projects', label: 'Projects', icon: HardHat, module: 'projects',
    children: [
      { href: '/projects', label: 'Overview' },
      { href: '/projects/all', label: 'All projects' },
      { href: '/projects/calendar', label: 'Schedule' },
      { href: '/projects/completed', label: 'Completed' },
    ],
  },
  {
    href: '/inventory', label: 'Inventory', icon: Boxes, module: 'inventory',
    children: [
      { href: '/inventory', label: 'Overview' },
      { href: '/inventory/products', label: 'Products' },
      { href: '/inventory/fabric-rolls', label: 'Fabric rolls' },
      { href: '/inventory/suppliers', label: 'Suppliers' },
      { href: '/inventory/purchases', label: 'Purchases' },
      { href: '/inventory/movements', label: 'Stock movements' },
      { href: '/inventory/reorder', label: 'Reorder alerts' },
      { href: '/inventory/work-completion', label: 'Work completion' },
      { href: '/inventory/activity', label: 'Activity' },
    ],
  },
  { href: '/clients', label: 'Clients', icon: Users2, module: 'clients' },
  { href: '/finance', label: 'Finance', icon: Wallet, module: 'finance' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
]

const ADMIN: NavItem[] = [
  {
    href: '/users', label: 'Team & access', icon: ShieldCheck, admin: true,
    children: [
      { href: '/users', label: 'Overview' },
      { href: '/users/all', label: 'All users' },
      { href: '/users/permissions', label: 'Access overview' },
      { href: '/users/activity', label: 'Activity log' },
    ],
  },
  { href: '/admin/access-requests', label: 'Access requests', icon: Inbox, admin: true },
  { href: '/admin/import', label: 'Data import', icon: DatabaseZap, admin: true },
]

// Routes that render without the application chrome.
const BARE_ROUTES = ['/login', '/request-access']

function inSection(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

// Pick the most specific child that matches (so /inventory/products/123 lights
// up "Products", not "Overview").
function activeChild(pathname: string, children: NavChild[]) {
  let best: NavChild | null = null
  for (const c of children) {
    const hit = pathname === c.href || pathname.startsWith(c.href + '/')
    if (hit && (!best || c.href.length > best.href.length)) best = c
  }
  return best?.href ?? null
}

const SEGMENT_LABELS: Record<string, string> = {
  quotes: 'Quotes', new: 'New quote', edit: 'Edit', client: 'Client PDF', internal: 'Internal review',
  team: 'Overview', revisions: 'Revisions', projects: 'Projects', all: 'All', calendar: 'Schedule',
  completed: 'Completed', inventory: 'Inventory', products: 'Products', 'fabric-rolls': 'Fabric rolls',
  suppliers: 'Suppliers', purchases: 'Purchases', movements: 'Stock movements', reorder: 'Reorder alerts',
  'work-completion': 'Work completion', activity: 'Activity', clients: 'Clients', finance: 'Finance',
  analytics: 'Analytics', users: 'Team & access', permissions: 'Access overview', admin: 'Admin',
  'access-requests': 'Access requests', import: 'Data import',
}

function breadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return [{ href: '/', label: 'Dashboard' }]
  const crumbs: { href: string; label: string }[] = []
  let acc = ''
  for (const p of parts) {
    acc += '/' + p
    if (p === 'admin') continue
    const label = SEGMENT_LABELS[p] ?? (/^[0-9a-f-]{8,}$/i.test(p) ? 'Details' : p)
    crumbs.push({ href: acc, label })
  }
  return crumbs
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const [mobileOpen, setMobileOpen] = useState(false)
  const { me } = useMe()

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (BARE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return <>{children}</>
  }

  const allowed = (l: NavItem) => (l.admin ? !!me?.isAdmin : l.module ? can(me, l.module, 'view') : true)
  const workspace = WORKSPACE.filter(allowed)
  const admin = ADMIN.filter(allowed)
  const crumbs = breadcrumbs(pathname)

  const sidebar = (
    <div className="flex h-full flex-col">
      <a href="/" className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-gray-200/80">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-white text-[13px] font-bold tracking-tight">P</span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold text-gray-900 tracking-tight">Pongs</span>
          <span className="block text-2xs text-gray-500">Stretch ceiling operations</span>
        </span>
      </a>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        <NavGroup items={workspace} pathname={pathname} />
        {admin.length > 0 && <NavGroup title="Administration" items={admin} pathname={pathname} />}
      </nav>

      <div className="shrink-0 border-t border-gray-200/80 p-2.5">
        <UserMenu />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="app-sidebar hidden lg:block fixed inset-y-0 left-0 z-40 w-[var(--sidebar-w)] border-r border-gray-200 bg-gray-50">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-950/30 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="app-sidebar absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-gray-50 border-r border-gray-200 shadow-xl animate-slide-in-left">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
              className="absolute right-2 top-3 btn-ghost btn-icon">
              <X size={16} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="app-main lg:ml-[var(--sidebar-w)] flex min-h-screen flex-col">
        <header className="app-topbar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/90 backdrop-blur px-4 sm:px-6">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="lg:hidden btn-ghost btn-icon -ml-1.5">
            <Menu size={18} />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px]">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight size={14} className="shrink-0 text-gray-300" />}
                {i === crumbs.length - 1 ? (
                  <span className="truncate font-medium text-gray-900">{c.label}</span>
                ) : (
                  <a href={c.href} className="truncate text-gray-500 hover:text-gray-900">{c.label}</a>
                )}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            {can(me, 'quotes', 'create') && !['/', '/quotes', '/quotes/new'].includes(pathname) && (
              <a href="/quotes/new" className="btn-primary btn-sm">
                <Plus size={14} strokeWidth={2.25} /> <span className="hidden sm:inline">New quote</span>
              </a>
            )}
          </div>
        </header>

        <main className="app-content flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavGroup({ title, items, pathname }: { title?: string; items: NavItem[]; pathname: string }) {
  if (items.length === 0) return null
  return (
    <div>
      {title && <p className="px-2.5 mb-1.5 text-2xs font-medium text-gray-500">{title}</p>}
      <ul className="space-y-0.5">
        {items.map(item => {
          const active = inSection(pathname, item.href)
          const Icon = item.icon
          const child = active && item.children ? activeChild(pathname, item.children) : null
          return (
            <li key={item.href}>
              <a href={item.href}
                className={`group flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] font-medium transition-colors ${
                  active ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                }`}>
                <Icon size={16} strokeWidth={1.75} className={active ? 'text-brand-700' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="truncate">{item.label}</span>
              </a>
              {active && item.children && (
                <ul className="mt-1 mb-1.5 ml-[18px] border-l border-gray-200 pl-2.5 space-y-0.5">
                  {item.children.map(c => {
                    const on = child === c.href
                    return (
                      <li key={c.href}>
                        <a href={c.href}
                          className={`relative flex items-center h-7 px-2 rounded-md text-[13px] transition-colors ${
                            on ? 'text-gray-900 font-medium bg-gray-200/60' : 'text-gray-500 hover:text-gray-900'
                          }`}>
                          {on && <span className="absolute -left-[11px] top-1.5 bottom-1.5 w-px bg-brand-600" />}
                          {c.label}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
