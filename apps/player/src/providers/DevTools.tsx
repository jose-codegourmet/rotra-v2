'use client'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { playerRankOptions, leaderboardOptions } from '@rotra/data/fixtures/dev-menu'
import { connectMockBridge, notifyMockBridge, type PlayerRankScenario, type LeaderboardScenario } from '@rotra/data/mock/bridge'
import { resetDemoData } from '@rotra/data/mock/reset'
import { useRankingSettings, useSetRankingSettings } from '@rotra/data/ranking-settings'
import { DevMenu } from '@rotra/ui/dev-menu'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks'
import { resetDev, selectDev, setDevToggle, setPlayerRankScenario, setLeaderboardScenario } from '@/store/slices/devSlice'
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
      playerScenarios={{
        rank: toggles.playerRankScenario ?? 'on-leaderboard', leaderboard: toggles.leaderboardScenario ?? 'normal',
        rankOptions: playerRankOptions, leaderboardOptions,
        onRankChange: (value) => dispatch(setPlayerRankScenario(value as PlayerRankScenario)),
        onLeaderboardChange: (value) => dispatch(setLeaderboardScenario(value as LeaderboardScenario)),
      }}
      rankingSettings={
        settings.data
          ? { ...settings.data, onChange: (value) => setSettings.mutate(value) }
          : undefined
      }
      actions={[
        {
          label: 'Sign in as Migs',
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
