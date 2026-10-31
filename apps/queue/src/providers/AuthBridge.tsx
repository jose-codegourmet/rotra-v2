'use client'
import { useAccountScope } from '@rotra/data/auth/account-scope'
import { useSession } from '@rotra/data/auth/use-session'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'
export function AuthBridge() {
  const session = useSession('club'),
    dispatch = useAppDispatch()
  useAccountScope(session.data?.account.id ?? null)
  useEffect(() => {
    dispatch(setAccount(session.data?.account ?? null))
  }, [session.data, dispatch])
  return null
}
