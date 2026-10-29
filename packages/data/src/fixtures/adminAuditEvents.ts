import type {
  AdminAuditAction,
  AdminAuditEvent,
  AdminAuditTargetType,
} from '../admin-audit/adminAudit.types'
import { adminAccount } from './adminAccounts'
import { ADMIN_FIXTURE_NOW } from './adminClubs'
import { clubs } from './clubs'
import { contactRequestFixtureIds } from './contactChangeRequests'

const DAY = 864e5

function clubId(username: string): string {
  const club = clubs.find((entry) => entry.username === username)
  if (!club) throw new Error('An audit fixture references a missing club.')
  return club.id
}

const event = (
  id: string,
  action: AdminAuditAction,
  targetType: AdminAuditTargetType,
  targetId: string,
  at: string,
  summary: string,
): AdminAuditEvent => ({
  id,
  actorEmail: adminAccount.email,
  action,
  targetType,
  targetId,
  at,
  summary,
})

/**
 * All eight entries of rotra-admin.html `seedLog()`, newest first. The club entries are on fixed
 * dates; the three contact request decisions are 1, 3 and 5 days before `now`, as the prototype
 * seeds them. The mock store seeds with the real time; stories use ADMIN_FIXTURE_NOW.
 */
export function createAdminAuditEvents(now: number): AdminAuditEvent[] {
  const ago = (days: number) => new Date(now - days * DAY).toISOString()
  return [
    event(
      'audit-0008',
      'contact_change_approved',
      'contact_change_request',
      contactRequestFixtureIds.r7,
      ago(1),
      'Approved phone number change for Rafa Aquino. Applying failed at the sign-in provider.',
    ),
    event(
      'audit-0007',
      'contact_change_approved',
      'contact_change_request',
      contactRequestFixtureIds.r8,
      ago(3),
      'Approved email change for Bea Castillo. Applied.',
    ),
    event(
      'audit-0006',
      'contact_change_declined',
      'contact_change_request',
      contactRequestFixtureIds.r9,
      ago(5),
      'Declined email change for Iya Mercado.',
    ),
    event(
      'audit-0005',
      'club_created',
      'club',
      clubId('tagbilaran.circle'),
      '2026-10-20T15:00:00+08:00',
      'Set up the club account tagbilaran.circle.',
    ),
    event(
      'audit-0004',
      'license_renewed',
      'club',
      clubId('sampaloc.shuttle'),
      '2026-10-10T09:00:00+08:00',
      'Renewed license: Monthly, Oct 10 – Nov 9, 2026 · ₱1,500 · LIC-0014.',
    ),
    event(
      'audit-0003',
      'license_renewed',
      'club',
      clubId('itpark.badminton'),
      '2026-10-03T10:00:00+08:00',
      'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009.',
    ),
    event(
      'audit-0002',
      'license_renewed',
      'club',
      clubId('itpark.badminton'),
      '2026-08-03T11:00:00+08:00',
      'Renewed license: Monthly, Aug 3 – Sep 2, 2026. Public pages restored; deletion countdown from Jul 1 cancelled.',
    ),
    event(
      'audit-0001',
      'license_renewed',
      'club',
      clubId('lahug.smash'),
      '2026-04-01T09:00:00+08:00',
      'Renewed license: Yearly, Apr 1, 2026 – Mar 31, 2027 · ₱15,000 · LIC-0004.',
    ),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

/** The seeded record as it reads at ADMIN_FIXTURE_NOW (stories). */
export const adminAuditEvents: AdminAuditEvent[] = createAdminAuditEvents(
  ADMIN_FIXTURE_NOW.getTime(),
)
