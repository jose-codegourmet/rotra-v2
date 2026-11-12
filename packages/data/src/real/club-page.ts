import { clubJoinHref } from '../club-page/clubPage.rules'
import type { ClubPage, ClubPageMember, ClubPageSessionStatus } from '../club-page/clubPage.types'
import { queueSessionUrl } from '../player/mySessions'
import { RealRequestError, realRequest } from './client'

type ClubPageDto = {
  club: {
    id: string
    name: string
    initials: string
    logoUrl: string | null
    city: string
    inviteCode: string | null
  }
  signedIn: boolean
  viewerIsMember: boolean
  members: ClubPageMember[]
  sessions: {
    id: string
    title: string
    startsAt: number
    endsAt: number
    status: ClubPageSessionStatus
    slug: string | null
  }[]
}

/**
 * P-CLUB-PAGE / P-CLUB-MEMBERS in real mode: `/api/clubs/[clubId]` (masked on the server). Join
 * this club opens the club's current invite link, `?k=<code>` included (#712). Null on 404.
 */
export async function realGetClubPage(
  clubId: string,
  signal?: AbortSignal,
): Promise<ClubPage | null> {
  try {
    const { page } = await realRequest<{ page: ClubPageDto }>(
      `/api/clubs/${encodeURIComponent(clubId)}`,
      { signal },
    )
    return {
      club: {
        id: page.club.id,
        name: page.club.name,
        initials: page.club.initials,
        logoUrl: page.club.logoUrl,
        city: page.club.city,
        joinHref: clubJoinHref(page.club.id, page.club.inviteCode),
      },
      signedIn: page.signedIn,
      viewerIsMember: page.viewerIsMember,
      members: page.members,
      sessions: page.sessions.map(({ slug, ...s }) => ({
        ...s,
        href: slug ? queueSessionUrl(slug) : null,
      })),
    }
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
}
