import { test as setup } from '@playwright/test'
import { hasAccounts } from '../../src/accounts.ts'
import { resetClock } from '../../src/clock.ts'
import { seed } from '../../src/seed/seed.ts'

/** Seeds once per prepared database: `prepare` deletes `.e2e/accounts.json` when it rebuilds. */
setup('seed admin, club, license and players', async () => {
  setup.setTimeout(180_000)
  await resetClock()
  if (hasAccounts()) return
  await seed()
})
