import { assertE2eEnv } from './guard.ts'
import { E2E_DB_URL, e2eEnv, GO_API_URL, PROXY_SECRET } from './stack.ts'

/** Refuses the whole run unless the runner and the values it hands the apps are the local stack. */
export default async function globalSetup() {
  assertE2eEnv(e2eEnv())
  assertE2eEnv(process.env)
  await waitForGoReady()
}

/** The Go API counts as ready only when /readyz answers 200 (its database round trip works). */
async function waitForGoReady() {
  const deadline = Date.now() + 60_000
  let last = 'no answer'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${GO_API_URL}/readyz`, {
        headers: { 'X-Rotra-Proxy-Secret': PROXY_SECRET },
      })
      if (response.ok) return
      last = `HTTP ${response.status}`
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(
    `[e2e] The Go API is not ready on ${GO_API_URL}/readyz (${last}); db ${E2E_DB_URL}`,
  )
}
