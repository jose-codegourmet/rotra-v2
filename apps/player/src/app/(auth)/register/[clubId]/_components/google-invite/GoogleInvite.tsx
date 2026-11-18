'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import type { GoogleIdentity, InviteCardData } from '@rotra/data/google-sign-in/types'
import { useGoogleRegistration } from '@rotra/data/google-sign-in/useGoogleRegistration'
import { useGoogleSignIn } from '@rotra/data/google-sign-in/useGoogleSignIn'
import { useInviteLanding } from '@rotra/data/google-sign-in/useInviteLanding'
import { MockError } from '@rotra/data/mock/errors'
import { queueSessionUrl } from '@rotra/data/player/mySessions'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import type { UnclaimedIdentities } from '@rotra/data/player-account/unclaimed-identity'
import { useJoinClub } from '@rotra/data/player-club/useJoinClub'
import { consumeSessionReturn, rememberSessionReturn } from '@rotra/data/public-session/context'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { ClaimForm } from '@rotra/ui/claim-form'
import { ErrorState } from '@rotra/ui/error-state'
import { GoogleChooseCard } from '@rotra/ui/google-choose-card'
import { IdentityPicker } from '@rotra/ui/identity-picker'
import { InviteCard } from '@rotra/ui/invite-card'
import { InviteSignedInCard } from '@rotra/ui/invite-signed-in-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGooglePicker } from '@/app/_components/google-sign-in/useGooglePicker'
import { useNoGoogleSheet } from '@/app/_components/google-sign-in/useNoGoogleSheet'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'
import { setPendingLink } from '@/store/slices/googleSlice'
import { inviteRoute } from './inviteRoute'

type GoogleInviteProps = {
  clubId: string
  returnTo?: string
  sessionSlug?: string
  /** The Session invite's `invite` */
  sessionInviteCode?: string
  /** The club invite link's `k` */
  clubInviteCode?: string
}

const UNAVAILABLE: Record<Extract<InviteCardData, { kind: 'unavailable' }>['reason'], string> = {
  club: 'This registration invitation is not available.',
  code: 'This registration invitation is not available.',
  session: 'This session link is not available.',
  started: 'This session link is not available.',
}

/** The invite card for the link (club, session or Admin), already formatted for `InviteCard`. */
function InviteHero({ card }: { card: Exclude<InviteCardData, { kind: 'unavailable' }> }) {
  if (card.kind === 'admin') return <InviteCard variant="admin" />
  if (card.kind === 'club')
    return (
      <InviteCard
        variant="club"
        clubName={card.club.name}
        clubInitials={card.club.initials}
        clubLogoUrl={card.club.logoUrl ?? undefined}
        city={card.club.city}
        memberCount={card.memberCount}
      />
    )
  const { session, club, inviter } = card
  return (
    <InviteCard
      variant="session"
      sessionTitle={session.title}
      clubName={club.name}
      clubInitials={club.initials}
      clubLogoUrl={club.logoUrl ?? undefined}
      startsAt={session.startsAt}
      when={whenText(session.startsAt, session.endsAt)}
      inviter={inviter ?? undefined}
    />
  )
}

const whenText = (startsAt: number, endsAt: number) => {
  const day = new Date(startsAt).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = (at: number) =>
    new Date(at).toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    })
  return `${day} · ${time(startsAt)} – ${time(endsAt)}`
}

/**
 * Flag on (`player_google_sign_in`): P-INVITE, the Google registration form, P-JOIN-CLUB and
 * P-JOIN-SESSION for `/register`, `/register/[clubId]` and `/register/[clubId]?session&invite`.
 * GuestRegistration renders this in place of the email + password sign-up.
 */
export function GoogleInvite({
  clubId,
  returnTo,
  sessionSlug,
  sessionInviteCode,
  clubInviteCode,
}: GoogleInviteProps) {
  useEffect(() => {
    rememberSessionReturn(returnTo)
  }, [returnTo])
  const router = useRouter(),
    dispatch = useAppDispatch()
  const session = useSession('player')
  const playerId = session.data?.account.id ?? null
  const link = { clubId, sessionSlug, sessionInviteCode, clubInviteCode }
  const landing = useInviteLanding(link, playerId)
  const registration = useGoogleRegistration()
  const googleSignIn = useGoogleSignIn()
  const join = useJoinClub()
  const noGoogle = useNoGoogleSheet()
  const profile = usePlayerProfile(playerId ?? '').data
  const [google, setGoogle] = useState<GoogleIdentity | null>(null)
  // D-2026-11-16-04: clubs that saved the Google email as an unclaimed player. More than one opens
  // the identity dialog first (`choosing`); the pick becomes `pickedId`.
  const [unclaimed, setUnclaimed] = useState<UnclaimedIdentities | null>(null)
  const [choosing, setChoosing] = useState<{
    google: GoogleIdentity
    unclaimed: UnclaimedIdentities
  } | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const records = unclaimed?.records ?? []
  const pickedRecord = records.length > 1 ? records.find((r) => r.id === pickedId) : undefined
  const matchedRecord = records.length === 1 ? records[0] : undefined
  const startingRecord = pickedRecord ?? matchedRecord
  const forgetIdentity = () => {
    setUnclaimed(null)
    setChoosing(null)
    setPickedId(null)
  }
  const route = inviteRoute(link)
  const chooseGoogle = (identity: GoogleIdentity) =>
    googleSignIn.mutate(
      { google: identity, context: 'register' },
      {
        onSuccess: (outcome) => {
          if (outcome.outcome === 'signed-in') {
            dispatch(setAccount(outcome.session.account))
            toast('Signed in with Google')
          } else if (outcome.outcome === 'ask-to-connect') {
            dispatch(
              setPendingLink({
                google: outcome.google,
                playerId: outcome.playerId,
                playerName: outcome.playerName,
                returnTo: route,
              }),
            )
            router.push('/connect-google')
          } else if (outcome.outcome === 'new-account') {
            const found = outcome.unclaimed ?? null
            setPickedId(null)
            if (found && found.records.length > 1) {
              setUnclaimed(null)
              setChoosing({ google: outcome.google, unclaimed: found })
              return
            }
            setUnclaimed(found)
            setChoosing(null)
            setGoogle(outcome.google)
            window.scrollTo(0, 0)
          }
        },
        onError: (failure) => toast.error(failure.message),
      },
    )
  // Real mode comes back here from Google; the same handler then reads what the server decided.
  const picker = useGooglePicker({ key: 'invite', intent: 'register' }, chooseGoogle)
  const adminSignedIn = !clubId && playerId !== null
  useEffect(() => {
    if (adminSignedIn) router.replace(`/players/${playerId}`)
  }, [adminSignedIn, playerId, router])

  const result = registration.data
  if (result?.outcome === 'registered' && google)
    return (
      <AccountLinkStatus
        variant="claim-done"
        standalone
        clubName={result.clubName ?? undefined}
        sessionTitle={result.sessionTitle}
        googleEmail={google.email}
        joinedClubs={result.joinedClubs}
        onBackToSession={
          result.sessionSlug
            ? () =>
                window.location.assign(
                  `${queueSessionUrl(result.sessionSlug ?? '')}?join=1${
                    sessionInviteCode ? `&invite=${encodeURIComponent(sessionInviteCode)}` : ''
                  }`,
                )
            : undefined
        }
        firstName={result.firstName}
        rtrId={result.rtrId}
        onOpenProfile={() => router.push(`/players/${result.playerId}`)}
      />
    )
  if (session.isPending || adminSignedIn)
    return (
      <LinkPage title="Opening registration">
        <Skeleton className="h-40" />
      </LinkPage>
    )
  if (landing.isError)
    return (
      <LinkPage title="Couldn't open this registration invitation.">
        <ErrorState
          title={landing.error.message}
          retryLabel="Retry"
          retrying={landing.isFetching}
          onRetry={() => void landing.refetch()}
        />
      </LinkPage>
    )
  if (!landing.data)
    return (
      <LinkPage title="Opening registration">
        <Skeleton className="h-40" />
      </LinkPage>
    )
  const { card, viewer } = landing.data
  if (card.kind === 'unavailable')
    return (
      <LinkPage title="Couldn't open this registration invitation.">
        <ErrorState title={UNAVAILABLE[card.reason]} />
      </LinkPage>
    )

  if (viewer.status !== 'visitor') {
    const openProfile = () => router.push(`/players/${viewer.playerId}`)
    const player = {
      name: viewer.name,
      pictureUrl: profile
        ? (pictureSrc(profile.picture, profile.playerId, profile.fullName) ?? undefined)
        : undefined,
    }
    const state =
      card.kind === 'club'
        ? viewer.status === 'already-member'
          ? ({ kind: 'club-member', clubName: card.club.name } as const)
          : ({ kind: 'club', clubName: card.club.name } as const)
        : viewer.status === 'own-invite'
          ? ({ kind: 'own-invite' } as const)
          : viewer.status === 'already-in'
            ? ({
                kind: 'already-in',
                sessionTitle: card.kind === 'session' ? card.session.title : '',
              } as const)
            : viewer.status === 'on-waitlist'
              ? ({
                  kind: 'on-waitlist',
                  sessionTitle: card.kind === 'session' ? card.session.title : '',
                } as const)
              : ({
                  kind: 'session',
                  inviterShortName: card.kind === 'session' ? card.inviter?.shortName : undefined,
                } as const)
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <InviteHero card={card} />
        <InviteSignedInCard
          player={player}
          state={state}
          pending={join.isPending}
          error={join.error?.message}
          onOpenProfile={openProfile}
          onJoinClub={() =>
            join.mutate(
              { clubId, inviteCode: clubInviteCode },
              {
                onSuccess: () => {
                  toast(`You joined ${card.kind === 'club' ? card.club.name : ''}`)
                  openProfile()
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
          onContinueToRequest={() => {
            if (card.kind === 'session') window.location.assign(card.continueUrl)
          }}
        />
      </main>
    )
  }

  const signInTo = (path: string) => () => router.push(path)
  const inviteRegistration = () => {
    const error = registration.error
    const clubName = card.kind === 'admin' ? '' : card.club.name
    return (
      <ClaimForm
        key={`${google?.email ?? ''}:${pickedId ?? ''}`}
        standalone
        google={{
          name: google?.name ?? '',
          email: google?.email ?? '',
          onChange: () => {
            setGoogle(null)
            forgetIdentity()
            registration.reset()
          },
        }}
        pickedIdentity={
          pickedRecord && unclaimed
            ? { clubName: pickedRecord.clubName, rtrId: unclaimed.rtrId }
            : undefined
        }
        emailMatch={
          matchedRecord && unclaimed
            ? { clubName: matchedRecord.clubName, rtrId: unclaimed.rtrId }
            : undefined
        }
        clubName={clubName}
        contextLabel={
          card.kind === 'admin'
            ? 'ROTRA registration'
            : card.kind === 'session'
              ? `Session link from ${clubName} · ${card.session.title}`
              : `Registration link from ${clubName}`
        }
        cities={
          card.kind === 'admin' && !unclaimed
            ? foundingCities.map((city) => ({ value: city.code, label: city.name }))
            : undefined
        }
        maskedPhone=""
        defaultValues={{
          fullName: startingRecord?.name ?? google?.name ?? '',
          nickname: startingRecord?.nickname ?? '',
        }}
        isPending={registration.isPending}
        accountMatch={result?.outcome === 'account-match'}
        onDismissMatch={() => registration.reset()}
        serverError={
          error
            ? {
                message: error.message,
                field:
                  error instanceof MockError && error.fieldErrors?.phone
                    ? 'phone'
                    : error instanceof MockError && error.fieldErrors?.cityCode
                      ? 'cityCode'
                      : undefined,
              }
            : undefined
        }
        onSubmit={({
          confirmPassword: _confirm,
          email: _email,
          password: _password,
          ...values
        }) => {
          if (!google) return
          registration.mutate(
            {
              google,
              clubId: clubId || null,
              sessionSlug: sessionSlug ?? null,
              clubInviteCode: clubInviteCode ?? null,
              identityRecordId: pickedRecord?.id ?? null,
              values,
            },
            {
              onSuccess: (response) => {
                if (response.outcome === 'registered') {
                  dispatch(setAccount(response.session.account))
                  toast('Registration complete')
                  consumeSessionReturn(returnTo)
                }
                window.scrollTo(0, 0)
              },
              onError: (failure) => toast.error(failure.message),
            },
          )
        }}
      />
    )
  }
  if (google) return inviteRegistration()
  return (
    <>
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px] pl-[max(16px,env(safe-area-inset-left,0px))]">
        <InviteHero card={card} />
        <GoogleChooseCard
          title="New to ROTRA?"
          pending={googleSignIn.isPending}
          hint="ROTRA accounts sign in with Google. You don't need a password, and you add your mobile number next."
          onNoGoogle={noGoogle.open}
          onGoogle={() => picker.start(chooseGoogle)}
          signIn={{
            label:
              card.kind === 'session'
                ? 'Sign in to continue'
                : card.kind === 'club'
                  ? 'Sign in to join'
                  : 'Sign in to your account',
            onClick: signInTo(
              card.kind === 'admin' ? '/login' : `/login?returnTo=${encodeURIComponent(route)}`,
            ),
          }}
        />
      </main>
      {picker.sheet}
      {noGoogle.sheet}
      {choosing ? (
        <IdentityPicker
          open
          onOpenChange={(open) => {
            if (!open) forgetIdentity()
          }}
          email={choosing.unclaimed.email}
          rtrId={choosing.unclaimed.rtrId}
          records={choosing.unclaimed.records.map((record) => ({
            ...record,
            picture: pictureSrc(record.picture, record.id, record.name) ?? null,
          }))}
          onPick={(recordId) => {
            setUnclaimed(choosing.unclaimed)
            setPickedId(recordId)
            setGoogle(choosing.google)
            setChoosing(null)
            window.scrollTo(0, 0)
          }}
          onCancel={forgetIdentity}
        />
      ) : null}
    </>
  )
}
