import { withClubNickname } from '../club-player/clubNickname.rules'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { isRealDataMode } from '../real/mode'
import {
  exemptionAddedToast,
  exemptionDiff,
  exemptionOf,
  exemptionRemovedToast,
  exemptionSavedToast,
} from './exemption.rules'
import { queueMasterName } from './match.rules'

function save(sessionId: string, ids: string[], text?: 'diff') {
  if (isRealDataMode())
    throw new MockError('permission', 'The exemption list is not saved in real mode yet.')
  return queueMutation({ area: 'Queue', sessionId }, (s) => {
    const before = exemptionOf(s, sessionId)
    const next = [...new Set(ids)].filter((id) =>
      s.roster.some((r) => r.id === id && r.sessionId === sessionId),
    )
    s.sessionExemptions ??= {}
    s.sessionExemptions[sessionId] = next
    const nameOf = (id: string) => {
      const row = s.roster.find((r) => r.id === id)
      return row ? queueMasterName(withClubNickname(s, row)) : 'Player'
    }
    const { added, removed } = exemptionDiff(before, next)
    // One player changed: name them. Otherwise the saved count (or cleared).
    const toast =
      text === 'diff' && added.length === 1 && !removed.length
        ? exemptionAddedToast(nameOf(added[0] as string))
        : text === 'diff' && removed.length === 1 && !added.length
          ? exemptionRemovedToast(nameOf(removed[0] as string))
          : exemptionSavedToast(next.length)
    return { data: next, text: toast }
  })
}

/** The whole list in one save, as the Exemption list sheet sends it (Save). One change toasts the name. */
export function saveExemptionList(input: { sessionId: string; ids: string[] }) {
  return save(input.sessionId, input.ids, 'diff')
}
/** Add one player (the card's picker): "NAME added to the exemption list". */
export function addToExemptionList(input: { sessionId: string; id: string }) {
  const s = readMockState()
  return save(input.sessionId, [...exemptionOf(s, input.sessionId), input.id], 'diff')
}
/** Take one player off (the chip's remove): "NAME taken off the exemption list". */
export function removeFromExemptionList(input: { sessionId: string; id: string }) {
  const s = readMockState()
  return save(
    input.sessionId,
    exemptionOf(s, input.sessionId).filter((id) => id !== input.id),
    'diff',
  )
}
/** Clear all: "Exemption list cleared". */
export function clearExemptionList(input: { sessionId: string }) {
  return save(input.sessionId, [])
}
