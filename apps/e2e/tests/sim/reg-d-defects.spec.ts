import { expect, test } from '@playwright/test'
import { asQueueMaster } from '../../src/api/sign-in.ts'
import { QueueMasterApi } from '../../src/sim/api.ts'
import { Engine } from '../../src/sim/engine.ts'
import { config } from '../../src/sim/run.ts'
import { SHAPES } from '../../src/sim/scenario.ts'

test.beforeEach(() => test.setTimeout(10 * 60_000))

/**
 * App defects the simulations found, kept as expected failures until fixed.
 *
 * DEFECT (Session done with an On court match): `dropUnstarted` in
 * packages/db/src/queue/finalization.ts closes the court usage of a placed, never started match
 * with `released_at` only, but `match_court_usage_release_check` requires `released_at` and
 * `release_operation_id` together. POST /finalization then fails with 500 (Postgres:
 * "new row for relation match_court_usage violates check constraint
 * match_court_usage_release_check"). In Auto Queue a freed court is refilled On court at once, so
 * almost every Auto Queue session has such a match at Session done. The simulations work around it
 * by switching to Manual Queue at the planned end and sending leftovers back to the queue.
 */
test('REG-DEF-01 Session done with a match left On court (never started)', async () => {
  test.fail()
  const client = await asQueueMaster()
  const engine = new Engine(
    config({ id: 'REG-DEF-01', scenario: 'Session done with On court', shape: SHAPES.small }),
    new QueueMasterApi(client),
  )
  try {
    await engine.setup()
    await engine.refresh()
    await engine.topUpQueue()
    await engine.refresh()
    const onCourt = engine.queue.matches.filter((m) => m.state === 'on_court')
    expect(onCourt.length, 'Auto Queue placed matches On court').toBeGreaterThan(0)
    const reply = await client.send('POST', `/api/sessions/${engine.sessionId}/finalization`, {
      commandId: crypto.randomUUID(),
    })
    expect(reply.status, JSON.stringify(reply.body)).toBeLessThan(300)
  } finally {
    await engine.abandon()
    await client.dispose()
  }
})
