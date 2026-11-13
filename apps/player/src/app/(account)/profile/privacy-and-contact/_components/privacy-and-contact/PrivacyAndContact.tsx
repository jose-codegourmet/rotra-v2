'use client'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useSetHiddenFromDirectory } from '@rotra/data/player-account/useSetHiddenFromDirectory'
import { useSetPhonePrivacy } from '@rotra/data/player-account/useSetPhonePrivacy'
import { useSetProfileVisibility } from '@rotra/data/player-account/useSetProfileVisibility'
import { useSetStatsVisibility } from '@rotra/data/player-account/useSetStatsVisibility'
import { Button } from '@rotra/ui/button'
import { ContactDetailsCard } from '@rotra/ui/contact-details-card'
import { ContactRequestStatus } from '@rotra/ui/contact-request-status'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { PhonePrivacyCard } from '@rotra/ui/phone-privacy-card'
import { PlayerInformationCard } from '@rotra/ui/player-information-card'
import {
  ProfileVisibilityControl,
  profileVisibilityWord,
} from '@rotra/ui/profile-visibility-control'
import { SignOutCard } from '@rotra/ui/sign-out-card'
import { StatsVisibilityCard, type StatsVisibilityKey } from '@rotra/ui/stats-visibility-card'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import { useContactChangeSheet } from '../../../_components/contact-change-sheet/useContactChangeSheet'
import { useRequireSignedIn } from '../../../_components/require-signed-in/useRequireSignedIn'
import Loading from '../../loading'

export function PrivacyAndContact({
  highlight = null,
}: {
  /** The row to scroll to and flash (the weekly chart's chip opens `weekly`) */
  highlight?: StatsVisibilityKey | null
} = {}) {
  const signedOut = useRequireSignedIn()
  const account = useAppSelector(selectAccount)
  // A different player's private data is never requested: only the signed-in id is passed.
  const playerId = account?.id ?? null
  const myAccount = useMyAccount(playerId)
  const setVisibility = useSetProfileVisibility()
  const setHidden = useSetHiddenFromDirectory()
  const setPrivacy = useSetPhonePrivacy()
  // Stats on your profile lives on the public profile (both switches default on).
  const profile = usePlayerProfile(playerId ?? '')
  const setStats = useSetStatsVisibility()
  const [statsPending, setStatsPending] = useState<StatsVisibilityKey | null>(null)
  const [statsError, setStatsError] = useState<string>()
  const signOut = useSignOut('player')
  const contactChange = useContactChangeSheet(playerId)
  const [privacyError, setPrivacyError] = useState<string>()
  const [visibilityError, setVisibilityError] = useState<string>()
  const [hiddenError, setHiddenError] = useState<string>()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const data = myAccount.data
  if (signedOut) return null
  if (!account || !data) {
    return myAccount.isError ? (
      <main className="mx-auto max-w-[640px] px-4 pt-5">
        <ErrorState
          title="Couldn't load your privacy and contact details."
          onRetry={() => void myAccount.refetch()}
          retrying={myAccount.isFetching}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <Loading />
    )
  }
  const request = contactChange.request.data
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push(`/players/${account.id}`)}
        >
          ← My profile
        </Button>
        <PageHeader title="Privacy and contact" />
      </div>
      <ProfileVisibilityControl
        savedVisibility={data.profileVisibility}
        isPending={setVisibility.isPending}
        error={visibilityError}
        onChange={(next) => {
          if (setVisibility.isPending || next === data.profileVisibility) return
          setVisibilityError(undefined)
          setVisibility.mutate(
            { profileVisibility: next },
            {
              onSuccess: (saved) =>
                toast(`Your profile is now ${profileVisibilityWord(saved.profileVisibility)}`),
              onError: (error) => {
                setVisibilityError(error.message)
                toast.error(error.message)
              },
            },
          )
        }}
      />
      <StatsVisibilityCard
        showProfileStats={profile.data?.showProfileStats !== false}
        showWeeklyPerformance={profile.data?.showWeeklyPerformance !== false}
        pending={statsPending}
        error={statsError}
        highlight={profile.data ? highlight : null}
        onToggle={(key, next) => {
          if (setStats.isPending) return
          setStatsError(undefined)
          setStatsPending(key)
          setStats.mutate(
            key === 'stats' ? { showProfileStats: next } : { showWeeklyPerformance: next },
            {
              onSuccess: () =>
                toast(
                  key === 'stats'
                    ? next
                      ? 'Profile stats shown'
                      : 'Profile stats hidden from others'
                    : next
                      ? 'Weekly performance shown'
                      : 'Weekly performance hidden from others',
                ),
              onError: (error) => {
                setStatsError(error.message)
                toast.error(error.message)
              },
              onSettled: () => setStatsPending(null),
            },
          )
        }}
      />
      <PlayerInformationCard
        savedHidden={data.hiddenFromDirectory}
        isPending={setHidden.isPending}
        error={hiddenError}
        onToggle={(next) => {
          if (setHidden.isPending) return
          setHiddenError(undefined)
          setHidden.mutate(
            { hiddenFromDirectory: next },
            {
              onSuccess: (saved) =>
                toast(
                  saved.hiddenFromDirectory
                    ? 'You are now hidden from Player Information'
                    : 'Clubs can now find you in Player Information',
                ),
              onError: (error) => {
                setHiddenError(error.message)
                toast.error(error.message)
              },
            },
          )
        }}
      />
      <PhonePrivacyCard
        savedHidden={data.phoneHidden}
        isPending={setPrivacy.isPending}
        error={privacyError}
        onToggle={(next) => {
          if (setPrivacy.isPending) return
          setPrivacyError(undefined)
          setPrivacy.mutate(
            { phoneHidden: next },
            {
              onSuccess: (saved) =>
                toast(
                  saved.phoneHidden
                    ? 'Your phone number is now hidden from clubs'
                    : 'Clubs can now see your phone number',
                ),
              onError: (error) => {
                setPrivacyError(error.message)
                toast.error(error.message)
              },
            },
          )
        }}
      />
      <ContactDetailsCard
        phone={data.phone}
        email={data.email}
        hasOpenRequest={contactChange.hasOpenRequest}
        statusSlot={request ? <ContactRequestStatus request={request} /> : null}
        onRequestChange={contactChange.openSheet}
      />
      <SignOutCard
        isPending={signOut.isPending}
        onSignOut={() =>
          signOut.mutate(undefined, {
            onSuccess: () => {
              dispatch(setAccount(null))
              router.push('/')
              toast('Signed out')
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />
      {contactChange.sheet}
    </main>
  )
}
