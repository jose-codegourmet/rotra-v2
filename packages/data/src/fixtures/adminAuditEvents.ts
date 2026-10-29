import type { AdminAuditEvent } from '../admin-audit/adminAudit.types'
import { adminAccount } from './adminAccounts'
import { clubs } from './clubs'

function clubId(username: string): string {
  const club = clubs.find((entry) => entry.username === username)
  if (!club) throw new Error('An audit fixture references a missing club.')
  return club.id
}

const clubEvent = (id: string, username: string, at: string, text: string): AdminAuditEvent => ({
  id,
  actor: adminAccount.email,
  targetType: 'club',
  targetId: clubId(username),
  at,
  text,
})

/**
 * The club entries of rotra-admin.html `seedLog()`, newest first. The prototype's contact request
 * entries name prototype-only players and requests that the shared player pool does not have, so
 * they are left out until the contact review fixtures exist.
 */
export const adminAuditEvents: AdminAuditEvent[] = [
  clubEvent(
    'audit-0005',
    'tagbilaran.circle',
    '2026-10-20T15:00:00+08:00',
    'Set up the club account tagbilaran.circle.',
  ),
  clubEvent(
    'audit-0004',
    'sampaloc.shuttle',
    '2026-10-10T09:00:00+08:00',
    'Renewed license: Monthly, Oct 10 – Nov 9, 2026 · ₱1,500 · LIC-0014.',
  ),
  clubEvent(
    'audit-0003',
    'itpark.badminton',
    '2026-10-03T10:00:00+08:00',
    'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009.',
  ),
  clubEvent(
    'audit-0002',
    'itpark.badminton',
    '2026-08-03T11:00:00+08:00',
    'Renewed license: Monthly, Aug 3 – Sep 2, 2026. Public pages restored; deletion countdown from Jul 1 cancelled.',
  ),
  clubEvent(
    'audit-0001',
    'lahug.smash',
    '2026-04-01T09:00:00+08:00',
    'Renewed license: Yearly, Apr 1, 2026 – Mar 31, 2027 · ₱15,000 · LIC-0004.',
  ),
]
