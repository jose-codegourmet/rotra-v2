'use client'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useSignInAdmin } from '@rotra/data/admin-account/use-sign-in-admin'
import { useSignOutAdmin } from '@rotra/data/admin-account/use-sign-out-admin'
import { adminAccount } from '@rotra/data/fixtures/admin-accounts'
import { connectMockBridge, notifyMockBridge } from '@rotra/data/mock/bridge'
import { resetDemoData } from '@rotra/data/mock/reset'
import { DevMenu } from '@rotra/ui/dev-menu'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks'
import { resetDev, selectDev, setDevToggle } from '@/store/slices/devSlice'

export function DevTools() {
  const signIn = useSignInAdmin()
  const signOut = useSignOutAdmin()
  const session = useAdminSession()
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const toggles = useAppSelector(selectDev)
  const client = useQueryClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const disconnect = connectMockBridge({
      read: () => store.getState().dev,
      consume: (key) => store.dispatch(setDevToggle({ key, value: false })),
    })
    let previous = store.getState().dev
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().dev
      if (next !== previous) {
        previous = next
        notifyMockBridge()
        if (!next.offline) void client.invalidateQueries()
      }
    })
    return () => {
      unsubscribe()
      disconnect()
    }
  }, [store, client])
  const pending = signIn.isPending || signOut.isPending
  return (
    <DevMenu
      audience="admin"
      actions={[
        {
          label: 'Sign in as platform owner',
          disabled: pending,
          onClick: () =>
            signIn.mutate(
              { email: adminAccount.email, password: 'prototype' },
              {
                onSuccess: (result) => {
                  setOpen(false)
                  router.replace(result.kind === 'owner' ? '/clubs' : '/login')
                },
              },
            ),
        },
        {
          label: 'End the session',
          disabled: pending || session.data.kind !== 'owner',
          onClick: () =>
            signOut.mutate(
              { sessionEnded: true },
              {
                onSuccess: () => {
                  setOpen(false)
                  router.replace('/login')
                  router.refresh()
                },
              },
            ),
        },
      ]}
      extraToggles={[
        {
          key: 'adminDeniedNextSignIn',
          label: 'Sign in with a club account',
          description: 'The next sign-in shows Access denied for the Lahug Smash Club account.',
          checked: Boolean(toggles.adminDeniedNextSignIn),
          onChange: (value) => dispatch(setDevToggle({ key: 'adminDeniedNextSignIn', value })),
        },
        {
          key: 'adminNextSignInRejected',
          label: 'Next sign-in is rejected',
          description: 'The next sign-in shows the invalid-credential error.',
          checked: Boolean(toggles.adminNextSignInRejected),
          onChange: (value) => dispatch(setDevToggle({ key: 'adminNextSignInRejected', value })),
        },
        {
          key: 'adminNextLicenseSaveNoReply',
          label: 'Next license save gets no reply',
          description:
            'The term is saved, but the reply is lost. Check status finds it instead of adding a second one.',
          checked: Boolean(toggles.adminNextLicenseSaveNoReply),
          onChange: (value) =>
            dispatch(setDevToggle({ key: 'adminNextLicenseSaveNoReply', value })),
        },
        {
          key: 'adminNextContactApplicationFails',
          label: 'Next contact change fails to apply',
          description: 'Approval saves; applying it to the account fails and needs a retry.',
          checked: Boolean(toggles.adminNextContactApplicationFails),
          onChange: (value) =>
            dispatch(setDevToggle({ key: 'adminNextContactApplicationFails', value })),
        },
      ]}
      controlLabels={{ offline: 'Offline' }}
      open={open}
      onOpenChange={setOpen}
      toggles={toggles}
      onToggle={(key, value) => dispatch(setDevToggle({ key, value }))}
      onReset={() => {
        resetDemoData()
        dispatch(resetDev())
        void client.invalidateQueries()
      }}
    />
  )
}
