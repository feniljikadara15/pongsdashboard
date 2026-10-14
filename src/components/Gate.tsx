'use client'
import { Lock } from 'lucide-react'
import { useMe, can, type Me } from '@/lib/useMe'
import type { ModuleName } from '@/lib/permissions'
import { EmptyState, PageLoading } from '@/components/ui'

// Client-side access gate for whole pages. This is a UX layer only — the real
// enforcement lives in the API routes (every data call is authorized server-
// side). Gate simply avoids rendering a board the user has no business seeing.
export default function Gate({
  module,
  admin,
  children,
}: {
  module?: ModuleName
  admin?: boolean
  children: React.ReactNode | ((me: Me) => React.ReactNode)
}) {
  const { me, loading } = useMe()

  if (loading) return <PageLoading />

  const allowed = !me ? false : admin ? me.isAdmin : module ? can(me, module, 'view') : true

  if (!allowed) {
    return (
      <div className="card mt-8">
        <EmptyState
          icon={Lock}
          title="You don't have access to this section"
          description="Ask an administrator to grant you permission for this module."
          action={<a href="/quotes" className="btn-secondary">Go to quotes</a>}
        />
      </div>
    )
  }

  return <>{typeof children === 'function' ? (children as (me: Me) => React.ReactNode)(me as Me) : children}</>
}
