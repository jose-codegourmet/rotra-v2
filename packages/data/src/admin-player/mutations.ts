import {
  ADMIN_PLAYER_REASON_REQUIRED,
  ADMIN_PLAYER_RTR_ID_TAKEN,
  type AdminPlayerCreateValues,
  adminPlayerCreateSchema,
  adminPlayerEditSchemaFor,
} from '@rotra/schema/admin-player'
import type {
  AdminAccountVerification,
  SetAdminVerificationOverrideInput,
} from '../account-verification/accountVerification.types'
import { adminAccountVerificationIn } from '../account-verification/mockVerification'
import { parseAdminSession, readAdminSessionMarker } from '../admin-account/cookie'
import { getAdminSession } from '../admin-account/fetchers'
import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { normalizeContact } from '../contact-change-request/contactChangeRequest.rules'
import { supersedeOpenContactRequests } from '../contact-change-request/fetchers'
import { adminAccount } from '../fixtures/adminAccounts'
import { createAdminVerifiedNotification } from '../fixtures/playerNotifications'
import { checkMockSave } from '../mock/bridge'
import { ConflictError, MockError } from '../mock/errors'
import { type MockState, readMockState } from '../mock/store'
import { allocateMockRtrId, replaceRtrId } from '../player/unclaimed'
import { realSetAdminVerificationOverride } from '../real/account-verification'
import { realCreateAdminPlayer, realUpdateAdminPlayer } from '../real/admin-players'
import { isRealDataMode } from '../real/mode'
import {
  adminPlayerChangedFields,
  adminPlayerEditedSummary,
  adminPlayerRtrIdChange,
  adminPlayerSavedMessage,
} from './adminPlayer.rules'
import type {
  AdminPlayer,
  AdminPlayerBulkResult,
  AdminPlayerChangedField,
  AdminPlayerEditInput,
  AdminPlayerEditResult,
} from './adminPlayer.types'
import { adminPlayerEditOf, adminPlayerOf, getAdminPlayerEdit } from './fetchers'
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
  if (isRealDataMode()) return realCreateAdminPlayer(values)
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
    const id = crypto.randomUUID()
    const rtrId = allocateMockRtrId(draft, `PH-${values.place}`)
    const player = { id, fullName: values.name, nickname: values.nickname || null, rtrId }
    draft.players.push(player)
    draft.playerProfiles.push({
      ...player,
      playerId: id,
      // New profiles default to Private (D-2026-11-12-01).
      profileVisibility: 'private',
      hiddenFromDirectory: false,
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
/** The order Save changes reports field errors in; the form focuses the first (rotra-admin.html peErrors()). */
const EDIT_ERROR_ORDER = [
  'picture',
  'name',
  'nickname',
  'playingStyle',
  'experienceYears',
  'experienceMonths',
  'facebook',
  'instagram',
  'youtube',
  'linkedin',
  'profilePrivate',
  'phoneHidden',
  'phone',
  'email',
  'password',
  'registrationPlace',
  'registrationDate',
  'reason',
] as const
const NO_CONTACT_RECORD = 'This player has no contact record yet.'
const STALE_EDIT = 'This player changed since you opened the form. Reload before editing.'

function editErrors(errors: Record<string, string>) {
  const keys = EDIT_ERROR_ORDER.filter((key) => errors[key])
  const ordered = Object.fromEntries(keys.map((key) => [key, errors[key] as string]))
  const first = keys[0]
  return new MockError('conflict', first ? (errors[first] as string) : 'Check the form.', ordered)
}

/** An unchanged picture is never rechecked (a stored reference may predate the picture rules). */
const checkedForm = (
  form: Omit<AdminPlayerEditInput, 'id' | 'revision'>,
  changed: AdminPlayerChangedField[],
) => (changed.includes('profile picture') ? form : { ...form, picture: null })

/**
 * Validates one Save changes against a store snapshot or draft: the revision, the field rules, the
 * rules that depend on the player, uniqueness, the shown character and the reason. Throws every
 * field error at once; returns the parsed values (never logged: they include the password), the
 * changed fields and, when the registration place or date changed it, the new RTR ID. A new RTR
 * ID that another player already has is refused on the registration date (D-2026-11-16-04).
 */
function planEdit(state: MockState, input: AdminPlayerEditInput) {
  const player = state.players.find((p) => p.id === input.id)
  if (!player) throw new MockError('conflict', 'Player not found. Reload the list.')
  const edit = adminPlayerEditOf(state, player)
  if (edit.revision !== input.revision) throw new MockError('conflict', STALE_EDIT)
  const { id: _id, revision: _revision, ...form } = input
  const changed = adminPlayerChangedFields(edit, form)
  // rotra-admin.html pmSave(): the RTR ID comes after the other fields and before the password.
  const nextRtrId = adminPlayerRtrIdChange(edit, form)
  if (nextRtrId) {
    const password = changed.indexOf('password')
    changed.splice(password < 0 ? changed.length : password, 0, 'RTR ID')
  }
  const errors: Record<string, string> = {}
  const parsed = adminPlayerEditSchemaFor(edit).safeParse(checkedForm(form, changed))
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      errors[key] ??= issue.message
    }
  const values = parsed.success ? parsed.data : undefined
  if (values && changed.includes('profile picture') && values.picture?.startsWith('character:')) {
    const characterId = values.picture.slice('character:'.length)
    if (!state.profileCharacters.some((c) => c.id === characterId && c.shown))
      errors.picture = 'Choose a character.'
  }
  const others = state.playerAccounts.filter((a) => a.playerId !== player.id)
  if (values && changed.includes('phone')) {
    if (!edit.hasAccount) errors.phone = NO_CONTACT_RECORD
    else if (
      values.phone &&
      others.some((a) => normalizeContact('phone', a.phone) === values.phone)
    )
      errors.phone = 'This phone number is already linked to another player.'
  }
  if (values && changed.includes('email')) {
    if (!edit.hasAccount) errors.email = NO_CONTACT_RECORD
    else if (
      values.email &&
      others.some(
        (a) => normalizeContact('email', a.email) === normalizeContact('email', values.email),
      )
    )
      errors.email = 'This email is already linked to another player.'
  }
  if (values && changed.includes('phone privacy') && !edit.hasAccount)
    errors.phoneHidden = NO_CONTACT_RECORD
  if (nextRtrId && state.players.some((p) => p.id !== player.id && p.rtrId === nextRtrId))
    errors.registrationDate ??= ADMIN_PLAYER_RTR_ID_TAKEN
  if (changed.length && !form.reason.trim()) errors.reason ??= ADMIN_PLAYER_REASON_REQUIRED
  if (Object.keys(errors).length || !values) throw editErrors(errors)
  return { player, edit, values, changed, nextRtrId }
}

const editResult = (
  player: AdminPlayer,
  changed: AdminPlayerChangedField[],
): AdminPlayerEditResult => ({
  player,
  changed,
  passwordSet: changed.includes('password'),
  message: adminPlayerSavedMessage(player.name, changed),
})

/** Sets or clears Verified by Admin. Both changes need a reason and create one audit event. */
export async function setAdminVerificationOverride(
  input: SetAdminVerificationOverrideInput,
): Promise<AdminAccountVerification> {
  if (isRealDataMode()) return realSetAdminVerificationOverride(input)
  await owner()
  const overrideReason = reason(input.reason)
  return adminMutation(400, (draft) => {
    const session = parseAdminSession(readAdminSessionMarker())
    if (session.kind !== 'owner')
      throw new MockError('permission', 'Only ROTRA Admin can change player verification.')
    const current = adminAccountVerificationIn(draft, input.playerId)
    if (!current)
      throw new MockError('permission', 'Verification is available only for registered players.')
    if (current.revision !== input.revision) throw new ConflictError(current, STALE_EDIT)
    if (current.verifiedByAdmin === input.verifiedByAdmin) return current

    checkMockSave()
    const { player, record: management } = record(draft, input.playerId)
    const at = new Date().toISOString()
    management.verificationOverride = input.verifiedByAdmin
      ? { status: 'verified', adminId: session.account.id, at }
      : null
    management.revision++
    if (input.verifiedByAdmin) {
      const notifications = draft.playerNotifications[player.id] ?? []
      draft.playerNotifications[player.id] = notifications
      notifications.push(
        createAdminVerifiedNotification(`admin-verified-${management.revision}`, at),
      )
    }
    const action = input.verifiedByAdmin
      ? 'player_verification_override_set'
      : 'player_verification_override_cleared'
    const description = input.verifiedByAdmin
      ? `Set ${player.fullName} to Verified by Admin.`
      : `Cleared Verified by Admin for ${player.fullName}.`
    appendAdminAudit(draft, {
      action,
      targetType: 'player',
      targetId: player.id,
      summary: `${description} Reason: ${overrideReason}`,
    })
    return {
      ...current,
      verified: input.verifiedByAdmin || current.completedSteps === 3,
      verifiedByAdmin: input.verifiedByAdmin,
      revision: management.revision,
    }
  })
}

/**
 * Admin › Players › Edit › Save changes (A07.6, D-2026-11-09-14): every field the player can change,
 * plus phone and email (applied directly; no contact-change request) and the beta-only password.
 * Revision-checked. "Nothing changed." saves nothing, logs nothing and keeps the revision, offline
 * too (as the prototype). Otherwise one Activity log entry "Edited <name>: <fields>. Reason: …".
 *
 * RTR ID (D-2026-11-16-04): a changed registration place or date changes the RTR ID, which keeps
 * its number at the end. The change cascades to every record and snapshot that holds the old RTR
 * ID, in every club that saved the player; there is no alias, so the old one no longer finds them.
 * The entry then reads "Edited <name>: RTR ID. RTR ID <old> replaced with <new> on every record.
 * Reason: …" and the toast "Saved <name>: RTR ID.". The screen confirms first (Change RTR ID?).
 *
 * Password *(for MVP or beta only)* — beta only, end date not set (D-2026-11-09-14): never stored,
 * returned, logged or put in the audit summary; only that Admin set it, by whom and when.
 */
export async function updateAdminPlayer(
  input: AdminPlayerEditInput,
): Promise<AdminPlayerEditResult> {
  await owner()
  if (isRealDataMode()) return realEditAdminPlayer(input)
  const plan = planEdit(readMockState(), input)
  if (!plan.changed.length) return editResult(plan.edit, [])
  return adminMutation(400, (draft) => {
    checkMockSave()
    // Rechecked on the draft: another save may have landed during the round trip.
    const { player, edit, values, changed, nextRtrId } = planEdit(draft, input)
    const current = record(draft, player.id)
    if (!changed.length) return editResult(edit, [])
    const has = (field: AdminPlayerChangedField) => changed.includes(field)
    const profile = draft.playerProfiles.find((p) => p.playerId === player.id)
    if (!profile) throw new MockError('conflict', 'Player not found. Reload the list.')
    const account = draft.playerAccounts.find((a) => a.playerId === player.id)
    if (has('name') || has('nickname')) {
      const name = values.name
      const nickname = has('nickname') ? values.nickname || null : player.nickname
      player.fullName = name
      player.nickname = nickname
      profile.fullName = name
      profile.nickname = nickname
      const rank = draft.playerRanks[player.id]
      if (rank) {
        rank.fullName = name
        rank.nickname = nickname
      }
      for (const club of draft.clubPlayers.filter((p) => p.playerId === player.id)) {
        club.fullName = name
        if (has('nickname')) club.nickname = nickname
      }
    }
    if (has('profile picture')) {
      // rotra-admin.html pmSave(): on any picture change the old picture (photo, character or
      // initials) becomes the previous picture. Admin save only; the player's own picker keeps
      // its rule (D-2026-11-09-10). The store has no "initials" previous: null means none.
      if (account) account.avatarPreviousRef = profile.picture
      profile.picture = values.picture
    }
    if (has('playing style')) profile.playingStyle = values.playingStyle
    if (has('experience')) {
      profile.experienceYears =
        values.experienceYears === '' ? null : Number(values.experienceYears)
      profile.experienceMonths =
        values.experienceMonths === '' ? null : Number(values.experienceMonths)
    }
    profile.socialLinks = {
      facebook: values.facebook,
      instagram: values.instagram,
      youtube: values.youtube,
      linkedin: values.linkedin,
    }
    if (has('private profile')) {
      // Off makes the profile public; on makes it private unless the player chose always private.
      profile.profileVisibility = !values.profilePrivate
        ? 'public'
        : profile.profileVisibility === 'always_private'
          ? 'always_private'
          : 'private'
    }
    if (account) {
      if (has('phone privacy')) account.phoneHidden = values.phoneHidden
      if (has('phone')) account.phone = values.phone
      if (has('email')) account.email = values.email
    }
    if (has('password')) {
      // The password itself goes nowhere in the mock (Supabase Auth in the backend follow-up).
      current.record.passwordSetAt = new Date().toISOString()
      current.record.passwordSetBy = adminAccount.email
    }
    const rtrIdFrom = player.rtrId
    if (nextRtrId) replaceRtrId(draft, rtrIdFrom, nextRtrId)
    if (current.view.claimed) profile.adminChangeNote = values.reason
    current.record.revision++
    appendAdminAudit(draft, {
      action: 'player_updated',
      targetType: 'player',
      targetId: player.id,
      summary: adminPlayerEditedSummary(
        values.name,
        changed,
        values.reason,
        nextRtrId ? { from: rtrIdFrom, to: nextRtrId } : null,
      ),
    })
    // Owner answer on #649 (Option A): a stale open request for the same field can't be approved later.
    if (has('phone')) supersedeOpenContactRequests(draft, player.id, 'phone')
    if (has('email')) supersedeOpenContactRequests(draft, player.id, 'email')
    return editResult(adminPlayerOf(draft, player), changed)
  })
}

/**
 * Real mode keeps its name/nickname PATCH until the backend follow-up: the same checks against the
 * real read, "Nothing changed." as in mock mode, and any other changed field is not connected yet.
 */
async function realEditAdminPlayer(input: AdminPlayerEditInput): Promise<AdminPlayerEditResult> {
  const edit = await getAdminPlayerEdit(input.id)
  if (!edit) throw new MockError('conflict', 'Player not found. Reload the list.')
  if (edit.revision !== input.revision) throw new MockError('conflict', STALE_EDIT)
  const { id: _id, revision: _revision, ...form } = input
  // A changed registration place or date reissues the RTR ID on the server (P15.8): it replaces
  // the old one on every record, and a taken one is refused on the registration date.
  const rtrIdChanged = !!adminPlayerRtrIdChange(edit, form)
  const changed = adminPlayerChangedFields(edit, form)
  if (rtrIdChanged) changed.push('RTR ID')
  const parsed = adminPlayerEditSchemaFor(edit).safeParse(checkedForm(form, changed))
  const errors: Record<string, string> = {}
  if (!parsed.success)
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? '')] ??= issue.message
  if (changed.length && !form.reason.trim()) errors.reason ??= ADMIN_PLAYER_REASON_REQUIRED
  if (Object.keys(errors).length || !parsed.success) throw editErrors(errors)
  if (!changed.length) return editResult(edit, [])
  return realUpdateAdminPlayer(input)
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
