import { clubJoinHref } from '../club-page/clubPage.rules'
import type { ClubPage, ClubPageMember, ClubPageSessionStatus } from '../club-page/clubPage.types'
import { queueSessionUrl } from '../player/mySessions'
import { RealRequestError, realRequest } from './client'

type ClubPageDto = {
  club: { id: string; name: string; initials: string; logoUrl: string | null; city: string }
  signedIn: boolean
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
 * P-CLUB-PAGE / P-CLUB-MEMBERS in real mode: `/api/clubs/[clubId]` (masked on the server). The
 * invite code is not stored yet (#707), so Join this club opens the plain club link. Null on 404.
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
      club: { ...page.club, joinHref: clubJoinHref(page.club.id) },
      signedIn: page.signedIn,
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
