import {
  type AdminPlayerCreateValues,
  type AdminPlayerEditValues,
  adminPlayerCreateSchema,
  adminPlayerEditSchema,
} from '@rotra/schema/admin-player'
import { getAdminSession } from '../admin-account/fetchers'
import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import type { AdminPlayerBulkResult } from './adminPlayer.types'
import { adminPlayerOf } from './fetchers'
import { duplicateGroups } from './management.rules'

async function owner() {
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can change player records.')
}
function record(state: MockState, id: string) {
  const player = state.players.find((p) => p.id === id)
  if (!player) throw new MockError('conflict', 'Player not found. Reload the list.')
  const view = adminPlayerOf(state, player)
  state.adminPlayerRecords[id] ??= {
    archivedAt: null,
    revision: 1,
    createdByClubId: view.createdByClubId,
    adminCreated: false,
  }
  return { player, view, record: state.adminPlayerRecords[id] }
}
function reason(value: string) {
  if (!value.trim()) throw new MockError('conflict', 'Enter a reason.')
  return value.trim()
}
export async function createAdminPlayer(input: AdminPlayerCreateValues) {
  await owner()
  const values = adminPlayerCreateSchema.parse(input)
  return adminMutation(400, (draft) => {
    checkMockSave()
    const matches = duplicateGroups([
      ...draft.players.map((p) => adminPlayerOf(draft, p)),
      { id: 'new', name: values.name, phone: values.phone, email: values.email },
    ]).find((g) => g.ids.includes('new'))
    if (matches && !values.allowDuplicate)
      throw new MockError(
        'conflict',
        `${matches.reasons.join(', ')}: ${matches.ids
          .filter((id) => id !== 'new')
          .map((id) => draft.players.find((p) => p.id === id)?.rtrId)
          .join(', ')}. Review matches, then Create anyway.`,
      )
    if (values.clubId && !draft.clubs.some((c) => c.id === values.clubId))
      throw new MockError('conflict', 'Choose an available club.')
    const id = crypto.randomUUID(),
      day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
    const [year, month, date] = day.split('-'),
      prefix = `RTR-PH-${values.place}-${month}${date}${year?.slice(2)}-`
    const serial =
      Math.max(
        0,
        ...draft.players
          .filter((p) => p.rtrId.startsWith(prefix))
          .map((p) => Number(p.rtrId.split('-')[4]) || 0),
      ) + 1
    const rtrId = prefix + String(serial).padStart(4, '0')
    const player = { id, fullName: values.name, nickname: values.nickname || null, rtrId }
    draft.players.push(player)
    draft.playerProfiles.push({
      ...player,
      playerId: id,
      picture: null,
      playingStyle: '',
      experienceYears: null,
      experienceMonths: null,
      socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
    })
    draft.playerAccounts.push({
      playerId: id,
      phone: values.phone,
      email: values.email,
      claimed: false,
      phoneHidden: false,
    })
    draft.adminPlayerRecords[id] = {
      archivedAt: null,
      revision: 1,
      createdByClubId: values.clubId || null,
      adminCreated: true,
    }
    if (values.clubId)
      draft.clubPlayers.push({
        id: crypto.randomUUID(),
        clubId: values.clubId,
        playerId: id,
        fullName: values.name,
        nickname: values.nickname || null,
        identity: 'unclaimed',
        playingLevel: null,
        addedAt: Date.now(),
      })
    appendAdminAudit(draft, {
      action: 'player_created',
      targetType: 'player',
      targetId: id,
      summary: `Created ${values.name} (${rtrId}) by ROTRA Admin.`,
    })
    return adminPlayerOf(draft, player)
  })
}
export async function updateAdminPlayer(
  input: Omit<AdminPlayerEditValues, 'email'> & { id: string; revision: number },
) {
  await owner()
  // A new email is never saved here: it goes for review as a contact-change request (#564).
  const values = adminPlayerEditSchema.omit({ email: true }).parse(input)
  return adminMutation(400, (draft) => {
    checkMockSave()
    const current = record(draft, input.id)
    if (current.record.revision !== input.revision)
      throw new MockError(
        'conflict',
        'This player changed since you opened the form. Reload before editing.',
      )
    if (current.view.claimed && values.picture !== (current.view.picture ?? ''))
      throw new MockError('permission', 'Photos for registered players cannot be edited by Admin.')
    const before = JSON.stringify({
      name: current.view.name,
      nickname: current.view.nickname,
      picture: current.view.picture,
    })
    current.player.fullName = values.name
    current.player.nickname = values.nickname || null
    const profile = draft.playerProfiles.find((p) => p.playerId === input.id)
    if (profile) {
      profile.fullName = values.name
      profile.nickname = values.nickname || null
      profile.picture = values.picture || null
      if (current.view.claimed) profile.adminChangeNote = values.reason
    }
    const rank = draft.playerRanks[input.id]
    if (rank) {
      rank.fullName = values.name
      rank.nickname = values.nickname || null
    }
    for (const club of draft.clubPlayers.filter((p) => p.playerId === input.id)) {
      club.fullName = values.name
      club.nickname = values.nickname || null
    }
    current.record.revision++
    appendAdminAudit(draft, {
      action: 'player_updated',
      targetType: 'player',
      targetId: input.id,
      summary: `Changed by ROTRA Admin: ${before} → ${JSON.stringify({ name: values.name, nickname: values.nickname || null, picture: values.picture || null })}. Reason: ${values.reason}`,
    })
    return adminPlayerOf(draft, current.player)
  })
}
export async function changeAdminPlayers(input: {
  ids: string[]
  action: 'archive' | 'restore' | 'remove'
  reason: string
  confirmations?: Record<string, string>
}) {
  await owner()
  reason(input.reason)
  const results: AdminPlayerBulkResult[] = []
  for (const id of [...new Set(input.ids)]) {
    try {
      const result = await adminMutation(100, (draft) => {
        checkMockSave()
        const current = record(draft, id)
        if (input.action === 'remove') {
          if (current.view.removalReason)
            throw new MockError('conflict', current.view.removalReason)
          if (input.confirmations?.[id] !== current.player.rtrId)
            throw new MockError('conflict', 'Type the RTR ID to confirm removal.')
          draft.players = draft.players.filter((p) => p.id !== id)
          draft.playerProfiles = draft.playerProfiles.filter((p) => p.playerId !== id)
          draft.playerAccounts = draft.playerAccounts.filter((p) => p.playerId !== id)
          draft.clubPlayers = draft.clubPlayers.filter((p) => p.playerId !== id)
          for (const [token, link] of Object.entries(draft.claimLinks))
            if (link.playerId === id) delete draft.claimLinks[token]
          delete draft.adminPlayerRecords[id]
        } else {
          current.record.archivedAt = input.action === 'archive' ? new Date().toISOString() : null
          current.record.revision++
        }
        appendAdminAudit(draft, {
          action:
            input.action === 'archive'
              ? 'player_archived'
              : input.action === 'restore'
                ? 'player_restored'
                : 'player_removed',
          targetType: 'player',
          targetId: id,
          summary: `${input.action === 'archive' ? 'Archived' : input.action === 'restore' ? 'Restored' : 'Removed'} ${current.player.fullName} (${current.player.rtrId}). Reason: ${input.reason.trim()}`,
        })
        return { id, name: current.player.fullName, success: true }
      })
      results.push(result)
    } catch (error) {
      results.push({
        id,
        name: id,
        success: false,
        error: error instanceof Error ? error.message : 'Could not save.',
      })
    }
  }
  return results
}
export const archiveAdminPlayers = (input: { ids: string[]; reason: string }) =>
  changeAdminPlayers({ ...input, action: 'archive' })
export const restoreAdminPlayers = (input: { ids: string[]; reason: string }) =>
  changeAdminPlayers({ ...input, action: 'restore' })
export const removeAdminPlayers = (input: {
  ids: string[]
  reason: string
  confirmations: Record<string, string>
}) => changeAdminPlayers({ ...input, action: 'remove' })
export async function issueRegistrationLink(id: string) {
  await owner()
  return adminMutation(300, (draft) => {
    checkMockSave()
    const current = record(draft, id)
    if (current.view.claimed) throw new MockError('conflict', 'Already registered')
    if (current.view.archivedAt) throw new MockError('conflict', 'Restore this player first.')
    for (const link of Object.values(draft.claimLinks))
      if (link.playerId === id) link.status = 'expired'
    const token = crypto.randomUUID(),
      expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
    draft.claimLinks[token] = {
      playerId: id,
      clubName: 'ROTRA Admin',
      status: 'valid',
      checks: 0,
      expiresAt,
    }
    appendAdminAudit(draft, {
      action: 'player_link_issued',
      targetType: 'player',
      targetId: id,
      summary: `Registration link issued by ROTRA Admin (${current.player.rtrId}); expires ${expiresAt}.`,
    })
    return { token, expiresAt }
  })
}
