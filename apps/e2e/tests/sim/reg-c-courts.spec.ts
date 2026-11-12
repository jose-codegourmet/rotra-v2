import { test } from '@playwright/test'
import {
  addCourt,
  busyCourtRefused,
  keepsWorkingAfterBooking,
  lastCourtRefused,
  removeFreeCourt,
} from '../../src/sim/checks.ts'
import { config, simulate } from '../../src/sim/run.ts'
import type { Shape } from '../../src/sim/scenario.ts'

test.beforeEach(() => test.setTimeout(30 * 60_000))

const ONE_COURT: Shape = {
  name: 'One court',
  players: 8,
  courts: 1,
  hours: 2,
  singles: false,
  doubles: true,
  playersPerCourt: 8,
}

test('REG-23 court added mid-session, open now', async () => {
  await simulate(
    config({ id: 'REG-23', scenario: 'add court now', plugins: [addCourt({ at: 60 })] }),
  )
})
test('REG-24 court added with a later planned start: no match before it', async () => {
  await simulate(
    config({
      id: 'REG-24',
      scenario: 'add court later',
      plugins: [addCourt({ at: 30, opensAt: 90 })],
    }),
  )
})
test('REG-25 court added with a later start, then Start anyway', async () => {
  await simulate(
    config({
      id: 'REG-25',
      scenario: 'start anyway',
      plugins: [addCourt({ at: 30, opensAt: 150, startAnywayAt: 60 })],
    }),
  )
})
test('REG-26 Open until a set time: Booking ended, the court keeps working', async () => {
  await simulate(
    config({
      id: 'REG-26',
      scenario: 'open until',
      courtOpenUntil: { 0: 120 },
      plugins: [keepsWorkingAfterBooking(0, 120)],
    }),
  )
})
test('REG-27 free court closed mid-session', async () => {
  await simulate(
    config({ id: 'REG-27', scenario: 'close free court', plugins: [removeFreeCourt({ at: 150 })] }),
  )
})
test('REG-28 closing a busy court is refused (On court and Playing)', async () => {
  await simulate(
    config({ id: 'REG-28', scenario: 'close busy court', plugins: [busyCourtRefused({ at: 45 })] }),
  )
})
test('REG-29 closing the last court is refused', async () => {
  await simulate(
    config({
      id: 'REG-29',
      scenario: 'close last court',
      shape: ONE_COURT,
      plugins: [lastCourtRefused({ at: 40 })],
    }),
  )
})
test('REG-30 remove a court, then add one', async () => {
  await simulate(
    config({
      id: 'REG-30',
      scenario: 'remove then add',
      plugins: [removeFreeCourt({ at: 60 }), addCourt({ at: 75 })],
    }),
  )
})
