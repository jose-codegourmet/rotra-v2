'use client'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { useApproveClubNameChange } from '@rotra/data/club/useApproveClubNameChange'
import { resetDemoData } from '@rotra/data/mock/reset'
import { useNowCard } from '@rotra/data/queue-session/useNowCard'
import { useAddSampleJoinRequest } from '@rotra/data/session-roster/useAddSampleJoinRequest'
import { DevMenu } from '@rotra/ui/dev-menu'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { resetDev, selectDev, setDevToggle } from '@/store/slices/devSlice'

/** The "Prototype" button and its controls; rendered in the top bars of development builds only. */
export function DevTools() {
  const approveName = useApproveClubNameChange(),
    sample = useAddSampleJoinRequest(),
    nowCard = useNowCard()
  const session = nowCard.data?.live ?? nowCard.data?.upcoming
  const signIn = useSignIn('club'),
    signOut = useSignOut('club')
  const dispatch = useAppDispatch(),
    toggles = useAppSelector(selectDev),
    client = useQueryClient()
  const [open, setOpen] = useState(false)
  return (
    <DevMenu
      actions={[
        { label: 'Approve name change', onClick: () => approveName.mutate(undefined) },
        {
          label: 'Add sample join request',
          disabled: !session,
          onClick: () => {
            if (session) sample.mutate(session.id)
          },
        },
        {
          label: 'Sign in',
          onClick: () => {
            signIn.mutate(
              { identifier: 'demo', password: 'demo' },
              { onSuccess: () => location.assign('/') },
            )
          },
        },
        {
          label: 'Sign out',
          onClick: () => {
            signOut.mutate(undefined, { onSuccess: () => location.assign('/login') })
          },
        },
      ]}
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
