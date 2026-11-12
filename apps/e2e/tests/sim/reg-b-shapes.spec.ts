import { test } from '@playwright/test'
import {
  baggingKept,
  injuryInQueue,
  injuryOnCourt,
  minimumSource,
  overfilled,
  shortOnPlayersSeen,
} from '../../src/sim/checks.ts'
import { config, simulate } from '../../src/sim/run.ts'
import { SHAPES, type Shape } from '../../src/sim/scenario.ts'

test.beforeEach(() => test.setTimeout(30 * 60_000))

const SHORT: Shape = {
  name: 'Short on players',
  players: 12,
  courts: 4,
  hours: 2,
  singles: false,
  doubles: true,
  playersPerCourt: 6,
}

test('REG-11 short on players: present count below court capacity', async () => {
  await simulate(
    config({
      id: 'REG-11',
      scenario: 'short on players',
      shape: SHORT,
      plugins: [shortOnPlayersSeen()],
    }),
  )
})

test('REG-12 injury while On court: lineup change, not substitution; Start match refused until replaced', async () => {
  await simulate(
    config({ id: 'REG-12', scenario: 'injury On court', plugins: [injuryOnCourt({ at: 30 })] }),
  )
})

test('REG-13 injured player in waiting matches: those need attention; Regenerate', async () => {
  await simulate(
    config({ id: 'REG-13', scenario: 'injury in queue', plugins: [injuryInQueue({ at: 40 })] }),
  )
})

test('REG-14 overfilled roster 25/24 (Add anyway)', async () => {
  await simulate(
    config({ id: 'REG-14', scenario: 'overfill', overfill: 1, plugins: [overfilled(25)] }),
  )
})

test('REG-15a doubles only (Small)', async () => {
  await simulate(config({ id: 'REG-15a', scenario: 'doubles only', shape: SHAPES.small }))
})
test('REG-15b doubles + singles (Big)', async () => {
  await simulate(config({ id: 'REG-15b', scenario: 'doubles + singles', shape: SHAPES.big }))
})
test('REG-15c Bagging mode on, one pair (Small)', async () => {
  await simulate(
    config({
      id: 'REG-15c',
      scenario: 'bagging',
      shape: SHAPES.small,
      bagging: (engine) => ({
        enabled: true,
        pairs: [
          {
            id: 'bagging-sim',
            a: engine.roster[0]?.id as string,
            b: engine.roster[1]?.id as string,
            games: 'all',
          },
        ],
      }),
      plugins: [baggingKept()],
    }),
  )
})

test('REG-16a calculated minimum', async () => {
  await simulate(
    config({
      id: 'REG-16a',
      scenario: 'calculated minimum',
      plugins: [minimumSource({ calculated: true })],
    }),
  )
})
test('REG-16b operator-set minimum (3)', async () => {
  await simulate(
    config({
      id: 'REG-16b',
      scenario: 'operator minimum',
      operatorMinimum: 3,
      plugins: [minimumSource({ calculated: false, value: 3 })],
    }),
  )
})
