'use client'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { leaderboardOptions, playerRankOptions } from '@rotra/data/fixtures/dev-menu'
import {
  connectMockBridge,
  type LeaderboardScenario,
  notifyMockBridge,
  type PlayerRankScenario,
} from '@rotra/data/mock/bridge'
import { resetDemoData } from '@rotra/data/mock/reset'
import { openClaimLinkPreview } from '@rotra/data/player-account/claim-link-preview'
import { playerAccountKeys } from '@rotra/data/player-account/query-keys'
import { useRankingSettings, useSetRankingSettings } from '@rotra/data/ranking-settings'
import { DevMenu } from '@rotra/ui/dev-menu'
import { toast } from '@rotra/ui/toaster'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import {
  resetDev,
  selectDev,
  setDevToggle,
  setLeaderboardScenario,
  setPlayerRankScenario,
} from '@/store/slices/devSlice'
export function DevTools() {
  const settings = useRankingSettings(),
    setSettings = useSetRankingSettings()
  const signIn = useSignIn('player'),
    signOut = useSignOut('player')
  const store = useAppStore(),
    dispatch = useAppDispatch(),
    toggles = useAppSelector(selectDev),
    client = useQueryClient()
  const [open, setOpen] = useState(false)
  const account = useAppSelector(selectAccount),
    router = useRouter()
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
        void client.invalidateQueries()
      }
    })
    return () => {
      unsubscribe()
      disconnect()
    }
  }, [store, client])
  return (
    <DevMenu
      playerLinkPreviews={{
        onRegistration: (state) => {
          const token = openClaimLinkPreview(state)
          void client.invalidateQueries({ queryKey: playerAccountKeys.claimLink(token) })
          setOpen(false)
          router.push(`/claim/${token}?opened=${Date.now()}`)
        },
        onPasswordReset: (state) => {
          setOpen(false)
          router.push(`/reset-password/${state === 'valid' ? 'reset-valid' : 'reset-expired'}`)
        },
      }}
      playerScenarios={{
        rank: toggles.playerRankScenario ?? 'on-leaderboard',
        leaderboard: toggles.leaderboardScenario ?? 'normal',
        rankOptions: playerRankOptions,
        leaderboardOptions,
        onRankChange: (value) => dispatch(setPlayerRankScenario(value as PlayerRankScenario)),
        onLeaderboardChange: (value) =>
          dispatch(setLeaderboardScenario(value as LeaderboardScenario)),
      }}
      rankingSettings={
        settings.data
          ? { ...settings.data, onChange: (value) => setSettings.mutate(value) }
          : undefined
      }
      playerAccount={{
        name: account?.name ?? null,
        pending: signIn.isPending || signOut.isPending,
        onSignIn: () =>
          signIn.mutate(
            { identifier: 'demo', password: 'demo' },
            {
              onSuccess: (session) => {
                dispatch(setAccount(session.account))
                setOpen(false)
                router.push(`/players/${session.account.id}`)
                toast('Signed in')
              },
              onError: (error) => toast.error(error.message),
            },
          ),
        onSignOut: () =>
          signOut.mutate(undefined, {
            onSuccess: () => {
              dispatch(setAccount(null))
              setOpen(false)
              router.push('/')
              toast('Signed out')
            },
            onError: (error) => toast.error(error.message),
          }),
      }}
      open={open}
      onOpenChange={setOpen}
      toggles={toggles}
      onToggle={(key, value) => dispatch(setDevToggle({ key, value }))}
      onReset={() => {
        signOut.mutate(undefined, {
          onSuccess: () => {
            resetDemoData()
            dispatch(resetDev())
            dispatch(setAccount(null))
            void client.invalidateQueries()
            setOpen(false)
            router.push('/')
            toast('Demo data reset')
          },
        })
      }}
    />
  )
}
