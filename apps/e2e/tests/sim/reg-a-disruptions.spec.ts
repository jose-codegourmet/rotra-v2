import { test } from '@playwright/test'
import { eating, injured, invalidMatches, late, subbed, tired } from '../../src/sim/disruptions.ts'
import { matchRequests } from '../../src/sim/requests.ts'
import { config, seedCount, seedFor, simulate } from '../../src/sim/run.ts'
import { SHAPES, type SimPlugin, type StrategyName } from '../../src/sim/scenario.ts'

/**
 * Whole Queue Sessions under disruptions, through the real Route Handlers: the minimum-games
 * OUTCOME (src/sim/outcome.ts). The server clock only moves forward, so these run in order and
 * never reset it; each run starts its session after the previous one.
 */
test.beforeEach(() => test.setTimeout(30 * 60_000))

test('REG-01 control, no disruptions: everyone reaches the full minimum', async () => {
  await simulate(config({ id: 'REG-01', scenario: 'control' }))
})

test('REG-02a late only, low end (10% of players, 1-10 min)', async () => {
  await simulate(
    config({
      id: 'REG-02a',
      scenario: 'late low',
      plugins: [late({ fraction: [0.1, 0.1], minutes: [1, 10] })],
    }),
  )
})
test('REG-02b late only, high end (30% of players, 60-90 min)', async () => {
  await simulate(
    config({
      id: 'REG-02b',
      scenario: 'late high',
      plugins: [late({ fraction: [0.3, 0.3], minutes: [60, 90] })],
    }),
  )
})

test('REG-03a injuries only, early (first 30 min)', async () => {
  await simulate(
    config({
      id: 'REG-03a',
      scenario: 'injuries early',
      plugins: [injured({ fraction: [0.01, 0.1], window: [1, 30] })],
    }),
  )
})
test('REG-03b injuries only, late (last 30 min)', async () => {
  await simulate(
    config({
      id: 'REG-03b',
      scenario: 'injuries late',
      plugins: [injured({ fraction: [0.01, 0.1], window: [150, 175] })],
    }),
  )
})

test('REG-04 substitutions only, one per credit choice (Nobody, incoming, outgoing)', async () => {
  const everyCredit: SimPlugin = {
    name: 'every-credit',
    finish: (engine) => {
      const credits = new Set(engine.subs.map((s) => s.credit))
      for (const c of ['none', 'incoming', 'outgoing'] as const)
        engine.check(credits.has(c), `no substitution with credit ${c} happened`)
    },
  }
  await simulate(
    config({
      id: 'REG-04',
      scenario: 'substitutions',
      plugins: [
        subbed({ count: 3, window: [20, 150], credits: ['none', 'incoming', 'outgoing'] }),
        everyCredit,
      ],
    }),
  )
})

test('REG-05 tired only (Not full: roster below the slot budget)', async () => {
  await simulate(
    config({
      id: 'REG-05',
      scenario: 'tired',
      shape: SHAPES.notFull,
      plugins: [tired({ fraction: [0.01, 0.15], window: [20, 150] })],
    }),
  )
})

test('REG-06a eating only, 10 min', async () => {
  await simulate(
    config({ id: 'REG-06a', scenario: 'eating 10', plugins: [eating({ durations: [10] })] }),
  )
})
test('REG-06b eating only, 90 min', async () => {
  await simulate(
    config({ id: 'REG-06b', scenario: 'eating 90', plugins: [eating({ durations: [90] })] }),
  )
})

const lowEnd = (): SimPlugin[] => [
  late({ fraction: [0.1, 0.1], minutes: [1, 10] }),
  injured({ count: 1, window: [20, 150] }),
  subbed({ count: 1, window: [20, 150] }),
  tired({ fraction: [0.01, 0.01], window: [20, 150] }),
  eating({ durations: [10] }),
  invalidMatches({ count: 1, window: [20, 150] }),
]
const highEnd = (): SimPlugin[] => [
  late({ fraction: [0.3, 0.3], minutes: [60, 90] }),
  injured({ fraction: [0.1, 0.1], window: [5, 170] }),
  subbed({ fraction: [0.1, 0.1], window: [5, 170] }),
  tired({ fraction: [0.15, 0.15], window: [20, 150] }),
  eating({ durations: [90, 90, 90] }),
  invalidMatches({ count: 1, window: [20, 150] }),
]

test('REG-07 all disruptions, low end (Not full)', async () => {
  await simulate(
    config({ id: 'REG-07', scenario: 'all low', shape: SHAPES.notFull, plugins: lowEnd() }),
  )
})
test('REG-08 all disruptions, high end, with match requests (Not full)', async () => {
  await simulate(
    config({
      id: 'REG-08',
      scenario: 'all high',
      shape: SHAPES.notFull,
      plugins: [...highEnd(), matchRequests()],
    }),
  )
})

const ROTATION: StrategyName[] = ['Fewest Games', 'Available Players', 'Longest Wait', 'Plan Ahead']
const MIX_SHAPES = [SHAPES.standard, SHAPES.notFull, SHAPES.small]
/**
 * APP FINDING (REG-09 #3, Longest Wait, Small): the Longest Wait tab (`generateAutoQueueMatches`,
 * mode `wait`, packages/data/src/match/autoQueue.rules.ts) orders by queued load, then wait
 * minutes, then ROSTER ORDER. When a court frees, the players who just finished (and anyone just
 * back from a break, whose wait restarts at Present on) all wait 0 minutes, so the tie goes to
 * the earliest roster entries every time; games played never break the tie. In this run P07 plays
 * six matches back to back (7 games) while P10 and P11, Present the whole session, get 4: the
 * fairness spread is 3 (> 2). Expected to fail for the default seeds until the tab's rule is
 * decided (#247 draft-mode weights); a pinned E2E_SEED runs it as an ordinary test.
 */
const LONGEST_WAIT_TIES =
  'Longest Wait breaks wait ties by roster order, not games played: fairness spread 3 (#247)'

for (let i = 0; i < seedCount(); i++) {
  const strategy = ROTATION[i % ROTATION.length] as StrategyName
  const shape = MIX_SHAPES[i % MIX_SHAPES.length] as (typeof MIX_SHAPES)[number]
  test(`REG-09 random mix #${i + 1} (${strategy}, ${shape.name})${i === 2 ? '' : ' with match requests'}`, async () => {
    test.fail(!process.env.E2E_SEED && i === 2, LONGEST_WAIT_TIES)
    const end = shape.hours * 60
    await simulate(
      config({
        id: `REG-09.${i + 1}`,
        scenario: 'random mix',
        shape,
        strategy,
        seed: seedFor('REG-09 random mix', i),
        plugins: [
          late({ fraction: [0.1, 0.3], minutes: [1, 90] }),
          injured({ fraction: [0.01, 0.1], window: [5, end - 10] }),
          subbed({ fraction: [0.01, 0.1], window: [5, end - 10] }),
          tired({ fraction: [0.01, 0.15], window: [10, end - 30] }),
          eating({ count: [1, 3], duration: [10, 90] }),
          invalidMatches({ count: 1, window: [10, end - 20] }),
          // #3 keeps the Longest Wait finding's exact run (requests would change its schedule).
          ...(i === 2 ? [] : [matchRequests()]),
        ],
      }),
    )
  })
}

test('REG-10 stacked: one player 90 min late, then eats 90 min', async () => {
  await simulate(
    config({
      id: 'REG-10',
      scenario: 'stacked late + eating',
      plugins: [
        late({ players: [0], minutes: [90, 90] }),
        eating({ players: [0], durations: [90], at: 100 }),
      ],
    }),
  )
})
