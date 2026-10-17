'use client'
import { useEffect } from 'react'

// Lets other screens deep-link straight into a "create" form with ?new=1
// (for example from the setup guide). The parameter is removed once used so
// a refresh does not reopen the form.
export function useNewParam(open: () => void) {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('new') !== '1') return
    url.searchParams.delete('new')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    open()
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
