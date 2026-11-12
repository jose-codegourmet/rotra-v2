import { expect, test } from '@playwright/test'
import { asQueueMaster } from '../../src/api/sign-in.ts'
import { knownDefect } from '../../src/known-defect.ts'
import { QueueMasterApi } from '../../src/sim/api.ts'
import { Engine } from '../../src/sim/engine.ts'
import { config } from '../../src/sim/run.ts'
import { SHAPES } from '../../src/sim/scenario.ts'

test.beforeEach(() => test.setTimeout(10 * 60_000))

/**
 * App defects the simulations found. Each passes only while its exact bug happens (knownDefect).
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
test('REG-DEF-01 Session done with a match left On court (never started) [known bug: Session done 500]', async () => {
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
    await knownDefect(
      {
        id: 'REG-DEF-01',
        bug: 'Session done 500 with a match On court (match_court_usage_release_check)',
        match: /POST \/api\/sessions\/[^/]+\/finalization -> 500/,
      },
      async () => {
        const path = `/api/sessions/${engine.sessionId}/finalization`
        const reply = await client.send('POST', path, { commandId: crypto.randomUUID() })
        if (reply.status >= 300)
          throw new Error(`POST ${path} -> ${reply.status} ${JSON.stringify(reply.body)}`)
      },
    )
  } finally {
    await engine.abandon()
    await client.dispose()
  }
})
