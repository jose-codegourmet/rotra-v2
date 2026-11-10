import type { MatchFormat } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import type { SessionMode } from '../queue-session/queueSession.types'
import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'

/** Public-safe participant or waitlist entry. */
export type PublicSessionParticipant = {
  /** Masked on the server (`maskPublicName`): "J*** A***". The full name never enters the page. */
  name: string
  /** Uploaded picture of a registered or unclaimed player; guests never have one */
  pictureUrl?: string | null
  skillGroup: 'beginner' | 'intermediate' | 'advanced' | null
  /** Full playing level for the avatar hover label, or null when unrated. */
  levelLabel: string | null
  /**
   * Signed-in version only (D-2026-11-09-02). Registered players' second line; null or missing for
   * a guest, an unclaimed profile and every visitor view.
   */
  nickname?: string | null
  /**
   * True when `name` is masked (guest, unclaimed profile, or any visitor view). Missing reads as
   * masked, so the visitor wire shape stays as it was. Feed it to `PublicParticipantTile`'s `masked`.
   */
  masked?: boolean
  /**
   * Signed-in version only, registered players only (the Player app's `/find/<RTR>` profile link).
   * Never present for a guest or an unclaimed profile, and never for a visitor.
   */
  rtrId?: string | null
  /** Signed-in version only: this row is the viewer's own (the You pill). */
  isViewer?: boolean
}
/**
 * #474: aggregate counts of public participants in each skill group. Missing level → unrated.
 */
export type PublicSkillMix = {
  beginner: number
  intermediate: number
  advanced: number
  unrated: number
}
/** A published standings row: position and counts only, no internal ids. */
export type PublicStandingRow = {
  position: number
  name: string
  wins: number
  losses: number
  games: number
  /** Signed-in version only: the viewer's own standing row (accent-subtle highlight). */
  isViewer?: boolean
}
/** One Off Day name, present only when the publication explicitly included Off Day. */
export type PublicOffDayRow = { name: string; priorSessions: number }
/** Only the published slides; each key is absent when that slide was not published. */
export type PublicSessionResults = {
  standings?: PublicStandingRow[]
  awards?: {
    mvp: { name: string } | null
    mostImproved: { name: string; priorSessions: number } | null
  }
  offDay?: PublicOffDayRow[]
}
/**
 * Q-PUBLIC-*: the public-safe projection of a session by its slug, built from the last synced
 * state. Private data (Off Day unless included, costs, phones, presence) never enters it.
 */
export type PublicSessionPage = {
  /**
   * Which version this is (D-2026-11-09-09): `visitor` is everything masked and capped with no
   * courts or queue; `signed-in` is the registered players' names, no cap and the viewer flagged.
   * Missing reads as `visitor`.
   */
  audience?: 'visitor' | 'signed-in'
  slug: string
  status: 'prepared' | 'active' | 'completed' | 'invalid' | 'cancelled'
  /** The cancel reason shown on a cancelled page; null or missing when none was given. */
  cancelReason?: string | null
  title: string
  start: number
  end: number
  /** `id` is the club's ID for its public registration link (Register with ROTRA, #689) */
  club: { id?: string; name: string; initials: string; logoUrl?: string | null }
  venue: { name: string; address?: string | null }
  /** Court labels in order */
  courts: string[]
  formats: { singles: boolean; doubles: boolean }
  mode: SessionMode
  minimum: number
  notes?: string | null
  /** Total before the anonymous 12-tile server cap. */
  participantCount?: number
  participants: PublicSessionParticipant[]
  /** Aggregate skill-group counts over the full confirmed roster (never the waitlist), #474 */
  skillMix: PublicSkillMix
  /** Public-safe waitlisted players in waitlist order. */
  waitlist: PublicSessionParticipant[]
  openSlots: number
  slotBudget: number
  acceptJoinRequests: boolean
  /**
   * Payment per player in centavos (Details › Payment): the custom amount or the break-even share;
   * 0 reads “Free”; null (or missing) means no estimate is saved, so the row is omitted.
   */
  amountDuePerPlayer?: number | null
  lastSyncedAt: number
  /** The operator's device has changes that have not synced yet */
  hasPendingChanges: boolean
  /** null until results are published (always null for prepared, active and invalid sessions) */
  results: PublicSessionResults | null
  /**
   * Finished session only: false reads “Results for this session have not been shared.” Missing on
   * other states and on older wire shapes. Unpublished results never enter this projection.
   */
  resultsPublished?: boolean
}

/** A face on a Courts now tile or in a queued match: first name per the public name rule. */
export type PublicMatchPlayer = {
  /** First word only: “Maya” for a registered player, “Y***” for a masked guest */
  name: string
  /** Full playing level, same shape the existing queue component reads */
  level: PlayingLevel | null
  pictureUrl?: string | null
  /** True when the name is masked (guest or unclaimed profile) */
  masked: boolean
  /** The viewer's own face */
  isViewer?: boolean
}

/** One entry of **Courts now**; a match on merged courts is one entry (“Court 1 + Court 2”). */
export type PublicCourtNow = {
  /** The first court's id, stable per entry */
  id: string
  /** “Court 2”, or “Court 1 + Court 2” when merged */
  label: string
  courtLabels: string[]
  merged: boolean
  /** `playing` (Playing), `getting-ready` (On court, not started), `free` (no players, no start) */
  status: 'playing' | 'getting-ready' | 'free'
  teamA: PublicMatchPlayer[]
  teamB: PublicMatchPlayer[]
  /** “Started 9:16 PM”; null while getting ready (“Waiting to start”) and when free. No score. */
  startedAt: number | null
}

/** One waiting match of the read-only Queue: faces and first names, up to five per side. */
export type PublicQueuedMatch = {
  matchNo: number
  /** 1-based place in the waiting queue; #1 is pinned with the Next chip */
  position: number
  /** Not shown (the faces tell the format); kept so the existing queue component's type fits */
  format: MatchFormat
  teamA: PublicMatchPlayer[]
  teamB: PublicMatchPlayer[]
}

/**
 * The signed-in version of the shared snapshot: names per the signed-in rule, the full roster and
 * waitlist, the viewer's rows flagged, plus **Courts now** and the **Queue**. Identical for every
 * signed-in viewer except the `isViewer` flags, so the real server can cache it (D-2026-11-09-09).
 */
export type SignedInPublicSession = PublicSessionPage & {
  audience: 'signed-in'
  /** Live sessions only; empty before the start and after the finish */
  courtsNow: PublicCourtNow[]
  /** Waiting matches in queue order; empty reads “No matches queued yet.” */
  queue: PublicQueuedMatch[]
}

/** The stage the My night card shows; same values as `MyNightCard`'s `stage` prop. */
export type MyNightStage =
  | 'waitlisted'
  | 'before-start'
  | 'live-not-present'
  | 'live-present'
  | 'finished'

/** “with A, B vs C, D” as data: the other faces in the viewer's match. */
export type MyNightMatch = {
  partners: PublicMatchPlayer[]
  opponents: PublicMatchPlayer[]
  /** Ready for `MyNightCard.matchLabel`: “with A vs B, C”, or “vs B, C” when playing alone */
  matchLabel: string
}

/**
 * The small personal part of the signed-in read (D-2026-11-09-09): only about this Player in this
 * session. Never carries another player's results or positions. Props map straight onto `MyNightCard`.
 */
export type MyNight = {
  playerId: string
  /** `none`: not confirmed and not waitlisted (the join card shows instead) */
  status: 'none' | 'confirmed' | 'waitlisted'
  /** Null when status is `none`, and for a cancelled or invalid session */
  stage: MyNightStage | null
  /** Waitlisted: 1 = next */
  waitlistPosition: number | null
  /** The session's start, for “Confirmed · starts DATE, TIME” */
  startsAt: number
  present: boolean
  /** The Player checked in themselves and the Queue Master has not changed it since */
  checkedIn: boolean
  /** The Player tapped I'm leaving and the Queue Master has not changed it since */
  hasLeft: boolean
  /** An open I can't make it notice (“Told the QM you can't make it”) */
  cantMakeItSent: boolean
  /** The club device is offline: “Checked in · the QM will see it when their device syncs” */
  offline: boolean
  /** Counted games, wins and losses tonight; the viewer's own standing only */
  games: number
  won: number
  lost: number
  /** The session's minimum games; 0 when it has none */
  minimum: number
  /** First waiting match with the viewer in it, or null (“Not in a queued match”) */
  inQueue: ({ position: number } & MyNightMatch) | null
  /** The match holding a court with the viewer in it (On court or Playing), or null */
  onCourt: ({ courtLabel: string; started: boolean } & MyNightMatch) | null
  /** Their latest join request on this session, for the Want to play? card; null when none */
  joinRequest: MyJoinRequest | null
  /** An open Request a match waiting for the Queue Master, or null */
  matchRequest: {
    id: string
    format: MatchFormat
    at: number
    partners: (PublicMatchPlayer | null)[]
    opponents: (PublicMatchPlayer | null)[]
  } | null
  /** Invite shows only while Prepared, requests are on, and the Player has a slot or waitlist place */
  canInvite: boolean
  /** The Player's Session invite code if one was made already; read-only here, `useSessionInviteCode` makes it */
  inviteCode: string | null
}
/** What a guest types in Request to join; the phone is already normalised (E.164) or null. */
export type SendJoinRequestInput = {
  name: string
  nickname?: string | null
  phone?: string | null
  statedBand: SessionJoinRequest['statedBand']
  /** Generated once per open sheet; real mode sends it so a retry saves one request */
  requestId?: string
}
/** This visitor's own request on a session page, remembered for the page visit. */
export type MyJoinRequest = {
  requestId: string
  name: string
  status: SessionJoinRequest['status']
  /** 1-based waitlist position once confirmed onto the waitlist; null otherwise */
  waitlistPosition: number | null
}

/** Narrow Player-hosted projection; never a club session or operator data. */
export type PlayerSessionAccess = {
  playerId: string
  /** The signed-in Player's profile name, for **Request to join as NAME** (#687) */
  name: string
  /** Holds a slot or a waitlist place in this session */
  inSession: boolean
  /** The Player's latest request for this session (any status), or null */
  joinRequest: MyJoinRequest | null
  fullRoster: boolean
  participants: PublicSessionParticipant[]
  queue: {
    matchNo: number
    format: MatchFormat
    teamA: { name: string; level: PlayingLevel | null }[]
    teamB: { name: string; level: PlayingLevel | null }[]
  }[]
}

/**
 * A signed-in ROTRA Player acting on a session page (Q17.2). `playerId` is the authenticated
 * Player profile; the server checks it is linked to an unreleased slot where the write needs one.
 */
export type PlayerSessionInput = { playerId: string }
/** **Request to join as NAME**; `inviteCode` is the link's `?invite=` code, when it had one. */
export type JoinAsPlayerInput = PlayerSessionInput & { inviteCode?: string | null }

/** One present player the Request a match sheet and its picker can name (the viewer is left out). */
export type MatchRequestOptionPlayer = {
  /** The roster row id: what a request's partners and opponents hold */
  id: string
  /** Per the signed-in name rule (full for a registered player, masked for a guest) */
  name: string
  /** Nickname or first name, for the court face */
  shortName: string
  pictureUrl?: string | null
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** The court label while playing; null when off court */
  playingOn: string | null
  /** Minutes since their last game ended (or since arriving) */
  restMinutes: number
}

/** The read behind Request a match (`useMatchRequestOptions`). */
export type MatchRequestOptions = {
  /** The viewer's own roster row id, null when not on the roster */
  viewerRosterId: string | null
  /** The viewer's own picture for the "You" face, or null */
  viewerPictureUrl: string | null
  /** The session's minimum games; 0 when it has none */
  minimum: number
  /** Formats the session allows, in pill order; empty means it takes no match requests */
  allowedFormats: MatchFormat[]
  players: MatchRequestOptionPlayer[]
}
