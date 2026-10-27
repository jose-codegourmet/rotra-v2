let latencyEnabled = true

/** Storybook may turn delays off; returns a cleanup function that restores the previous setting. */
export function setMockLatencyEnabled(enabled: boolean): () => void {
  const previous = latencyEnabled
  latencyEnabled = enabled
  return () => {
    latencyEnabled = previous
  }
}

/** Short, deterministic mock request delay; rejects on cancellation so stale requests do not finish. */
export function delay(milliseconds = 400, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason)
  if (!latencyEnabled || milliseconds <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)
    function abort() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}
