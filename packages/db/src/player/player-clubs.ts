import 'server-only'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * P-PUBLIC-PROFILE · Clubs (#766, D-2026-11-12-04) public read (`player.public-clubs`): the clubs a
 * player is currently saved in (`club_players` not removed), as id, name, initials and logo only.
 * How they joined never leaves here (the owner reads that from `/api/me/clubs`). It follows the
 * profile read: only a profile with a permanent RTR ID is found, and an always-private profile
 * (D-2026-11-12-01) returns no clubs, since its page shows the private card for everyone else.
 */
export async function readPlayerClubs(playerId: string) {
  if (!UUID.test(playerId)) throw new ServiceError('not_found')
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { profileVisibility: true, idAllocation: { select: { rtrId: true } } },
  })
  if (!player?.idAllocation) throw new ServiceError('not_found')
  if (player.profileVisibility === 'always_private') return []
  const rows = await prisma.clubPlayer.findMany({
    where: { playerId, removedAt: null },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: { club: { select: { id: true, name: true, logoRef: true } } },
  })
  const seen = new Set<string>()
  return rows.flatMap(({ club }) => {
    if (seen.has(club.id)) return []
    seen.add(club.id)
    return [{ id: club.id, name: club.name, initials: initials(club.name), logoUrl: club.logoRef }]
  })
}
