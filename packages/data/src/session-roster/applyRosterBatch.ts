import { flushSessionPresence } from '../batch/flushBatches'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { dispatch } from '../outbox/dispatch'
import type { SaveOutcome } from '../sync/sync.types'
import type { getSessionRoster } from './fetchers'
import {
  addDirectoryPlayerChange,
  addNewPlayerChange,
  addSavedPlayerChange,
  declineJoinRequestChange,
  removeRosterPlayerChange,
  settleRoster,
} from './mutations'
import { confirmRequestChange } from './requestDecisions'
import type { RosterBatchOperation, RosterBatchResult } from './sessionRoster.types'

export type RosterBatchOutcome = SaveOutcome & {
  data: {
    results: RosterBatchResult[]
    /** Real mode replies with the roster as saved now; the mock refetches instead. */
    roster?: Awaited<ReturnType<typeof getSessionRoster>>
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One Roster sync entry per flushed burst: the single change's own text, or the counts. */
export function rosterBatchSummary(operations: RosterBatchOperation[], texts: string[]) {
  if (operations.length === 1 && texts[0]) return texts[0]
  const count = (op: RosterBatchOperation['op']) => operations.filter((o) => o.op === op).length
  const added = count('add'),
    removed = count('remove'),
    confirmed = count('acceptRequest'),
    declined = count('declineRequest')
  return [
    added ? `${plural(added, 'player')} added` : '',
    removed ? `${removed} removed` : '',
    confirmed ? `${plural(confirmed, 'request')} confirmed` : '',
    declined ? `${declined} declined` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

function applyOne(s: MockState, sessionId: string, operation: RosterBatchOperation) {
  switch (operation.op) {
    case 'add': {
      const { data, text } =
        operation.source === 'saved'
          ? addSavedPlayerChange(s, { ...operation, sessionId })
          : operation.source === 'directory'
            ? addDirectoryPlayerChange(s, { ...operation, sessionId })
            : addNewPlayerChange(s, { ...operation, sessionId })
      return { text, result: placed(s, sessionId, operation.operationId, data.clubPlayerId) }
    }
    case 'acceptRequest': {
      const { data, text } = confirmRequestChange(s, operation)
      return { text, result: placed(s, sessionId, operation.operationId, data.clubPlayerId) }
    }
    case 'remove':
      return {
        text: removeRosterPlayerChange(s, { sessionId, rosterId: operation.rosterId }).text,
        result: empty(operation.operationId),
      }
    case 'declineRequest':
      return {
        text: declineJoinRequestChange(s, operation.requestId).text,
        result: empty(operation.operationId),
      }
  }
}

const empty = (operationId: string): RosterBatchResult => ({
  operationId,
  rosterId: null,
  waitlistId: null,
  clubPlayerId: null,
})

/** Where the placed club player ended up in this session: a roster row or a waitlist entry. */
function placed(
  s: MockState,
  sessionId: string,
  operationId: string,
  clubPlayerId: string,
): RosterBatchResult {
  return {
    operationId,
    rosterId:
      s.roster.find((r) => r.sessionId === sessionId && r.clubPlayerId === clubPlayerId)?.id ??
      null,
    waitlistId:
      s.waitlist.find((w) => w.sessionId === sessionId && w.clubPlayerId === clubPlayerId)?.id ??
      null,
    clubPlayerId,
  }
}

/**
 * The roster burst batch (#718) as one write: every operation in click order, all or nothing. In
 * real mode one Route Handler call in one transaction; in the mock one `queueMutation` with one
 * Roster sync entry, which saves offline on a downloaded session like other roster writes and is
 * refused offline without one.
 */
export async function applyRosterBatch(input: {
  sessionId: string
  operations: RosterBatchOperation[]
}): Promise<RosterBatchOutcome> {
  if (!input.operations.length)
    return { savedOffline: false, message: 'No roster changes', data: { results: [] } }
  // Pending presence lands first; not rosterMutation, whose preflight flush would wait for this batch.
  await flushSessionPresence(input.sessionId)
  return dispatch('roster.batch', input, () =>
    queueMutation({ area: 'Roster', sessionId: input.sessionId }, (s) => {
      const results: RosterBatchResult[] = []
      const texts: string[] = []
      for (const operation of input.operations) {
        const { text, result } = applyOne(s, input.sessionId, operation)
        texts.push(text)
        results.push(result)
      }
      settleRoster(s, input.sessionId, null)
      return { data: { results }, text: rosterBatchSummary(input.operations, texts) }
    }),
  )
}
