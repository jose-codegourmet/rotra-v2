'use client'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import { useAdvanceContactChangeRequest } from '@rotra/data/contact-change-request/useAdvanceContactChangeRequest'
import { useMyContactChangeRequest } from '@rotra/data/contact-change-request/useMyContactChangeRequest'
import {
  googleDeadlineOptions,
  inviteStandingOptions,
  leaderboardOptions,
  leaderboardPlaceOptions,
  playerRankOptions,
} from '@rotra/data/fixtures/dev-menu'
import { TONIGHT_SESSION_SLUG } from '@rotra/data/fixtures/google-sign-in'
import { JOSE_PLAYER_ID } from '@rotra/data/fixtures/players'
import type { MockInviteStanding } from '@rotra/data/google-sign-in/types'
import { useGoogleDeadline } from '@rotra/data/google-sign-in/useGoogleDeadline'
import { useSetMockGoogleDeadline } from '@rotra/data/google-sign-in/useSetMockGoogleDeadline'
import { useSetMockInviteStanding } from '@rotra/data/google-sign-in/useSetMockInviteStanding'
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
import { isRealDataMode } from '@rotra/data/real/mode'
import { Button } from '@rotra/ui/button'
import { ContactRequestStatus } from '@rotra/ui/contact-request-status'
import { DevMenu, type DevMenuProps } from '@rotra/ui/dev-menu'
import { toast } from '@rotra/ui/toaster'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
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
  return usePlayerGoogleSignInEnabled() ? <DevToolsWithGoogle /> : <DevToolsBase />
}
/** Mock mode only, flag on: the Before / After the Google deadline switch. */
function DevToolsWithGoogle() {
  const deadline = useGoogleDeadline().data,
    setDeadline = useSetMockGoogleDeadline()
  const setStanding = useSetMockInviteStanding(),
    account = useAppSelector(selectAccount)
  const [standing, setStandingValue] = useState<MockInviteStanding>('none')
  return (
    <DevToolsBase
      inviteStanding={
        account
          ? {
              value: standing,
              options: inviteStandingOptions,
              label: 'Standing on the invited session',
              onChange: (value) =>
                setStanding.mutate(
                  { sessionSlug: TONIGHT_SESSION_SLUG, standing: value as MockInviteStanding },
                  {
                    onSuccess: () => setStandingValue(value as MockInviteStanding),
                    onError: (error) => toast.error(error.message),
                  },
                ),
            }
          : undefined
      }
      googleDeadline={
        deadline
          ? {
              value: deadline.passed ? 'passed' : 'before',
              options: googleDeadlineOptions,
              label: `Google deadline (${deadline.label})`,
              onChange: (value) => setDeadline.mutate(value === 'passed'),
            }
          : undefined
      }
    />
  )
}
function DevToolsBase({
  googleDeadline,
  inviteStanding,
}: {
  googleDeadline?: DevMenuProps['googleDeadline']
  inviteStanding?: DevMenuProps['inviteStanding']
}) {
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
  const contactRequest = useMyContactChangeRequest(account?.id ?? null),
    advance = useAdvanceContactChangeRequest()
  const request = contactRequest.data
  const pathname = usePathname()
  const changeLeaderboard = (scenario: LeaderboardScenario) => {
    if (isRealDataMode()) return
    const demoPlace = scenario === 'in-top-50' || scenario === 'below-top-50'
    const showScenario = () => {
      dispatch(setLeaderboardScenario(scenario))
      if (scenario === 'empty-week') {
        setOpen(false)
        router.push('/?period=week')
      } else if (demoPlace) {
        setOpen(false)
        if (pathname !== '/') router.push('/')
      }
    }
    if (demoPlace && account?.id !== JOSE_PLAYER_ID) {
      signIn.mutate(
        { identifier: 'demo', password: 'demo' },
        {
          onSuccess: (session) => {
            dispatch(setAccount(session.account))
            showScenario()
          },
          onError: (error) => toast.error(error.message),
        },
      )
      return
    }
    showScenario()
  }
  // The prototype's Contact-change request (Admin) buttons for each status.
  const requestActions: Partial<Record<ContactChangeStatus, [ContactChangeStatus, string][]>> = {
    pending: [
      ['applying', 'Approve'],
      ['rejected', 'Decline'],
    ],
    applying: [
      ['applied', 'Finish applying'],
      ['failed', 'Applying fails'],
    ],
    failed: [['applied', 'Retry succeeds']],
  }
  const contactRequestSlot = request ? (
    <div className="flex flex-wrap items-center gap-2">
      <ContactRequestStatus request={request} variant="compact" />
      {(requestActions[request.status] ?? []).map(([to, label]) => (
        <Button
          key={to}
          size="xs"
          disabled={advance.isPending}
          onClick={() =>
            advance.mutate(
              { requestId: request.requestId, to },
              { onError: (error) => toast.error(error.message) },
            )
          }
        >
          {label}
        </Button>
      ))}
    </div>
  ) : undefined
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
        leaderboardOptions: isRealDataMode() ? undefined : leaderboardOptions,
        leaderboardPlaceOptions: isRealDataMode() ? undefined : leaderboardPlaceOptions,
        onRankChange: (value) => dispatch(setPlayerRankScenario(value as PlayerRankScenario)),
        onLeaderboardChange: (value) => changeLeaderboard(value as LeaderboardScenario),
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
      googleDeadline={googleDeadline}
      inviteStanding={inviteStanding}
      contactRequestSlot={contactRequestSlot}
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
