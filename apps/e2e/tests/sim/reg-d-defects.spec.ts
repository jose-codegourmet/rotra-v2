import { expect, test } from '@playwright/test'
import { asQueueMaster } from '../../src/api/sign-in.ts'
import { QueueMasterApi } from '../../src/sim/api.ts'
import { Engine } from '../../src/sim/engine.ts'
import { config } from '../../src/sim/run.ts'
import { SHAPES } from '../../src/sim/scenario.ts'

test.beforeEach(() => test.setTimeout(10 * 60_000))

/**
 * App defects the simulations found, kept as regressions once fixed.
 *
 * REG-DEF-01 (fixed): Session done with a placed, never started match used to fail with 500,
 * because `dropUnstarted` (packages/db/src/queue/finalization.ts) closed its court usage without a
 * release operation id (`match_court_usage_release_check`). Session done must now succeed.
 */
test('REG-DEF-01 Session done with a match left On court (never started)', async () => {
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
    const path = `/api/sessions/${engine.sessionId}/finalization`
    const reply = await client.send('POST', path, { commandId: crypto.randomUUID() })
    if (reply.status >= 300)
      throw new Error(`POST ${path} -> ${reply.status} ${JSON.stringify(reply.body)}`)
  } finally {
    await engine.abandon()
    await client.dispose()
  }
})
