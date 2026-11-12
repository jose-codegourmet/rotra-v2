import { defineConfig, devices, type Project } from '@playwright/test'
import { assertE2eEnv } from './src/guard.ts'
import { APPS, type AppName, appServerEnv, appUrl, e2eEnv, readStackKeys } from './src/stack.ts'

/**
 * ROTRA regression suite: the three apps in REAL data mode against the throwaway local Supabase.
 * Run through `make e2e` (prepare + Playwright). Projects:
 *   sim  API-only simulations, one worker, in order (the server clock is global)
 *   ui   Chromium
 * Pick with `--project sim|ui` or E2E_SUITE=sim|ui. Both depend on `setup`, which seeds once.
 * The apps run built (`next build` + `next start`, into their own `.next-e2e`), locally and on CI,
 * so the suite tests what ships. E2E_DEV=1 runs `next dev` instead for fast restarts while writing
 * a test (ignored on CI).
 */
const keys = readStackKeys()
const env = e2eEnv(keys)
assertE2eEnv(env)
// The runner and its workers use the same explicit values (no NODE_OPTIONS: no clock in here).
Object.assign(process.env, env)

const ci = process.env.CI === 'true'
const suite = process.env.E2E_SUITE
const watch = process.env.E2E_WATCH === '1'
const dev = process.env.E2E_DEV === '1' && !ci

function webServer(app: AppName) {
  const { dir, port } = APPS[app]
  const next = './node_modules/.bin/next'
  const host = `--port ${port} --hostname 127.0.0.1`
  return {
    name: app,
    cwd: `../../${dir}`,
    // The build never gets the test clock; `next start` does (src/server-clock.mjs).
    command: dev
      ? `${next} dev ${host}`
      : `ROTRA_E2E_CLOCK=0 ${next} build && ${next} start ${host}`,
    url: `${appUrl(app)}/api/auth/session`,
    env: appServerEnv(keys, app),
    reuseExistingServer: false,
    timeout: dev ? 180_000 : 600_000,
    stdout: 'pipe' as const,
    stderr: 'pipe' as const,
  }
}

const setup: Project = { name: 'setup', testDir: './tests/setup', testMatch: /.*\.setup\.ts/ }
const projects: Project[] = [
  {
    name: 'sim',
    testDir: './tests/sim',
    dependencies: ['setup'],
    fullyParallel: false,
    // Watch mode (src/sim/watch.ts): keep the trace (with the watching browser in it) every run.
    ...(watch ? { use: { trace: 'on', video: 'on' } } : {}),
  },
  {
    name: 'ui',
    testDir: './tests/ui',
    dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'], baseURL: appUrl('queue') },
  },
]

export default defineConfig({
  globalSetup: './src/global-setup.ts',
  // The server clock is one global per app: simulations never run side by side.
  workers: 1,
  fullyParallel: false,
  forbidOnly: ci,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [setup, ...projects.filter((project) => !suite || project.name === suite)],
  webServer: (Object.keys(APPS) as AppName[]).map(webServer),
})
