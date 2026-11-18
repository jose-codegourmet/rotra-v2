import 'server-only'
import type { Prisma, SocialProvider } from '../generated/prisma/client'

/**
 * What a club entered about its own unclaimed player besides the name, nickname and level
 * (D-2026-11-16-04): playing style, experience and links. Each club keeps its own version and no
 * club is shown another club's. Stored, with no new column, as the club's private operator intake
 * (`club_player_private_inputs.preset_fields`, "preset identity fields typed by the operator"),
 * versioned so a later shape can be told apart. Never in a public read or another club's read.
 */
export const OWN_DETAILS_VERSION = 1

export type ClubOwnDetails = {
  playingStyle: string
  /** A snapshot at `experienceRecordedAt`; the shown count keeps going (as on `players`) */
  experienceMonths: number | null
  experienceRecordedAt: Date | null
  socialLinks: Record<SocialProvider, string>
}

const SOCIAL: SocialProvider[] = ['facebook', 'instagram', 'youtube', 'linkedin']

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** Reads the stored details; anything missing or malformed reads as not entered. */
export function readOwnDetails(stored: Prisma.JsonValue | null | undefined): ClubOwnDetails {
  const raw =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {}
  const links =
    raw.socialLinks && typeof raw.socialLinks === 'object' && !Array.isArray(raw.socialLinks)
      ? (raw.socialLinks as Record<string, unknown>)
      : {}
  const months = raw.experienceMonths
  const recordedAt = text(raw.experienceRecordedAt)
  return {
    playingStyle: text(raw.playingStyle),
    experienceMonths: typeof months === 'number' && Number.isInteger(months) ? months : null,
    experienceRecordedAt: recordedAt ? new Date(recordedAt) : null,
    socialLinks: Object.fromEntries(SOCIAL.map((p) => [p, text(links[p])])) as Record<
      SocialProvider,
      string
    >,
  }
}

/** The JSON stored for these details. */
export function ownDetailsJson(details: ClubOwnDetails): Prisma.InputJsonValue {
  return {
    version: OWN_DETAILS_VERSION,
    playingStyle: details.playingStyle,
    experienceMonths: details.experienceMonths,
    experienceRecordedAt: details.experienceRecordedAt?.toISOString() ?? null,
    socialLinks: details.socialLinks,
  }
}
