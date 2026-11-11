import { describe, expect, it } from 'vitest'
import { MockError } from '../mock/errors'
import {
  aliasArgs,
  commandKey,
  createdIdsOf,
  importedToast,
  learnAliases,
  mergeImported,
  nextSeq,
  orderCommands,
  parsePlayHistory,
  pendingChangesOf,
  replayFailureOf,
  serializePlayHistory,
} from './outbox.rules'
import {
  emptyCreatedIds,
  OFFLINE_SAVE_FAILED,
  type OutboxCommand,
  type PlayHistoryFile,
  type StoredCommand,
} from './outbox.types'
import { writeOfflineChange } from './outboxStore'

const account = 'club-1'
const command = (
  operationId: string,
  recordedAt: number,
  extra: Partial<OutboxCommand> = {},
): OutboxCommand => ({
  operationId,
  name: 'match.start',
  args: { matchId: 'm-local', operationId },
  recordedAt,
  sessionId: 's-1',
  text: 'Match 3 started on Court 1',
  area: 'Matches and results',
  localData: null,
  created: emptyCreatedIds(),
  ...extra,
})
const stored = (operationId: string, seq: number): StoredCommand => ({
  ...command(operationId, seq),
  accountId: account,
  seq,
  key: commandKey(account, seq),
})

describe('Outbox › ordering (#722)', () => {
  it('replays in sequence order whatever order storage returns', () => {
    const list = [stored('c', 30), stored('a', 10), stored('b', 20)]
    expect(orderCommands(list).map((c) => c.operationId)).toEqual(['a', 'b', 'c'])
  })

  it('gives the next command a sequence after everything stored and never behind the clock', () => {
    expect(nextSeq([stored('a', 10), stored('b', 20)], 5)).toBe(21)
    expect(nextSeq([stored('a', 10)], 500)).toBe(500)
    expect(nextSeq([], 42)).toBe(42)
  })

  it('keys commands so the account prefix sorts them as a lexicographic range', () => {
    expect(commandKey(account, 7) < commandKey(account, 10)).toBe(true)
    expect(commandKey(account, 7).startsWith(`${account}|`)).toBe(true)
  })
})

describe('Outbox › idempotent import', () => {
  it('skips commands this device already holds and keeps the rest in recorded order after them', () => {
    const existing = [stored('a', 100), stored('b', 200)]
    const merged = mergeImported(
      existing,
      [command('c', 50), command('b', 10), command('d', 40), command('c', 50)],
      account,
      150,
    )
    expect(merged.map((c) => c.operationId)).toEqual(['d', 'c'])
    expect(merged.map((c) => c.seq)).toEqual([201, 202])
    expect(merged[0]?.key).toBe(commandKey(account, 201))
  })
})

describe('Outbox › learning and rewriting ids', () => {
  it('learns the server id of what the local apply created, from the reply, and rewrites later args', () => {
    const created = { ...emptyCreatedIds(), matches: ['m-local'] }
    const learned = learnAliases(
      { id: 'm-local', matchNo: 4, teamA: ['p1'] },
      { id: 'm-server', matchNo: 9, teamA: ['p1'] },
      created,
    )
    expect([...learned]).toEqual([['m-local', 'm-server']])
    expect(
      aliasArgs({ matchId: 'm-local', courtIds: ['c1'], nested: { ids: ['m-local'] } }, learned),
    ).toEqual({
      matchId: 'm-server',
      courtIds: ['c1'],
      nested: { ids: ['m-server'] },
    })
  })

  it('never guesses from ids it did not create or shapes that differ', () => {
    const created = { ...emptyCreatedIds(), clubPlayers: ['cp-local'] }
    expect(
      learnAliases(
        { clubPlayerId: 'cp-local', other: 'x' },
        { clubPlayerId: 'cp-server', other: 'y' },
        created,
      ),
    ).toEqual(new Map([['cp-local', 'cp-server']]))
    expect(learnAliases([{ id: 'cp-local' }], { id: 'cp-server' }, created).size).toBe(0)
    expect(learnAliases({ id: 'cp-local' }, { id: 7 }, created).size).toBe(0)
  })

  it('tells what a local apply created', () => {
    const before = {
      matches: [{ id: 'm1' }],
      courts: [],
      clubPlayers: [{ id: 'cp1' }],
      roster: [{ id: 'r1', clubPlayerId: 'cp1' }],
      waitlist: [],
    }
    const after = {
      matches: [{ id: 'm1' }, { id: 'm2' }],
      courts: [{ id: 'c1' }],
      clubPlayers: [{ id: 'cp1' }, { id: 'cp2' }],
      roster: [
        { id: 'r1', clubPlayerId: 'cp1' },
        { id: 'r2', clubPlayerId: 'cp2' },
      ],
      waitlist: [{ id: 'w1', clubPlayerId: 'cp3' }],
    }
    expect(createdIdsOf(before, after)).toEqual({
      matches: ['m2'],
      courts: ['c1'],
      clubPlayers: ['cp2'],
      roster: [{ id: 'r2', clubPlayerId: 'cp2' }],
      waitlist: [{ id: 'w1', clubPlayerId: 'cp3' }],
    })
  })
})

describe('Outbox › routing a refused replay', () => {
  it('sends a 409 to Q-CONFLICT, waits quietly offline, and asks for attention otherwise', () => {
    expect(replayFailureOf(new MockError('conflict', 'Something changed.'))).toBe('conflict')
    expect(replayFailureOf(new MockError('offline', 'Offline'))).toBe('offline')
    expect(replayFailureOf(new MockError('retryable', 'Try again'))).toBe('attention')
    expect(replayFailureOf(new MockError('timeout', 'No reply'))).toBe('attention')
    expect(replayFailureOf(new Error('boom'))).toBe('attention')
  })

  it('lists waiting commands newest first for Q-SYNC', () => {
    const changes = pendingChangesOf([command('a', 10), command('b', 30)])
    expect(changes.map((c) => c.id)).toEqual(['b', 'a'])
    expect(changes[0]).toMatchObject({ text: 'Match 3 started on Court 1', syncedAt: null })
  })
})

describe('Play-history file › round trip and bad files', () => {
  const file: PlayHistoryFile = {
    format: 'rotra-play-history',
    version: 1,
    exportedAt: '2026-11-11T10:00:00.000Z',
    clubCopy: [{ path: '/api/club', body: { club: { id: 'club-1' } } }],
    sessions: [
      {
        session: {
          sessionId: 's-1',
          title: 'Tuesday night',
          startsAt: 1,
          downloadedAt: 2,
          paths: ['/api/sessions/s-1'],
        },
        deviceCopy: [{ path: '/api/sessions/s-1', body: { session: { id: 's-1' } } }],
        outbox: [command('a', 10), command('b', 20)],
      },
    ],
  }

  it('reads back exactly what it wrote', () => {
    expect(parsePlayHistory(serializePlayHistory(file))).toEqual(file)
  })

  it("refuses anything that isn't a ROTRA play history", () => {
    expect(parsePlayHistory('not json')).toBeNull()
    expect(parsePlayHistory('{"format":"csv"}')).toBeNull()
    expect(parsePlayHistory(JSON.stringify({ ...file, version: 2 }))).toBeNull()
    expect(
      parsePlayHistory(
        JSON.stringify({ ...file, sessions: [{ ...file.sessions[0], outbox: [{ nope: true }] }] }),
      ),
    ).toBeNull()
  })

  it('words the import toast with what now waits on this device', () => {
    expect(importedToast(1)).toBe('Play history imported · 1 change waiting to sync')
    expect(importedToast(3)).toBe('Play history imported · 3 changes waiting to sync')
  })
})

describe('Outbox › storage failure', () => {
  it('refuses an offline save honestly when the device has no storage', async () => {
    await expect(writeOfflineChange(account, [], command('a', 1))).rejects.toMatchObject({
      message: OFFLINE_SAVE_FAILED,
    })
  })
})
