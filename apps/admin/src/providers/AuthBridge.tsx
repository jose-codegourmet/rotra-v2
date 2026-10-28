'use client'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'

export function AuthBridge() {
  const session = useAdminSession()
  const dispatch = useAppDispatch()
  const client = useQueryClient()
  const previousKind = useRef(session.data.kind)
  useEffect(() => {
    const current = session.data
    // Covers expiry or cookie removal outside the mutation hooks, including browser Back/focus.
    if (previousKind.current === 'owner' && current.kind !== 'owner') {
      void client.cancelQueries()
      client.clear()
    }
    previousKind.current = current.kind
    dispatch(
      setAccount(
        current.kind === 'owner'
          ? { email: current.account.email }
          : current.kind === 'denied'
            ? { accountDescription: current.accountDescription }
            : null,
      ),
    )
  }, [session.data, dispatch, client])
  return null
}
