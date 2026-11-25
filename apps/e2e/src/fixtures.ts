import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs'
import { test as base } from '@playwright/test'
import { GO_LOG } from './stack.ts'

const size = () => (existsSync(GO_LOG) ? statSync(GO_LOG).size : 0)

function readFrom(offset: number) {
  const length = Math.max(0, size() - offset)
  if (length === 0) return ''
  const buffer = Buffer.alloc(length)
  const fd = openSync(GO_LOG, 'r')
  try {
    readSync(fd, buffer, 0, length, offset)
  } finally {
    closeSync(fd)
  }
  return buffer.toString('utf8')
}

/**
 * `test` with one addition: when a test fails, the Go API's log since the test started is attached as
 * `go-api-log`. Every Go log line carries the request id (`request_id`), and a failed call's id is in
 * its error message (`[request <id>]`), so the failing call can be found in the slice. There is no
 * TypeScript run left to compare against, so this log is the evidence.
 */
export const test = base.extend<{ goApiLog: undefined }>({
  goApiLog: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright reads a fixture's dependencies from this pattern.
    async ({}, use, testInfo) => {
      const start = size()
      await use(undefined)
      if (testInfo.status === testInfo.expectedStatus) return
      const slice = readFrom(start)
      if (slice) await testInfo.attach('go-api-log', { body: slice, contentType: 'text/plain' })
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
