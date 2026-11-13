import type { PlayingLevel } from '../player/player.types'

/**
 * One registered member as the viewer may see them (P-CLUB-PAGE, P-CLUB-MEMBERS). Masking is
 * applied before this leaves the fetcher (or the server in real mode): a masked member carries the
 * masked name and no player id or nickname; the picture is always shown (D-2026-11-11-11).
 */
export type ClubPageMember = {
  /** Stable row key: the club player id */
  key: string
  /** Null when masked: the row does not open */
  playerId: string | null
  /** Full name, or the masked name ("J*** D***") */
  name: string
  nickname: string | null
  /** Photo URL/data URL or character:<id>; resolve character references before display */
  picture: string | null
  /** The club's level for them, or null (No level yet) */
  level: PlayingLevel | null
  /** The signed-in viewer's own row */
  isYou: boolean
  masked: boolean
  /**
   * The member's resolved Profile banner (public, like the picture, so masked rows keep it). Missing
   * draws the default banner.
   */
  bannerKey?: string | null
  /** The resolved banner's uploaded image; null for a banner drawn from theme tokens */
  bannerImageUrl?: string | null
}

export type ClubPageSessionStatus = 'live' | 'scheduled' | 'done'

/** A club session for the page: scheduled, live or done; cancelled and invalid never appear. */
export type ClubPageSession = {
  id: string
  title: string
  startsAt: number
  endsAt: number
  status: ClubPageSessionStatus
  /** The public session page; null for a done session older than three months (page gone) */
  href: string | null
}

/** The public club page read: served per request, never indexed. */
export type ClubPage = {
  club: {
    id: string
    name: string
    initials: string
    logoUrl: string | null
    city: string
    /** The club's current invite link (`/register/<clubId>?k=<code>`); separate from the page URL */
    joinHref: string
  }
  /** Whether the viewer is signed in with ROTRA (signed out: every name is masked) */
  signedIn: boolean
  /** The signed-in viewer is a current member (a club player row not removed): Leave club shows (#766) */
  viewerIsMember: boolean
  /** Registered members listed, sorted by the name shown; the count equals this list */
  members: ClubPageMember[]
  /** Every session of the club, oldest first */
  sessions: ClubPageSession[]
}
