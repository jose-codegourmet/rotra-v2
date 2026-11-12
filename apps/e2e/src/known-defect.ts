import { test } from '@playwright/test'

export type KnownDefect = {
  /** The test's ID, e.g. UI-08. */
  id: string
  /** The app bug, in a few words. */
  bug: string
  /** That bug's failure: what the thrown error's message must match. */
  match: RegExp
  /** Only expected under this condition (default true); otherwise the block runs as ordinary steps. */
  when?: boolean
}

/**
 * Runs the steps that hit a known app bug. Unlike a bare `test.fail()`, only that bug passes:
 * - the block throws an error matching `match`: expected failure (`test.fail`), shown as known;
 * - it throws anything else: an ordinary red failure;
 * - it does not throw: the bug is gone; the test goes on and gets a `defect-fixed` annotation.
 * Keep every step before the bug outside the block, so ordinary breakage there stays red.
 */
export async function knownDefect<T>(defect: KnownDefect, block: () => Promise<T>): Promise<T> {
  if (defect.when === false) return block()
  let value: T
  try {
    value = await block()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (defect.match.test(message)) test.fail(true, `${defect.id}: ${defect.bug}`)
    throw error
  }
  test.info().annotations.push({
    type: 'defect-fixed',
    description: `${defect.id}: ${defect.bug} — remove the knownDefect wrapper`,
  })
  return value
}
