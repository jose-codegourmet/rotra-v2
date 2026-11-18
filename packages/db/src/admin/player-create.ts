import 'server-only'
import { adminPlayerCreateSchema } from '@rotra/schema/admin-player'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { requireAdmin } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'
import { readAdminPlayerDirectory } from './players'

/**
 * Admin › Players › Add player in real mode (owner answer, November 18, 2026): saves the club's
 * unclaimed record (`club_players` plus its private intake), as Queue's Add player does. No global
 * player and no RTR ID: both come at registration, when the phone links the record
 * (D-2026-11-11-03, D-2026-11-12-01). So a club and a phone are required here, and the place is the
 * club's founding location. "Created by Admin" (no club) has nowhere to be saved yet.
 *
 * Beside P15.8 (D-2026-11-16-04, #927) this path is unchanged: it makes no shared entry and
 * allocates no RTR ID, even when an email is typed (the email stays in the private intake). So
 * the record has a phone and no shared entry, which Queue and Admin read as Details required
 * until the club saves an email on it. Whether Add player should make the shared entry is open.
 */
export async function createAdminPlayer(context: AdminContext, input: unknown) {
  requireAdmin(context)
  const parsed = adminPlayerCreateSchema.safeParse(input)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? '')] ??= issue.message
    throw new ServiceError('invalid', fields)
  }
  const values = parsed.data
  if (!values.clubId)
    throw new ServiceError('invalid', {
      clubId: 'Choose a club. A player with no club cannot be saved yet.',
    })
  if (!values.phone)
    throw new ServiceError('invalid', {
      phone: 'Enter a phone number. It links the player when they register.',
    })
  const phone = values.phone
  const email = values.email.toLowerCase() || null
  const id = await prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({
      where: { id: values.clubId },
      select: { id: true, foundingLocation: { select: { cityCode: true, displayName: true } } },
    })
    if (!club) throw new ServiceError('invalid', { clubId: 'Choose an available club.' })
    if (club.foundingLocation.cityCode !== values.place)
      throw new ServiceError('invalid', {
        place: `This club registers players in ${club.foundingLocation.displayName}. Choose that place.`,
      })
    const registered = await tx.playerPrivateContact.findFirst({
      where: { OR: [{ phoneE164: phone }, ...(email ? [{ email }] : [])] },
      select: { phoneE164: true },
    })
    if (registered)
      throw new ServiceError(
        'conflict',
        registered.phoneE164 === phone
          ? { phone: 'This phone number is already linked to another player.' }
          : { email: 'This email is already linked to another player.' },
      )
    const saved = await tx.clubPlayer.findFirst({
      where: { clubId: club.id, removedAt: null, privateInput: { phoneE164: phone } },
      select: { displayName: true },
    })
    if (saved)
      throw new ServiceError('conflict', {
        phone: `${saved.displayName} already has this number in this club.`,
      })
    const now = new Date()
    const record = await tx.clubPlayer.create({
      data: {
        id: crypto.randomUUID(),
        clubId: club.id,
        displayName: values.name,
        nickname: values.nickname || null,
        addedAt: now,
      },
    })
    await tx.clubPlayerPrivateInput.create({
      data: {
        clubPlayerId: record.id,
        clubId: club.id,
        phoneE164: phone,
        email,
        capturedAt: now,
      },
    })
    await recordAudit(tx, context, {
      action: 'player.created',
      targetType: 'player',
      targetId: record.id,
      metadata: { name: values.name, clubId: club.id },
    })
    return record.id
  })
  const [player] = await readAdminPlayerDirectory(context, id)
  if (!player) throw new ServiceError('not_found')
  return player
}
