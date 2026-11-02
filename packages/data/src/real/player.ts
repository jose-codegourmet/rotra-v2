import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
import type { PlayerProfile, PlayerRank, PlayerSessionRecord } from '../player/player.types'
import type { MyAccount } from '../player-account/playerAccount.types'
import { RealRequestError, realRequest } from './client'

/** A public read that answers 404 is a missing player (null), never an error state. */
async function orNull<T>(read: Promise<T>, statuses = [404]): Promise<T | null> {
  try {
    return await read
  } catch (error) {
    if (error instanceof RealRequestError && statuses.includes(error.status)) return null
    throw error
  }
}

// ---------- Public reads (P-PUBLIC-PROFILE, P-RANK-DETAIL, P-MATCH-HISTORY, /find) ----------

export async function realGetPlayerProfile(playerId: string, signal?: AbortSignal) {
  const body = await orNull(
    realRequest<{ profile: PlayerProfile }>(`/api/players/${encodeURIComponent(playerId)}`, {
      signal,
    }),
  )
  return body?.profile ?? null
}

/** The stored projection only; null is "no rank yet". No rank formula is approved (#247). */
export async function realGetPlayerRank(playerId: string, signal?: AbortSignal) {
  const { rank } = await realRequest<{ rank: PlayerRank | null }>(
    `/api/players/${encodeURIComponent(playerId)}/rank`,
    { signal },
  )
  return rank
}

export async function realGetPlayerGames(playerId: string, signal?: AbortSignal) {
  const { games } = await realRequest<{ games: PlayerSessionRecord[] }>(
    `/api/players/${encodeURIComponent(playerId)}/games`,
    { signal },
  )
  return games
}

export async function realFindPlayerByRtrId(rtrId: string, signal?: AbortSignal) {
  return orNull(
    realRequest<{ playerId: string }>(
      `/api/rtr-ids/${encodeURIComponent(rtrId.trim().toUpperCase())}`,
      { signal },
    ),
  )
}

// ---------- Own account (P-OWN-PROFILE, P-EDIT-PROFILE, P-PHONE-PRIVACY) ----------

type WireMyAccount = MyAccount & { revision: string }

/**
 * The player revision of the account the screen last loaded (or last saved). Saves send it as the
 * expected revision, so an edit made elsewhere since then is a conflict, not an overwrite. Empty
 * before any account read, which the server refuses.
 */
let loadedRevision = ''

function myAccountOf(account: WireMyAccount): MyAccount {
  loadedRevision = account.revision
  return {
    playerId: account.playerId,
    phone: account.phone,
    email: account.email,
    phoneHidden: account.phoneHidden,
  }
}

/** Signed out (or not a player account) is null, like the mock; never a public read. */
export async function realGetMyAccount(signal?: AbortSignal) {
  const body = await orNull(
    realRequest<{ account: WireMyAccount }>('/api/me/account', { signal }),
    [401, 403],
  )
  return body ? myAccountOf(body.account) : null
}

/** Strict like the mock: phone, email, the RTR ID or rank in the input are rejected. */
export async function realUpdateMyProfile(input: PersonalProfileValues) {
  const values = personalProfileSchema.parse(input)
  const number = (typed: string) => (typed ? Number(typed) : null)
  const { profile, revision } = await realRequest<{ profile: PlayerProfile; revision: string }>(
    '/api/me/profile',
    {
      method: 'PATCH',
      body: {
        expectedRevision: loadedRevision,
        fullName: values.fullName,
        nickname: values.nickname,
        playingStyle: values.playingStyle,
        experienceYears: number(values.experienceYears),
        experienceMonths: number(values.experienceMonths),
        socialLinks: {
          facebook: values.facebook,
          instagram: values.instagram,
          youtube: values.youtube,
          linkedin: values.linkedin,
        },
      },
      fields: { experience: 'experienceYears' },
    },
  )
  loadedRevision = revision
  return profile
}

export async function realSetPhonePrivacy(input: { phoneHidden: boolean }) {
  const { account } = await realRequest<{ account: WireMyAccount }>('/api/me/phone-privacy', {
    method: 'POST',
    body: { phoneHidden: input.phoneHidden, expectedRevision: loadedRevision },
  })
  return myAccountOf(account)
}
