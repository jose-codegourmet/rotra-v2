import 'server-only'
import type { PlayerNotificationKind, Prisma, QueueSession } from '../generated/prisma/client'

type Tx = Prisma.TransactionClient
type Event = {
  playerId: string
  kind: PlayerNotificationKind
  sourceType: string
  sourceId: string
  title: string
  body: string
  target: string
}

/** A guest or unclaimed profile has no inbox. The source transaction owns delivery and retries. */
export async function writePlayerNotifications(tx: Tx, events: Event[]) {
  if (!events.length) return
  const accounts = await tx.playerAccount.findMany({
    where: { playerId: { in: [...new Set(events.map((event) => event.playerId))] } },
    select: { playerId: true },
  })
  const recipients = new Set(accounts.map((account) => account.playerId))
  const data = events.filter((event) => recipients.has(event.playerId))
  if (data.length) await tx.playerNotification.createMany({ data, skipDuplicates: true })
}

const time = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  hour: 'numeric',
  minute: '2-digit',
})
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short' })

export async function notifySpotConfirmed(
  tx: Tx,
  session: QueueSession,
  playerId: string | null,
  assessmentId: string,
) {
  if (!playerId) return
  const club = await tx.club.findUniqueOrThrow({
    where: { id: session.clubId },
    select: { name: true },
  })
  const day = weekday.format(session.scheduledStartAt)
  const hours = time
    .formatRange(session.scheduledStartAt, session.scheduledEndAt)
    .replaceAll(/\s*–\s*/g, '–')
    .replaceAll(/\s/g, ' ')
  await writePlayerNotifications(tx, [
    {
      playerId,
      kind: 'session',
      sourceType: 'club_assessment',
      sourceId: assessmentId,
      title: `You're in ${session.title}`,
      body: `${club.name} confirmed your spot. ${day} · ${hours}.`,
      target: `/players/${playerId}/sessions`,
    },
  ])
}

export async function notifyWaitlistPlace(
  tx: Tx,
  session: QueueSession,
  playerId: string | null,
  waitlistId: string,
  position: number,
) {
  if (!playerId) return
  await writePlayerNotifications(tx, [
    {
      playerId,
      kind: 'session',
      sourceType: 'session_waitlist_entry',
      sourceId: waitlistId,
      title: `You're on the waitlist for ${session.title}`,
      body: `You're number ${position}. We'll tell you if a spot opens.`,
      target: `/players/${playerId}/sessions`,
    },
  ])
}

export async function notifySavedPlayer(
  tx: Tx,
  clubId: string,
  playerId: string,
  operationId: string,
) {
  const club = await tx.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } })
  await writePlayerNotifications(tx, [
    {
      playerId,
      kind: 'club',
      sourceType: 'club_player_add',
      sourceId: operationId,
      title: `${club.name} added you`,
      body: "You're in the club's saved players. You can leave from the club page.",
      target: `/clubs/${clubId}`,
    },
  ])
}

export async function notifyContactReview(
  tx: Tx,
  request: { id: string; playerId: string; field: 'phone' | 'email' },
  decision: 'approved' | 'declined',
) {
  const field = request.field === 'phone' ? 'phone number' : 'email'
  await writePlayerNotifications(tx, [
    {
      playerId: request.playerId,
      kind: 'account',
      sourceType: 'contact_change_request',
      sourceId: request.id,
      title: `Your ${field} change was ${decision}`,
      body: `ROTRA Admin ${decision} the change.`,
      target: '/profile/privacy-and-contact',
    },
  ])
}
