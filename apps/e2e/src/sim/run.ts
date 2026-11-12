import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type TestInfo, test } from '@playwright/test'
import { asQueueMaster } from '../api/sign-in.ts'
import { STATE_DIR } from '../stack.ts'
import { QueueMasterApi } from './api.ts'
import { Engine } from './engine.ts'
import { evaluate, report } from './outcome.ts'
import { hashSeed } from './prng.ts'
import { SHAPES, type SimConfig, type StrategyName } from './scenario.ts'

/** A run's seed: E2E_SEED pins every run (to replay a failure); otherwise stable per test. */
export function seedFor(label: string, index = 0) {
  const pinned = process.env.E2E_SEED
  if (pinned && Number.isFinite(Number(pinned))) return (Number(pinned) + index) >>> 0
  return hashSeed(`${label}#${index}`)
}

export const seedCount = () => Math.max(1, Number(process.env.E2E_SEEDS) || 5)

export function config(
  input: Pick<SimConfig, 'id' | 'scenario'> & Partial<Omit<SimConfig, 'id' | 'scenario'>>,
): SimConfig {
  return {
    shape: SHAPES.standard,
    strategy: 'Fewest Games' satisfies StrategyName,
    seed: seedFor(`${input.id} ${input.scenario}`),
    ...input,
  }
}

/**
 * Runs one simulated Queue Session and asserts its outcome (src/sim/outcome.ts). The full log is
 * attached to the test either way; a failure prints the seed, scenario, shape, strategy and every
 * player's minutes present, target and actual games.
 */
export async function simulate(cfg: SimConfig, testInfo: TestInfo = test.info()) {
  const started = Date.now()
  const client = await asQueueMaster()
  const engine = new Engine(cfg, new QueueMasterApi(client))
  console.log(
    `[sim] ${cfg.id} ${cfg.scenario} · seed=${cfg.seed} shape=${cfg.shape.name} strategy=${cfg.strategy}`,
  )
  try {
    await engine.run()
  } catch (error) {
    engine.lines.push(
      `ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    )
    await testInfo.attach(`${cfg.id}-seed-${cfg.seed}.log`, {
      body: [`seed=${cfg.seed} scenario=${cfg.id} ${cfg.scenario}`, ...engine.lines].join('\n'),
      contentType: 'text/plain',
    })
    throw error
  } finally {
    await engine.abandon()
    await client.dispose()
  }
  const outcome = evaluate(engine)
  const failures = [...engine.failures, ...outcome.failures]
  const text = report(engine, outcome, failures)
  await testInfo.attach(`${cfg.id}-seed-${cfg.seed}.log`, { body: text, contentType: 'text/plain' })
  mkdirSync(join(STATE_DIR, 'sim-logs'), { recursive: true })
  writeFileSync(join(STATE_DIR, 'sim-logs', `${cfg.id}-seed-${cfg.seed}.log`), text)
  const games = outcome.players.map((p) => p.actual)
  console.log(
    `[sim] ${cfg.id} seed=${cfg.seed} · minimum ${outcome.minimum} · games ${Math.min(...games)}–${Math.max(...games)} · ` +
      `${engine.decided.length} matches · ${failures.length ? `${failures.length} FAILURES` : 'ok'} · ${Math.round((Date.now() - started) / 1000)}s`,
  )
  if (failures.length) throw new Error(text.split('--- match log ---')[0])
  return { engine, outcome }
}
