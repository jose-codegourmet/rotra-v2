'use client'

import { useSession } from '@rotra/data/auth/use-session'
import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import { freeCourtMinutes, playerFacingName } from '@rotra/data/match/match.rules'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import {
  playerLoginUrl,
  playerOrigin,
  playerRegisterUrl,
  sessionLinkOrigin,
} from '@rotra/data/public-session/context'
import { usePlayerSessionAccess } from '@rotra/data/public-session/player-access'
import type {
  MyJoinRequest,
  PlayerLevelBlock,
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
import { usePublicMatchHistory } from '@rotra/data/public-session/usePublicMatchHistory'
import { usePublicPaymentStatus } from '@rotra/data/public-session/usePublicPaymentStatus'
import {
  usePublicSession,
  useSignedInPublicSession,
} from '@rotra/data/public-session/usePublicSession'
import { useRefreshSession } from '@rotra/data/public-session/useRefreshSession'
import { useSessionPageAccount } from '@rotra/data/public-session/useSessionPageAccount'
import { useSessionPageSignOut } from '@rotra/data/public-session/useSessionPageSignOut'
import { isRealDataMode } from '@rotra/data/real/mode'
import type { JoinRequestPlacement } from '@rotra/data/session-roster/types'
import { useClaimTransferLink } from '@rotra/data/slot-transfer/useClaimTransferLink'
import { useTransferLink } from '@rotra/data/slot-transfer/useTransferLink'
import { useWithdrawTransferClaim } from '@rotra/data/slot-transfer/useWithdrawTransferClaim'
import { levelRestrictionDescription, levelRestrictionLabel } from '@rotra/schema/level-restriction'
import { scoringMode } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'
import { JoinRequestCard, type JoinRequestCardProps } from '@rotra/ui/join-request-card'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { PublicAccountBar } from '@rotra/ui/public-account-bar'
import { type PublicParticipant, PublicParticipants } from '@rotra/ui/public-participants'
import { PublicRefreshBar } from '@rotra/ui/public-refresh-bar'
import { type PublicSessionCourtNow, PublicSessionDetails } from '@rotra/ui/public-session-details'
import { PublicSessionHero } from '@rotra/ui/public-session-hero'
import { PublicSessionQueue } from '@rotra/ui/public-session-queue'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { Skeleton } from '@rotra/ui/skeleton'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { toast } from '@rotra/ui/toaster'
import { TransferLinkCard } from '@rotra/ui/transfer-link-card'
import { useEffect, useState } from 'react'
import { ClubCard } from '../club-card/ClubCard'
import { JoinRequestSheet } from '../join-request-sheet/JoinRequestSheet'
import { MatchHistory } from '../match-history/MatchHistory'
import { MatchRequest } from '../match-request/MatchRequest'
import { useRequestMatchAction } from '../match-request/useRequestMatchAction'
import { MyNight } from '../my-night/MyNight'
import { ParticipantProfile } from '../participant-profile/ParticipantProfile'
import { PaymentStatusShareDialog } from '../payment-status-share-dialog/PaymentStatusShareDialog'
import { QueryError } from '../query-error/QueryError'
import { SessionAwards } from '../session-awards/SessionAwards'
import { SessionInviteSheet } from '../session-invite-sheet/SessionInviteSheet'
import { SessionLeaderboard } from '../session-leaderboard/SessionLeaderboard'

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
  /** ?transfer=<token> on the visitor's link (#1012): the transfer link card (claim, withdraw) */
  transferToken?: string
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
  /** A club member (D-2026-11-12-02): Join as NAME on an upcoming session unless it requires a request */
  member: boolean
  /** Not open to your level (D-2026-11-19-12): set while their level here can't take a slot; no request is offered */
  levelBlock: PlayerLevelBlock | null
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
  if (signedIn?.levelBlock)
    return {
      variant: 'not-open-to-level',
      reason: signedIn.levelBlock.reason,
      levelLabel: levelLabel(signedIn.levelBlock.level),
    }
  if (!page.acceptJoinRequests) return { variant: 'off' }
  const availability = signedIn
    ? {
        onRequestToJoin: signedIn.onJoin,
        disabled: offline || signedIn.busy,
        signedInName: signedIn.name,
        placement: signedIn.placement,
        onPlacementChange: signedIn.onPlacementChange,
        // D-2026-11-12-02: a club member joins an upcoming session right away; the same onJoin
        // sends, and the server places them instead of writing a request.
        member: signedIn.member && page.status === 'prepared' && !page.alwaysRequireRequest,
        clubName: page.club.name,
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

/** A Courts now face id that points at a participant: `participant:<index>` (see faceParticipant). */
const FACE_PREFIX = 'participant:'

/** The participants index a Courts now face id points at, or null for a face that opens nothing. */
function faceParticipant(id: string) {
  return id.startsWith(FACE_PREFIX) ? Number(id.slice(FACE_PREFIX.length)) : null
}

/** Courts now entries as the Details component's props (read-only court cards). */
function courtsNowProps(courts: PublicCourtNow[], now = Date.now()): PublicSessionCourtNow[] {
  const faces = (side: 'a' | 'b', court: PublicCourtNow) =>
    (side === 'a' ? court.teamA : court.teamB).map((player, i) => ({
      id:
        player.participant === undefined
          ? `${court.id}-${side}-${i}`
          : `${FACE_PREFIX}${player.participant}`,
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
    freeMinutes: court.status === 'free' ? freeCourtMinutes(court.freeSince, now) : null,
  }))
}

/** The signed-in read's Queue in the shape PublicSessionQueue reads (faces and first names). */
function queueAccess(playerId: string, queue: PublicQueuedMatch[]): PlayerSessionAccess {
  const side = (players: PublicQueuedMatch['teamA']) =>
    players.map((player) => ({
      name: player.name,
      level: player.level,
      pictureUrl: player.pictureUrl,
      masked: player.masked,
      participant: player.participant,
    }))
  // Only the queue is read here; the join fields come from the signed-in read's own data.
  return {
    playerId,
    name: '',
    inSession: true,
    isClubMember: false,
    joinRequest: null,
    fullRoster: true,
    participants: [],
    queue: queue.map((match) => ({
      matchNo: match.matchNo,
      format: match.format,
      label: match.label,
      teamA: side(match.teamA),
      teamB: side(match.teamB),
    })),
  }
}

/** The tabs a saved or linked `?tab=` may name; `auto` picks Leaderboard or Details. */
const TABS = ['details', 'participants', 'leaderboard'] as const
type SavedTab = (typeof TABS)[number] | 'auto'
const savedTab = (value: unknown): SavedTab | null =>
  TABS.find((tab) => tab === value) ?? (value === 'auto' ? 'auto' : null)

/**
 * Q-PUBLIC-DETAILS / PARTICIPANTS / RESULTS / JOIN: the public session page from
 * usePublicSession. PublicSessionHero; the JoinRequestCard on prepared and active sessions (its
 * variant from the page and useMyJoinRequest); My night right above the tabs; Details and
 * "Participants · N" tabs, plus Leaderboard once a finished session's Standings are shared (it
 * opens there). A finished session's Details shows the Match history where the Queue was, then
 * Awards (or “Results for this session have not been shared.”). From 1100 px the join card (or the
 * started/cancelled notice) sits in a sticky 360 px side column (2026-11-13 wide layout log). No
 * operator controls.
 */
export function PublicSession({
  slug,
  viewer,
  openJoin = false,
  inviteCode,
  transferToken,
}: PublicSessionProps) {
  const offline = !useConnectivity().online
  const page = usePublicSession(slug, { visitor: viewer === 'visitor' })
  const mine = useMyJoinRequest(slug)
  const paymentStatus = usePublicPaymentStatus(slug)
  const [payShareOpen, setPayShareOpen] = useState(false)
  const playerAccess = usePlayerSessionAccess(slug, viewer === 'visitor')
  // The signed-in Player on the visitor's own page. Mock mode reads the mock Player sign-in. Real
  // mode has no Player session in this app: the Player app's access read (below) says who is
  // signed in, for the join card (#687), My night and a finished session's Match history (#850);
  // Courts now and the Queue come with that access read too. The signed-in page read is mock only.
  const playerSession = useSession('player')
  const viewerAccount =
    viewer === 'visitor' && !isRealDataMode() && playerSession.data?.account.audience === 'player'
      ? playerSession.data.account
      : null
  const signedInPage = useSignedInPublicSession(slug, viewerAccount?.id)
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
  // My night: mock from the mock Player session; real from the Player app's own read (its sign-in).
  const nightViewer = viewerAccount
    ? { id: viewerAccount.id, name: viewerAccount.name }
    : realPlayer
      ? { id: realPlayer.playerId, name: realPlayer.name }
      : null
  const night = useMyNight(slug, nightViewer?.id)
  // #1012: a transfer link (`?transfer=<token>`), from this viewer's side. Real mode reads the
  // Player app's own sign-in; the viewer id only keys the read so it refetches after sign-in.
  const transferLink = useTransferLink(
    slug,
    viewer === 'visitor' ? transferToken : undefined,
    nightViewer?.id ?? null,
  )
  const claimLink = useClaimTransferLink(slug)
  const withdrawClaim = useWithdrawTransferClaim(slug)
  // Real mode (#850): a finished session's Match history from the Player app's own read; the mock
  // signed-in read carries it as `history`.
  const realHistory = usePublicMatchHistory(
    slug,
    realPlayer?.playerId ?? null,
    isRealDataMode() && page.data?.status === 'completed',
  )
  // `auto` until the visitor picks a tab: a finished session with shared Standings opens on
  // Leaderboard, anything else on Details (2026-11-13-queue-finished-session-page).
  const [tab, setTab] = useState<SavedTab>('auto')
  // The signed-in card's Join a slot / Be waitlisted choice (D-2026-11-11-02)
  const [placement, setPlacement] =
    useState<Extract<JoinRequestPlacement, 'slot' | 'waitlist'>>('slot')
  const [loginHref, setLoginHref] = useState<string>()
  // The Player app's origin for profile links; only known in the browser.
  const [playerBase, setPlayerBase] = useState<string | null>(null)
  useEffect(() => {
    const current = new URL(location.href)
    let active: SavedTab = savedTab(current.searchParams.get('tab')) ?? 'auto'
    try {
      const saved = JSON.parse(sessionStorage.getItem(`rotra-public-nav:${slug}`) ?? 'null')
      if (
        saved &&
        typeof saved.at === 'number' &&
        Date.now() >= saved.at &&
        Date.now() - saved.at < 30 * 60_000
      ) {
        if (!current.searchParams.has('tab')) active = savedTab(saved.tab) ?? active
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
          ? new URL(`/s/${encodeURIComponent(slug)}`, sessionLinkOrigin()).href
          : current.href,
      ),
    )
    setPlayerBase(playerOrigin(location.origin))
  }, [slug, viewer])
  const changeTab = (value: string) => {
    setTab(savedTab(value) ?? 'details')
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
  // D-CLUB-PROFILE: the organizer line opens the club's profile card.
  const [clubOpen, setClubOpen] = useState(false)
  // Real mode reads the options only for a present Player (the read refuses anyone off the roster).
  const requestMatch = useRequestMatchAction(
    slug,
    viewerAccount?.id ?? (night.data?.stage === 'live-present' ? nightViewer?.id : undefined),
    () => setMatchRequestOpen(true),
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
              shortName: playerFacingName({
                nameSnapshot: barAccount.name,
                nicknameSnapshot: barAccount.nickname ?? null,
              }),
              pictureUrl: barAccount.pictureUrl ?? undefined,
              rtrId: barRtrId,
            }
          : null
      }
      loginHref={loginHref ?? ''}
      newTab={viewer === 'operator'}
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
        <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-12">
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
          className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-12"
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
        // Mock: the personal read; real: the Player app's access read (#687).
        member:
          realPlayer && !viewerAccount
            ? realPlayer.isClubMember
            : (night.data?.isClubMember ?? false),
        levelBlock:
          (realPlayer && !viewerAccount ? realPlayer.levelBlock : night.data?.levelBlock) ?? null,
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
  // Any signed-in Player sees the whole roster (D-2026-11-25-05): the access read sends it all.
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
  // The waitlist follows the same signed-in name rule (D-2026-11-25-05); visitors stay masked.
  const waitlist = (access && !signedRead ? (access.waitlist ?? p.waitlist) : p.waitlist).map(tile)
  // Hosts (#1006): the same name rule as Players. Real mode's signed-in names come from the Player
  // app's access read, like `participants`; zero hosts hides the section.
  const hosts = (access && !signedRead ? (access.hosts ?? p.hosts) : p.hosts)?.map((h, i) => ({
    ...tile(h, i),
    id: `host-${i}`,
  }))
  // 2026-11-13-queue-public-faces-profile: for a signed-in player the faces on Courts now and the
  // Queue open the same profile card as the Participants tab.
  const openFace =
    profileViewerId && (signedRead || realPlayer)
      ? (index: number | null) => {
          const target = index === null ? undefined : participants[index]
          if (target?.profile) setProfileOf(target)
        }
      : undefined
  const openParticipant = openFace ? (index: number) => openFace(index) : undefined

  // A finished session (2026-11-13-queue-finished-session-page): the Leaderboard tab exists only
  // once the club shared the Standings, and the page then opens on it.
  const finished = p.status === 'completed'
  // Record games off (D-2026-11-20-02): everything shows as usual; Details adds the Not ranked tile.
  const notRanked = p.recordGames === false
  // The published rows carry no viewer flag in real mode (the public copy is cacheable, D-2026-11-09-09);
  // the signed-in read's participants do, and each row points at its participant, so your row is
  // marked here: the leaderboard highlights it and shows Your position.
  const standings = finished
    ? p.results?.standings?.map((row) => ({
        ...row,
        isViewer:
          row.isViewer ??
          (row.participant !== undefined ? participants[row.participant]?.isViewer : undefined),
      }))
    : undefined
  const activeTab =
    tab === 'auto' || (tab === 'leaderboard' && !standings)
      ? standings
        ? 'leaderboard'
        : 'details'
      : tab
  const sessionLink =
    typeof location === 'undefined'
      ? `/s/${encodeURIComponent(slug)}`
      : new URL(`/s/${encodeURIComponent(slug)}`, sessionLinkOrigin()).href
  const resultsClub = { name: p.club.name, initials: p.club.initials, logoUrl: p.club.logoUrl }
  // #1012: the transfer link card goes first in the side column. Signing up goes through the
  // session link's registration (identity and RTR ID like any session link), back to this link.
  const linkToken = transferToken ?? ''
  const linkView = linkToken ? transferLink.data : undefined
  const linkWrite = {
    onSuccess: (done: { message: string }) => toast(done.message),
    onError: (error: Error) => toast.error(error.message),
  }
  const linkCard = linkView ? (
    <TransferLinkCard
      state={linkView.state}
      senderName={linkView.senderName}
      signedIn={!!nightViewer}
      claimBlock={linkView.claimBlock}
      registerHref={
        isRealDataMode() && p.club.id && typeof location !== 'undefined'
          ? playerRegisterUrl(p.club.id, location.href, { join: false })
          : undefined
      }
      logInHref={loginHref}
      pending={claimLink.isPending || withdrawClaim.isPending}
      offline={offline}
      onClaim={() => {
        if (nightViewer) claimLink.mutate({ token: linkToken, playerId: nightViewer.id }, linkWrite)
      }}
      onWithdraw={() => {
        if (nightViewer)
          withdrawClaim.mutate({ token: linkToken, playerId: nightViewer.id }, linkWrite)
      }}
    />
  ) : null
  // The join card, or the started/cancelled notice: the side column from 1100 px.
  const sideMain =
    p.status === 'cancelled' ? (
      <Notice tone="warn" title="This session is cancelled.">
        {cancelWhy ? `${cancelWhy}.` : null}
      </Notice>
    ) : card ? (
      <JoinRequestCard {...card} />
    ) : null
  const side =
    linkCard || sideMain ? (
      <>
        {linkCard}
        {sideMain}
      </>
    ) : null

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
        {/* 2026-11-13-queue-session-page-wide-layout: from 1100 px, hero and refresh line on top,
            the tabs on the left, the join card in a sticky 360 px column on the right; with no
            side column, one column of at most 960 px. */}
        <main
          className={cn(
            'mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-12',
            side
              ? 'min-[1100px]:grid min-[1100px]:max-w-[1180px] min-[1100px]:grid-flow-row-dense min-[1100px]:grid-cols-[minmax(0,1fr)_360px] min-[1100px]:items-start min-[1100px]:gap-x-7'
              : 'min-[1100px]:max-w-[960px]',
          )}
        >
          <PublicSessionHero
            dateLine={`${date(p.start)} · ${time(p.start)}–${time(p.end)}`}
            title={p.title}
            clubName={p.club.name}
            clubInitials={p.club.initials}
            clubLogoUrl={p.club.logoUrl}
            state={HERO_STATE[p.status]}
            onOpenClub={p.club.id ? () => setClubOpen(true) : undefined}
            className="col-span-full"
          />
          {signedRead || realPlayer ? (
            <div className="col-span-full">
              <PublicRefreshBar
                updatedLabel={time(refreshing.lastRefreshedAt ?? p.lastSyncedAt)}
                hasPendingChanges={p.hasPendingChanges}
                refreshThrottled={!refreshing.canRefresh}
                offline={offline}
                onRefresh={() => void refreshing.refresh()}
              />
            </div>
          ) : null}
          {side ? (
            <aside className="flex min-w-0 flex-col gap-5 min-[1100px]:sticky min-[1100px]:top-[76px] min-[1100px]:col-start-2">
              {side}
            </aside>
          ) : null}
          <div className="flex min-w-0 flex-col gap-5 min-[1100px]:col-start-1">
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
                onInvite={() => setInviteOpen(true)}
                onRequestMatch={requestMatch}
              />
            ) : null}
            <Tabs
              aria-label="Session page"
              value={activeTab}
              onChange={changeTab}
              items={[
                { value: 'details', label: 'Details' },
                {
                  value: 'participants',
                  label: `Participants · ${p.participantCount ?? p.participants.length}`,
                },
                ...(standings ? [{ value: 'leaderboard', label: 'Leaderboard' }] : []),
              ]}
            >
              <TabsContent value="details" className="flex flex-col gap-5">
                <PublicSessionDetails
                  dateLabel={date(p.start)}
                  timeLabel={`${time(p.start)}–${time(p.end)} · ${duration(p.start, p.end)}`}
                  venueName={p.venue.name}
                  venueAddress={p.venue.address}
                  courtLabels={p.courts}
                  formats={p.formats}
                  modeLabel={mode.label}
                  modeDescription={mode.text}
                  levelsLabel={levelRestrictionLabel(p.levelRestriction)}
                  levelsDescription={levelRestrictionDescription(p.levelRestriction)}
                  scoringLabel={scoringMode(p.scoring).label}
                  scoringDescription={scoringMode(p.scoring).text}
                  minimumGames={p.minimum}
                  ranked={!notRanked}
                  amountDuePerPlayer={p.amountDuePerPlayer}
                  notes={p.notes}
                  lastUpdatedLabel={time(p.lastSyncedAt)}
                  hasPendingChanges={p.hasPendingChanges}
                  courtsNow={
                    signedRead
                      ? courtsNowProps(signedRead.courtsNow)
                      : // Real mode: the Player app's access read carries Courts now.
                        realPlayer?.courtsNow
                        ? courtsNowProps(realPlayer.courtsNow)
                        : undefined
                  }
                  onOpenCourtPlayer={openFace ? (id) => openFace(faceParticipant(id)) : undefined}
                  queueSlot={
                    // A finished session shows its Match history where the Queue was.
                    finished ? (
                      signedRead ? (
                        <MatchHistory
                          history={signedRead.history}
                          onOpenParticipant={openParticipant}
                        />
                      ) : realPlayer ? (
                        realHistory.data ? (
                          <MatchHistory
                            history={realHistory.data}
                            onOpenParticipant={openParticipant}
                          />
                        ) : null
                      ) : viewerAccount ? null : (
                        <MatchHistory history={null} />
                      )
                    ) : viewer === 'visitor' ? (
                      signedRead && viewerAccount ? (
                        <PublicSessionQueue
                          access={queueAccess(viewerAccount.id, signedRead.queue)}
                          onRetry={() => void signedInPage.refetch()}
                          onOpenPlayer={openFace}
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
                          onOpenPlayer={openFace}
                        />
                      )
                    ) : undefined
                  }
                />
                {paymentStatus.data &&
                paymentStatus.data.amountDue !== null &&
                paymentStatus.data.rows.length > 0 ? (
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 basis-[240px] flex-1">
                      <h2 className="m-0 text-base font-bold">Payment status</h2>
                      <p className="m-0 mt-1 text-sm text-fg2">
                        Who has paid, who paid part and who still owes, as text you can copy or
                        share.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setPayShareOpen(true)}>
                      Share payment status
                    </Button>
                    <PaymentStatusShareDialog
                      open={payShareOpen}
                      onOpenChange={setPayShareOpen}
                      heading={`${p.title} · ${date(p.start)}`}
                      amountDue={paymentStatus.data.amountDue}
                      rows={paymentStatus.data.rows}
                    />
                  </Card>
                ) : null}
                {finished ? (
                  p.results && (p.results.awards || p.results.offDay) ? (
                    <SessionAwards
                      results={p.results}
                      sessionTitle={p.title}
                      dateLabel={date(p.start)}
                      club={resultsClub}
                      link={sessionLink}
                      onOpenParticipant={openParticipant}
                    />
                  ) : p.results ? null : (
                    <Card className="px-4 py-6 text-center text-fg2">
                      Results for this session have not been shared.
                    </Card>
                  )
                ) : null}
              </TabsContent>
              <TabsContent value="participants">
                <PublicParticipants
                  hosts={hosts}
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
              {standings ? (
                <TabsContent value="leaderboard">
                  <SessionLeaderboard
                    rows={standings}
                    viewer={
                      signedRead && barAccount
                        ? { name: barAccount.name, pictureUrl: barAccount.pictureUrl }
                        : null
                    }
                    sessionTitle={p.title}
                    dateLabel={date(p.start)}
                    club={resultsClub}
                    link={sessionLink}
                    onOpenParticipant={openParticipant}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        </main>
      </PullToRefresh>
      {p.club.id ? (
        <ClubCard
          open={clubOpen}
          onClose={() => setClubOpen(false)}
          club={{ ...p.club, id: p.club.id, logoUrl: p.club.logoUrl ?? null }}
          newTab={viewer === 'operator'}
        />
      ) : null}
      {profileViewerId ? (
        <ParticipantProfile
          participant={profileOf}
          viewerPlayerId={profileViewerId}
          onClose={() => setProfileOf(null)}
          newTab={viewer === 'operator'}
        />
      ) : null}
      {signedIn && nightViewer && sessionOpen && p.acceptJoinRequests && night.data?.canInvite ? (
        <SessionInviteSheet
          slug={slug}
          playerId={nightViewer.id}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          inviterName={nightViewer.name}
          inviterAvatarUrl={barAccount?.pictureUrl}
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
      {signedIn && nightViewer && sessionOpen && night.data?.stage === 'live-present' ? (
        <MatchRequest
          slug={slug}
          viewer={nightViewer}
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
    </>
  )
}
