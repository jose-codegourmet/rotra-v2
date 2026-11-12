'use client'

import { useSession } from '@rotra/data/auth/use-session'
import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import { playerLoginUrl, playerOrigin, playerRegisterUrl } from '@rotra/data/public-session/context'
import { usePlayerSessionAccess } from '@rotra/data/public-session/player-access'
import type {
  MyJoinRequest,
  PlayerSessionAccess,
  PublicCourtNow,
  PublicQueuedMatch,
  PublicSessionPage,
  PublicSessionParticipant,
} from '@rotra/data/public-session/types'
import { useCancelMyJoinRequest } from '@rotra/data/public-session/useCancelMyJoinRequest'
import { useJoinAsPlayer } from '@rotra/data/public-session/useJoinAsPlayer'
import { useMyJoinRequest } from '@rotra/data/public-session/useMyJoinRequest'
import { useMyNight } from '@rotra/data/public-session/useMyNight'
import {
  usePublicSession,
  useSignedInPublicSession,
} from '@rotra/data/public-session/usePublicSession'
import { useRefreshSession } from '@rotra/data/public-session/useRefreshSession'
import { useSessionPageAccount } from '@rotra/data/public-session/useSessionPageAccount'
import { useSessionPageSignOut } from '@rotra/data/public-session/useSessionPageSignOut'
import { isRealDataMode } from '@rotra/data/real/mode'
import type { JoinRequestPlacement } from '@rotra/data/session-roster/types'
import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import { JoinRequestCard, type JoinRequestCardProps } from '@rotra/ui/join-request-card'
import { Notice } from '@rotra/ui/notice'
import { PublicAccountBar } from '@rotra/ui/public-account-bar'
import { type PublicParticipant, PublicParticipants } from '@rotra/ui/public-participants'
import { PublicRefreshBar } from '@rotra/ui/public-refresh-bar'
import {
  PublicResultsSection,
  type PublicResultsSectionPublished,
} from '@rotra/ui/public-results-section'
import { type PublicSessionCourtNow, PublicSessionDetails } from '@rotra/ui/public-session-details'
import { PublicSessionHero } from '@rotra/ui/public-session-hero'
import { PublicSessionQueue } from '@rotra/ui/public-session-queue'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { Skeleton } from '@rotra/ui/skeleton'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { JoinRequestSheet } from '@/app/(public)/s/[slug]/_components/join-request-sheet/JoinRequestSheet'
import { MatchRequest } from '@/app/(public)/s/[slug]/_components/match-request/MatchRequest'
import { useRequestMatchAction } from '@/app/(public)/s/[slug]/_components/match-request/useRequestMatchAction'
import { MyNight } from '@/app/(public)/s/[slug]/_components/my-night/MyNight'
import { ParticipantProfile } from '@/app/(public)/s/[slug]/_components/participant-profile/ParticipantProfile'
import { SessionInviteSheet } from '@/app/(public)/s/[slug]/_components/session-invite-sheet/SessionInviteSheet'

export type PublicSessionProps = {
  slug: string
  /**
   * visitor: the guest's own browser (/s/[slug]); operator: the preview inside the Queue app.
   * Only the visitor's reads depend on the visitor's connection.
   */
  viewer: 'visitor' | 'operator'
  /** ?join=1 on the visitor's link: open Request to join (back from the ROTRA Player login) */
  openJoin?: boolean
  /** ?invite=<code> on the visitor's link: sent with Request to join as NAME ("Invited by NAME") */
  inviteCode?: string
}

const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
} as const

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
/** The prototype's fmtDate: "Sun, Oct 26" */
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
/** The prototype's fmtDur: "3 h" or "2 h 30 min" */
const duration = (start: number, end: number) => {
  let m = Math.round((end - start) / 60_000)
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}

const HERO_STATE = {
  prepared: 'upcoming',
  active: 'live',
  completed: 'finished',
  // An invalid session's hero carries no status chip.
  invalid: 'upcoming',
  cancelled: 'cancelled',
} as const

/** A signed-in ROTRA Player on the visitor's own page (D-2026-11-09-02): one tap, Cancel request. */
type SignedInViewer = {
  name: string
  /** Request to join as NAME: sends straight away, no form, with the chosen placement */
  onJoin: () => void
  onCancelRequest: () => void
  /** A send or cancel is in flight: the buttons stay disabled so a second tap is impossible */
  busy: boolean
  /** The Join a slot / Be waitlisted choice on the card (D-2026-11-11-02) */
  placement: Extract<JoinRequestPlacement, 'slot' | 'waitlist'>
  onPlacementChange: (placement: Extract<JoinRequestPlacement, 'slot' | 'waitlist'>) => void
  /** Waitlisted: their 1-based place, for the Confirmed · waitlist #N card and Join from waitlist */
  waitlistPosition: number | null
  onJoinFromWaitlist: () => void
}

/** The signed-in Player's ID: the mock session's account, or the Player app's access read. */
const signedInId = (as: { id: string } | { playerId: string }) =>
  'playerId' in as ? as.playerId : as.id

/**
 * The join card variant: this visitor's own request first, then started (live), requests off, open
 * or full.
 */
function joinCardProps(
  page: PublicSessionPage,
  mine: MyJoinRequest | null | undefined,
  onRequestToJoin: () => void,
  offline: boolean,
  signedIn?: SignedInViewer,
): JoinRequestCardProps | null {
  if (page.status !== 'prepared' && page.status !== 'active') return null
  // D-2026-11-11-02: a waitlisted signed-in Player sees their waitlist card, with Join from waitlist
  // while a slot is open, and Cancel request while their slot request waits for the Queue Master.
  if (signedIn?.waitlistPosition) {
    const asking = mine?.status === 'pending' && mine.placement === 'from_waitlist'
    return {
      variant: 'confirmed-waitlist',
      waitlistPosition: signedIn.waitlistPosition,
      signedIn: true,
      // No Join from waitlist once live: join requests end at Start (D-2026-11-11-11).
      openSlots: page.acceptJoinRequests && page.status === 'prepared' ? page.openSlots : 0,
      onJoinFromWaitlist: signedIn.onJoinFromWaitlist,
      slotRequestPending: asking,
      onCancelRequest: signedIn.onCancelRequest,
      disabled: offline || signedIn.busy,
    }
  }
  // Join requests close at Start (D-2026-11-11-11): once live, a signed-in Player without a slot
  // and anyone without a request status of their own see the started notice instead of the form.
  const started = { variant: 'started' } as const
  if (signedIn && page.status === 'active' && mine?.status !== 'confirmed') return started
  // A cancelled or closed request is not a status: the card offers Request to join again.
  if (mine && mine.status !== 'cancelled' && mine.status !== 'closed') {
    if (mine.status === 'pending')
      return signedIn
        ? {
            variant: 'sent',
            name: mine.name,
            placement: mine.placement,
            onCancelRequest: signedIn.onCancelRequest,
            disabled: offline || signedIn.busy,
          }
        : { variant: 'sent', name: mine.name, placement: mine.placement, registerNudge: true }
    if (mine.status === 'declined')
      return signedIn ? { variant: 'declined' } : { variant: 'declined', registerNudge: true }
    return mine.waitlistPosition
      ? {
          variant: 'confirmed-waitlist',
          waitlistPosition: mine.waitlistPosition,
          signedIn: signedIn ? true : undefined,
          registerNudge: signedIn ? undefined : true,
        }
      : signedIn
        ? { variant: 'confirmed-slot' }
        : { variant: 'confirmed-slot', registerNudge: true }
  }
  if (page.status === 'active') return started
  if (!page.acceptJoinRequests) return { variant: 'off' }
  const availability = signedIn
    ? {
        onRequestToJoin: signedIn.onJoin,
        disabled: offline || signedIn.busy,
        signedInName: signedIn.name,
        placement: signedIn.placement,
        onPlacementChange: signedIn.onPlacementChange,
      }
    : { onRequestToJoin, disabled: offline }
  return page.openSlots > 0
    ? {
        variant: 'open',
        openSlots: page.openSlots,
        capacity: page.slotBudget,
        skillMix: page.skillMix,
        ...availability,
      }
    : { variant: 'full', skillMix: page.skillMix, ...availability }
}

/** Courts now entries as the Details component's props (read-only court cards). */
function courtsNowProps(courts: PublicCourtNow[]): PublicSessionCourtNow[] {
  const faces = (side: 'a' | 'b', court: PublicCourtNow) =>
    (side === 'a' ? court.teamA : court.teamB).map((player, i) => ({
      id: `${court.id}-${side}-${i}`,
      name: player.name,
      shortName: player.name,
      level: player.level,
      photoUrl: player.pictureUrl ?? undefined,
    }))
  return courts.map((court) => ({
    id: court.id,
    label: court.label,
    merged: court.merged,
    status: court.status,
    teamA: faces('a', court),
    teamB: faces('b', court),
    startedLabel: court.startedAt ? time(court.startedAt) : undefined,
  }))
}

/** The signed-in read's Queue in the shape PublicSessionQueue reads (faces and first names). */
function queueAccess(playerId: string, queue: PublicQueuedMatch[]): PlayerSessionAccess {
  const side = (players: PublicQueuedMatch['teamA']) =>
    players.map((player) => ({ name: player.name, level: player.level }))
  // Only the queue is read here; the join fields come from the signed-in read's own data.
  return {
    playerId,
    name: '',
    inSession: true,
    joinRequest: null,
    fullRoster: true,
    participants: [],
    queue: queue.map((match) => ({
      matchNo: match.matchNo,
      format: match.format,
      teamA: side(match.teamA),
      teamB: side(match.teamB),
    })),
  }
}

/** The published slides as slide props; Off Day only when the publication included it. */
function publishedSlides(page: PublicSessionPage): PublicResultsSectionPublished | null {
  if (!page.results) return null
  const frame = {
    club: page.club,
    sessionLine: `${page.title} · ${date(page.start)}`,
    venue: page.venue.name,
  }
  const { standings, awards, offDay } = page.results
  const own = standings?.find((row) => row.isViewer)
  return {
    standings: standings
      ? {
          ...frame,
          // Position is unique, so it is the row id; the signed-in read flags the viewer's own row.
          rows: standings.map(({ isViewer: _own, ...row }) => ({
            ...row,
            id: String(row.position),
          })),
          highlightRowId: own ? String(own.position) : undefined,
        }
      : undefined,
    awards: awards
      ? {
          ...frame,
          mvp: awards.mvp,
          mostImproved: awards.mostImproved,
          showFormulaNote: true,
        }
      : undefined,
    offDay: offDay ? { ...frame, rows: offDay } : undefined,
  }
}

/**
 * Q-PUBLIC-DETAILS / PARTICIPANTS / RESULTS / JOIN: the public session page from
 * usePublicSession. PublicSessionHero; the JoinRequestCard on prepared and active sessions (its
 * variant from the page and useMyJoinRequest); Details and "Participants · N" tabs; and, for
 * completed sessions only, the Results section with the published slides. No operator controls.
 */
export function PublicSession({ slug, viewer, openJoin = false, inviteCode }: PublicSessionProps) {
  const offline = !useConnectivity().online
  const page = usePublicSession(slug, { visitor: viewer === 'visitor' })
  const mine = useMyJoinRequest(slug)
  const playerAccess = usePlayerSessionAccess(slug, viewer === 'visitor')
  // The signed-in Player on the visitor's own page. Mock mode reads the mock Player sign-in. Real
  // mode has no Player session in this app: the Player app's access read (below) says who is
  // signed in, for the join card only (#687); the other signed-in reads are mock only.
  const playerSession = useSession('player')
  const viewerAccount =
    viewer === 'visitor' && !isRealDataMode() && playerSession.data?.account.audience === 'player'
      ? playerSession.data.account
      : null
  const signedInPage = useSignedInPublicSession(slug, viewerAccount?.id)
  const night = useMyNight(slug, viewerAccount?.id)
  const joinAsPlayer = useJoinAsPlayer(slug)
  const cancelMyRequest = useCancelMyJoinRequest(slug)
  const refreshing = useRefreshSession(slug)
  const accountRead = useSessionPageAccount(viewerAccount?.id)
  const signOut = useSessionPageSignOut(slug)
  // A failed revalidation must never keep privileged roster data visible from the cache.
  const access =
    viewer === 'visitor' &&
    playerAccess.isSuccess &&
    playerAccess.fetchStatus !== 'paused' &&
    !offline
      ? playerAccess.data
      : null
  // Real mode (#687): the signed-in Player from the Player app's own sign-in, never a token here.
  const realPlayer = viewer === 'visitor' && isRealDataMode() && access ? access : null
  // Until that check answers, a signed-in Player must not see the guest card first.
  const realPlayerChecking = viewer === 'visitor' && isRealDataMode() && playerAccess.isPending
  const [tab, setTab] = useState('details')
  // The signed-in card's Join a slot / Be waitlisted choice (D-2026-11-11-02)
  const [placement, setPlacement] =
    useState<Extract<JoinRequestPlacement, 'slot' | 'waitlist'>>('slot')
  const [loginHref, setLoginHref] = useState<string>()
  // The Player app's origin for profile links; only known in the browser.
  const [playerBase, setPlayerBase] = useState<string | null>(null)
  useEffect(() => {
    const current = new URL(location.href)
    let active = current.searchParams.get('tab') === 'participants' ? 'participants' : 'details'
    try {
      const saved = JSON.parse(sessionStorage.getItem(`rotra-public-nav:${slug}`) ?? 'null')
      if (
        saved &&
        typeof saved.at === 'number' &&
        Date.now() >= saved.at &&
        Date.now() - saved.at < 30 * 60_000
      ) {
        if (!current.searchParams.has('tab') && saved.tab === 'participants')
          active = 'participants'
        if (!current.hash && typeof saved.hash === 'string') current.hash = saved.hash
      }
    } catch {
      /* optional UI memory */
    }
    try {
      sessionStorage.setItem(
        `rotra-public-nav:${slug}`,
        JSON.stringify({ tab: active, hash: current.hash, at: Date.now() }),
      )
    } catch {
      /* optional UI memory */
    }
    setTab(active)
    history.replaceState(null, '', current)
    // The operator preview's Log in is the visitor's: back to /s/<slug>, not to the preview.
    setLoginHref(
      playerLoginUrl(
        viewer === 'operator'
          ? new URL(`/s/${encodeURIComponent(slug)}`, location.origin).href
          : current.href,
      ),
    )
    setPlayerBase(playerOrigin(location.origin))
  }, [slug, viewer])
  const changeTab = (value: string) => {
    setTab(value)
    const current = new URL(location.href)
    current.searchParams.set('tab', value)
    history.replaceState(null, '', current)
    if (viewer === 'visitor') setLoginHref(playerLoginUrl(current.href))
    try {
      sessionStorage.setItem(
        `rotra-public-nav:${slug}`,
        JSON.stringify({ tab: value, hash: current.hash, at: Date.now() }),
      )
    } catch {
      /* optional UI memory */
    }
  }
  const [joinOpen, setJoinOpen] = useState(openJoin && viewer === 'visitor')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [matchRequestOpen, setMatchRequestOpen] = useState(false)
  /** The tapped participant or waitlist tile (#731); null while no profile card is open */
  const [profileOf, setProfileOf] = useState<PublicParticipant | null>(null)
  const requestMatch = useRequestMatchAction(slug, viewerAccount?.id, () =>
    setMatchRequestOpen(true),
  )

  // The account bar (#693): the signed-in Player (mock: the Player session; real: the Player app's
  // access read), or Log in. The operator preview always shows the visitor's bar.
  const realAccount =
    viewer === 'visitor' && isRealDataMode() && !viewerAccount ? (playerAccess.data ?? null) : null
  const barAccount = viewerAccount ? { name: viewerAccount.name, ...accountRead.data } : realAccount
  const barRtrId = barAccount?.rtrId ?? undefined
  const bar = (
    <PublicAccountBar
      viewer={
        barAccount
          ? {
              name: barAccount.name,
              shortName: barAccount.nickname || barAccount.name.split(/\s+/)[0] || barAccount.name,
              pictureUrl: barAccount.pictureUrl ?? undefined,
              rtrId: barRtrId,
            }
          : null
      }
      loginHref={loginHref ?? ''}
      profileHref={
        barRtrId && playerBase ? `${playerBase}/find/${encodeURIComponent(barRtrId)}` : ''
      }
      signingOut={signOut.isPending}
      onSignOut={() =>
        signOut.mutate(undefined, {
          onSuccess: () => toast('Signed out'),
          onError: (error) => toast.error(error.message),
        })
      }
    />
  )

  // The signed-in read when there is one; any failure leaves the visitor page.
  const p = signedInPage.data ?? page.data
  // A cached copy keeps showing when a refetch fails (an offline visitor); without one, explain.
  if (!p && page.isError) {
    const notFound = isPermissionRefusal(page.error)
    return (
      <>
        {bar}
        <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
          {notFound ? (
            <EmptyState title="This session page isn't available." />
          ) : (
            <QueryError query={page} title="Couldn't load this session page." />
          )}
        </main>
      </>
    )
  }
  if (!p)
    return (
      <>
        {bar}
        <main
          aria-busy
          aria-label="Loading the session page"
          className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]"
        >
          <div className="flex flex-col gap-2.5">
            <Skeleton className="w-48" />
            <Skeleton className="h-8 w-64" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="w-32" />
            </div>
          </div>
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-lg" />
        </main>
      </>
    )

  const mode = MODES[p.mode]
  const cancelWhy = (p.cancelReason ?? '').replace(/[.\s]+$/, '')
  // Sending a request needs internet; the guest's own connection is the DevMenu toggle here.
  const signedInAs = viewerAccount && night.data ? viewerAccount : realPlayer
  // D-2026-11-11-02: Join a slot is unavailable before start while every slot is taken. During play
  // the Queue Master can admit additional players, so the choice stays open.
  const slotsFull = p.status === 'prepared' && p.openSlots === 0
  const chosenPlacement = slotsFull ? 'waitlist' : placement
  const sendAsPlayer = (as: NonNullable<typeof signedInAs>, how: JoinRequestPlacement) =>
    joinAsPlayer.mutate(
      { playerId: signedInId(as), inviteCode: inviteCode ?? null, placement: how },
      {
        onSuccess: (done) => toast(done.message),
        onError: (error) => toast.error(error.message),
      },
    )
  const signedIn: SignedInViewer | undefined = signedInAs
    ? {
        name: signedInAs.name,
        busy: joinAsPlayer.isPending || cancelMyRequest.isPending,
        placement: chosenPlacement,
        onPlacementChange: setPlacement,
        onJoin: () => sendAsPlayer(signedInAs, chosenPlacement),
        onJoinFromWaitlist: () => sendAsPlayer(signedInAs, 'from_waitlist'),
        waitlistPosition:
          realPlayer && !viewerAccount
            ? (realPlayer.waitlistPosition ?? null)
            : night.data?.status === 'waitlisted'
              ? night.data.waitlistPosition
              : null,
        onCancelRequest: () =>
          cancelMyRequest.mutate(
            { playerId: signedInId(signedInAs) },
            {
              onSuccess: (done) => toast(done.message),
              onError: (error) => toast.error(error.message),
            },
          ),
      }
    : undefined
  // A signed-in Player's request comes from their account, not from this browser's guest request.
  // Already confirmed or waitlisted without a request (added by the Queue Master): no join card.
  const ownRequest = realPlayer && !viewerAccount ? realPlayer.joinRequest : night.data?.joinRequest
  // A waitlisted Player keeps a card (Confirmed · waitlist #N with Join from waitlist).
  const inSession =
    realPlayer && !viewerAccount
      ? realPlayer.inSession &&
        !realPlayer.waitlistPosition &&
        ownRequest?.status !== 'pending' &&
        ownRequest?.status !== 'confirmed'
      : !!signedIn && night.data?.status === 'confirmed' && !night.data?.joinRequest
  // While the signed-in Player's own read is loading or failed there is no join card (a guest
  // form would be wrong for them); the My night area below shows the loading or error state.
  const nightPending = !!viewerAccount && !night.data
  const nightFailed = nightPending && (night.isError || night.fetchStatus === 'paused')
  const card =
    inSession || nightPending || realPlayerChecking
      ? null
      : joinCardProps(
          p,
          signedIn ? ownRequest : mine.data,
          () => setJoinOpen(true),
          offline,
          signedIn,
        )
  // The signed-in read (names per the signed-in rule, no cap, the viewer flagged) when there is
  // one; otherwise the visitor page, or the Player-hosted full roster.
  const signedRead = viewerAccount && signedInPage.data ? signedInPage.data : null
  // A signed-in Player's Queue never falls back to the Player-hosted read or the login prompt:
  // checking while the read loads, "Couldn't check Player access." when it failed or is offline.
  const signedReadFailed =
    !!viewerAccount &&
    !signedRead &&
    (signedInPage.isError || signedInPage.fetchStatus === 'paused')
  const sessionOpen = p.status === 'prepared' || p.status === 'active'
  const uncapped = !!signedRead || access?.fullRoster === true
  // #731: any signed-in Player can open a participant's profile card (mock: the signed-in read;
  // real: the Player app's access read, which says who each participant is).
  const profileViewerId = signedRead ? (viewerAccount?.id ?? null) : (realPlayer?.playerId ?? null)
  // Registered players only, for a signed-in viewer only: the Player app's profile for the card's
  // Open ROTRA profile, new tab.
  const tile = (x: PublicSessionParticipant, i: number) => ({
    id: String(i),
    ...x,
    href:
      profileViewerId && x.rtrId && x.masked === false && playerBase
        ? `${playerBase}/find/${encodeURIComponent(x.rtrId)}`
        : null,
  })
  const participants = (access && !signedRead ? access.participants : p.participants).map(tile)
  const waitlist = p.waitlist.map(tile)

  return (
    <>
      {bar}
      <PullToRefresh
        onRefresh={refreshing.refresh}
        throttled={!refreshing.canRefresh}
        offline={offline}
        refreshing={refreshing.isRefreshing}
        updatedLabel={time(refreshing.lastRefreshedAt ?? p.lastSyncedAt)}
      >
        <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
          <PublicSessionHero
            dateLine={`${date(p.start)} · ${time(p.start)}–${time(p.end)}`}
            title={p.title}
            clubName={p.club.name}
            clubInitials={p.club.initials}
            clubLogoUrl={p.club.logoUrl}
            state={HERO_STATE[p.status]}
          />
          {signedRead ? (
            <PublicRefreshBar
              updatedLabel={time(refreshing.lastRefreshedAt ?? p.lastSyncedAt)}
              hasPendingChanges={p.hasPendingChanges}
              refreshThrottled={!refreshing.canRefresh}
              offline={offline}
              onRefresh={() => void refreshing.refresh()}
            />
          ) : null}
          {p.status === 'cancelled' ? (
            <Notice tone="warn" title="This session is cancelled.">
              {cancelWhy ? `${cancelWhy}.` : null}
            </Notice>
          ) : card ? (
            <JoinRequestCard {...card} />
          ) : null}
          {nightPending ? (
            nightFailed ? (
              <Notice tone="error">
                Couldn't check Player access.{' '}
                <Button
                  onClick={() => {
                    void night.refetch()
                    void signedInPage.refetch()
                  }}
                >
                  Retry
                </Button>
              </Notice>
            ) : (
              <Skeleton label="Loading your night" className="h-24 rounded-lg" />
            )
          ) : null}
          {signedIn && night.data ? (
            <MyNight
              slug={slug}
              night={night.data}
              sessionOpen={sessionOpen}
              acceptJoinRequests={p.acceptJoinRequests}
              offline={offline}
              startsLabel={`${new Date(p.start).toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time(p.start)}`}
              matchHistoryHref={
                playerBase
                  ? `${playerBase}/players/${encodeURIComponent(night.data.playerId)}/games`
                  : null
              }
              onInvite={() => setInviteOpen(true)}
              onRequestMatch={requestMatch}
            />
          ) : null}
          <Tabs
            aria-label="Session page"
            value={tab}
            onChange={changeTab}
            items={[
              { value: 'details', label: 'Details' },
              {
                value: 'participants',
                label: `Participants · ${p.participantCount ?? p.participants.length}`,
              },
            ]}
          >
            <TabsContent value="details">
              <PublicSessionDetails
                when={`${date(p.start)}, ${time(p.start)}–${time(p.end)} (${duration(p.start, p.end)})`}
                venueName={p.venue.name}
                venueAddress={p.venue.address}
                courtLabels={p.courts}
                formats={p.formats}
                modeLabel={mode.label}
                modeDescription={mode.text}
                minimumGames={p.minimum}
                amountDuePerPlayer={p.amountDuePerPlayer}
                notes={p.notes}
                lastUpdatedLabel={time(p.lastSyncedAt)}
                hasPendingChanges={p.hasPendingChanges}
                courtsNow={signedRead ? courtsNowProps(signedRead.courtsNow) : undefined}
                queueSlot={
                  viewer === 'visitor' ? (
                    signedRead && viewerAccount ? (
                      <PublicSessionQueue
                        access={queueAccess(viewerAccount.id, signedRead.queue)}
                        onRetry={() => void signedInPage.refetch()}
                      />
                    ) : viewerAccount ? (
                      <PublicSessionQueue
                        access={null}
                        checking={!signedReadFailed}
                        failed={signedReadFailed}
                        onRetry={() => void signedInPage.refetch()}
                      />
                    ) : (
                      <PublicSessionQueue
                        access={access ?? null}
                        loginHref={loginHref}
                        checking={playerAccess.isPending}
                        failed={playerAccess.isError}
                        onRetry={() => void playerAccess.refetch()}
                      />
                    )
                  ) : undefined
                }
              />
            </TabsContent>
            <TabsContent value="participants">
              <PublicParticipants
                participants={participants}
                participantCount={p.participantCount ?? p.participants.length}
                uncapped={uncapped}
                waitlist={waitlist}
                openSlots={p.openSlots}
                finished={p.status === 'completed' || p.status === 'invalid'}
                acceptJoinRequests={p.acceptJoinRequests && p.status === 'prepared'}
                onRequestToJoin={signedIn ? signedIn.onJoin : () => setJoinOpen(true)}
                onOpenParticipant={profileViewerId ? setProfileOf : undefined}
                disabled={offline || !!signedIn?.busy}
              />
            </TabsContent>
          </Tabs>
          {p.status === 'completed' ? (
            <PublicResultsSection published={publishedSlides(p)} />
          ) : null}
          {profileViewerId ? (
            <ParticipantProfile
              participant={profileOf}
              viewerPlayerId={profileViewerId}
              onClose={() => setProfileOf(null)}
            />
          ) : null}
          {signedIn &&
          viewerAccount &&
          sessionOpen &&
          p.acceptJoinRequests &&
          night.data?.canInvite ? (
            <SessionInviteSheet
              slug={slug}
              playerId={viewerAccount.id}
              open={inviteOpen}
              onOpenChange={setInviteOpen}
              inviterName={viewerAccount.name}
              clubName={p.club.name}
              clubInitials={p.club.initials}
              clubLogoUrl={p.club.logoUrl}
              sessionTitle={p.title}
              dateLabel={date(p.start)}
              timeLabel={`${time(p.start)}–${time(p.end)}`}
              venueName={p.venue.name}
              waitlistOpen={p.openSlots === 0}
            />
          ) : null}
          {signedIn && viewerAccount && sessionOpen && night.data?.stage === 'live-present' ? (
            <MatchRequest
              slug={slug}
              viewer={{ id: viewerAccount.id, name: viewerAccount.name }}
              open={matchRequestOpen}
              onOpenChange={setMatchRequestOpen}
            />
          ) : null}
          <JoinRequestSheet
            slug={slug}
            sessionLine={`${p.title} · ${date(p.start)}, ${time(p.start)} · ${p.venue.name}`}
            // A signed-in Player joins with the card's one tap, never the guest form (#687).
            // While real mode checks the Player sign-in (back from the login with ?join=1), the guest
            // form must not flash open first.
            open={joinOpen && !signedIn && !realPlayerChecking}
            onOpenChange={setJoinOpen}
            returned={openJoin && viewer === 'visitor'}
            showPlayerLogin={viewer === 'visitor' && !signedIn}
            clubName={p.club.name}
            slotsFull={slotsFull}
            // Real mode only: the mock Player app keeps its own store (#689).
            registerHref={
              joinOpen && isRealDataMode() && p.club.id && typeof location !== 'undefined'
                ? playerRegisterUrl(p.club.id, location.href)
                : undefined
            }
          />
        </main>
      </PullToRefresh>
    </>
  )
}
