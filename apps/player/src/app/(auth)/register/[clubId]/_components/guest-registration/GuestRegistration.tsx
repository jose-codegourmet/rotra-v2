'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import { MockError } from '@rotra/data/mock/errors'
import { queueSessionUrl } from '@rotra/data/player/mySessions'
import {
  useGuestRegistration,
  useGuestRegistrationClub,
} from '@rotra/data/player-account/useGuestRegistration'
import { useJoinClub } from '@rotra/data/player-club/useJoinClub'
import { usePlayerClubs } from '@rotra/data/player-club/usePlayerClubs'
import { consumeSessionReturn, rememberSessionReturn } from '@rotra/data/public-session/context'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { ClaimForm } from '@rotra/ui/claim-form'
import { ErrorState } from '@rotra/ui/error-state'
import { JoinClubCard } from '@rotra/ui/join-club-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'

export function GuestRegistration({
  clubId,
  returnTo,
  sessionSlug,
  inviteCode,
}: {
  clubId: string
  returnTo?: string
  sessionSlug?: string
  /** The club invite link's `k`; the server refuses a missing, wrong or regenerated code (#712) */
  inviteCode?: string
}) {
  useEffect(() => {
    rememberSessionReturn(returnTo)
  }, [returnTo])
  const session = useSession('player')
  const myClubs = usePlayerClubs(session.data?.account.id ?? null)
  const join = useJoinClub()
  const club = useGuestRegistrationClub(clubId, sessionSlug, inviteCode)
  const registration = useGuestRegistration(clubId, sessionSlug, inviteCode)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const result = registration.data
  if (result?.status === 'registered')
    return (
      <AccountLinkStatus
        variant="claim-done"
        standalone
        clubName={result.clubName ?? undefined}
        sessionTitle={result.sessionTitle}
        onBackToSession={
          result.sessionSlug
            ? () => window.location.assign(queueSessionUrl(result.sessionSlug ?? ''))
            : undefined
        }
        firstName={result.firstName}
        rtrId={result.rtrId}
        onOpenProfile={() => router.push(`/players/${result.playerId}`)}
      />
    )
  if (club.isError)
    return (
      <LinkPage title="Couldn't open this registration invitation.">
        <ErrorState
          title={club.error.message}
          retryLabel="Retry"
          retrying={club.isFetching}
          onRetry={() => void club.refetch()}
        />
      </LinkPage>
    )
  if (!club.data)
    return (
      <LinkPage title="Opening registration">
        <Skeleton className="h-40" />
      </LinkPage>
    )
  if (session.isPending || (session.data && clubId && myClubs.isPending))
    return (
      <LinkPage title="Opening registration">
        <Skeleton className="h-40" />
      </LinkPage>
    )
  if (session.data && clubId && myClubs.isError)
    return (
      <LinkPage title="Couldn't load your clubs.">
        <ErrorState title={myClubs.error.message} onRetry={() => void myClubs.refetch()} />
      </LinkPage>
    )
  if (session.data && clubId)
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
        <JoinClubCard
          clubName={club.data.clubName ?? ''}
          clubInitials={(club.data.clubName ?? '')
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
          alreadyIn={myClubs.data?.some((c) => c.id === clubId)}
          pending={join.isPending}
          error={join.error?.message ?? myClubs.error?.message}
          onNotNow={() => router.push(`/players/${session.data?.account.id}`)}
          onJoin={() =>
            join.mutate(
              { clubId, inviteCode },
              {
                onSuccess: () => {
                  toast(`You joined ${club.data.clubName}`)
                  router.push(`/players/${session.data?.account.id}`)
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        />
      </main>
    )
  const error = registration.error
  return (
    <ClaimForm
      standalone
      clubName={club.data.clubName ?? ''}
      contextLabel={
        !clubId
          ? 'ROTRA registration'
          : sessionSlug
            ? `Session link from ${club.data.clubName} · ${club.data.sessionTitle}`
            : `Registration link from ${club.data.clubName}`
      }
      cities={
        !clubId ? foundingCities.map((city) => ({ value: city.code, label: city.name })) : undefined
      }
      maskedPhone=""
      isPending={registration.isPending}
      accountMatch={result?.status === 'account-match'}
      onDismissMatch={() => registration.reset()}
      serverError={
        error
          ? {
              message: error.message,
              field:
                error instanceof MockError && error.fieldErrors?.email
                  ? 'email'
                  : error instanceof MockError && error.fieldErrors?.phone
                    ? 'phone'
                    : error instanceof MockError && error.fieldErrors?.cityCode
                      ? 'cityCode'
                      : undefined,
            }
          : undefined
      }
      onSubmit={({ confirmPassword: _confirm, ...values }) =>
        registration.mutate(values, {
          onSuccess: (response) => {
            if (response.status === 'registered') {
              dispatch(setAccount(response.session.account))
              toast('Registration complete')
              consumeSessionReturn(returnTo)
            }
            window.scrollTo(0, 0)
          },
          onError: (failure) => toast.error(failure.message),
        })
      }
    />
  )
}
