import {
  type BrowserContext,
  chromium,
  expect,
  type Page,
  type TestInfo,
  test,
} from '@playwright/test'
import { appUrl } from '../stack.ts'
import { signInQueueMaster } from '../ui/sign-in.ts'
import type { Engine } from './engine.ts'
import type { SimPlugin } from './scenario.ts'

/**
 * Watch mode (E2E_WATCH=1): a Queue Master browser follows a simulation on the real screens. It
 * signs in on the Queue sign-in screen, opens the live session console, and after every step that
 * logged something (one virtual minute) reloads the console inside a `test.step` named after what
 * happened, so Playwright UI mode and the trace show one step per minute with a DOM snapshot. The
 * browser clock follows the virtual server clock. Off by default: no browser is launched.
 */
export const watching = () => process.env.E2E_WATCH === '1'

/** Log lines that change nothing on screen. */
const QUIET = /^draft refused on the client/

export class Watcher {
  private seen = 0

  private constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    private readonly close: () => Promise<void>,
  ) {}

  static async open(testInfo: TestInfo) {
    const browser = await chromium.launch({ headless: testInfo.project.use.headless ?? true })
    const context = await browser.newContext({
      baseURL: appUrl('queue'),
      timezoneId: 'Asia/Manila',
      viewport: { width: 1280, height: 800 },
      // Sheets animate with motion, which stalls under the installed fake clock; reduced motion
      // makes them appear at once.
      reducedMotion: 'reduce',
      recordVideo: { dir: testInfo.outputPath('watch-video'), size: { width: 1280, height: 800 } },
    })
    await context.clock.install()
    const page = await context.newPage()
    const watcher = new Watcher(context, page, async () => {
      const video = page.video()
      await context.close()
      await browser.close()
      const path = await video?.path().catch(() => undefined)
      if (path) await testInfo.attach('watch-video', { path, contentType: 'video/webm' })
    })
    await test.step('Queue Master signs in', () => signInQueueMaster(page))
    return watcher
  }

  /** Browser clock to the server's virtual now, then the page fresh from the server. */
  private async load(engine: Engine, path: string) {
    await this.page.clock.setSystemTime(engine.serverNow())
    if (this.page.url().endsWith(path)) await this.page.reload()
    else await this.page.goto(path)
  }

  private async showConsole(engine: Engine) {
    await this.load(engine, `/sessions/${engine.sessionId}`)
    await expect(this.page.getByRole('tablist', { name: 'Console views' })).toBeVisible({
      timeout: 30_000,
    })
  }

  /** One step for everything logged since the last one (one virtual minute). */
  async showStep(engine: Engine) {
    const fresh = engine.lines
      .slice(this.seen)
      .map((line) => line.replace(/^t=\d+ /, ''))
      .filter((line) => !QUIET.test(line))
    this.seen = engine.lines.length
    if (!fresh.length) return
    const head = fresh.slice(0, 3).join(' · ')
    const more = fresh.length > 3 ? ` · +${fresh.length - 3} more` : ''
    const label = `t=${Math.round(engine.t)}m · ${head}${more}`
    await test.step(label.length > 240 ? `${label.slice(0, 237)}...` : label, () =>
      this.showConsole(engine),
    )
  }

  /** The Session done review sheet on the console, before Session done is confirmed. */
  async showReview(engine: Engine) {
    await this.showStep(engine)
    await test.step(`t=${Math.round(engine.t)}m · Session done review`, async () => {
      await this.showConsole(engine)
      // The footer's Session done opens the review sheet; nothing is confirmed here (the engine
      // finishes through the API).
      await this.page.getByRole('button', { name: 'Session done', exact: true }).last().click()
      await this.page
        .getByRole('dialog', { name: 'Session done' })
        .waitFor({ timeout: 30_000 })
        .catch(() => undefined)
      await this.page.waitForTimeout(1_000) // let the trace and video catch the open sheet
    })
  }

  /**
   * After Session done: the session record and its results, each once its heading (the session
   * title) has replaced the loading skeleton. A view that never loads is left as it is: watch mode
   * only shows, it never fails a scenario.
   */
  async showRecord(engine: Engine) {
    const title = `${engine.cfg.id} seed ${engine.cfg.seed}` // as Engine.setup names it
    for (const [name, path] of [
      ['Session record', `/sessions/${engine.sessionId}/record`],
      ['Session results', `/sessions/${engine.sessionId}/results`],
    ] as const)
      await test.step(`${name} after Session done`, async () => {
        await this.load(engine, path)
        await this.page
          .getByRole('heading', { name: title, exact: true })
          .first()
          .waitFor({ timeout: 30_000 })
          .catch(() => undefined)
        await this.page.waitForTimeout(1_000) // let the trace and video catch the loaded view
      })
  }

  /** The engine hooks: a step after every Queue Master step, the review before Session done. */
  plugin(): SimPlugin {
    return {
      name: 'watch',
      afterStep: (engine) => this.showStep(engine),
      beforeDone: (engine) => this.showReview(engine),
    }
  }

  async dispose() {
    await this.close()
  }
}
