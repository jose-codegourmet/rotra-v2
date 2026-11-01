type LifecycleTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
type PendingBatch = { flush: () => Promise<void>; pendingKeys: () => ReadonlySet<unknown> }

/** Flush on page lifecycle boundaries; a pending async mock save cannot survive browser destruction. */
export function connectBatchLifecycle(
  batch: PendingBatch,
  page: LifecycleTarget = window,
  visibility: LifecycleTarget & { readonly hidden: boolean } = document,
) {
  const flush = () => {
    void batch.flush()
  }
  const hidden = () => {
    if (visibility.hidden) flush()
  }
  const leaving = (event: Event) => {
    flush()
    if (batch.pendingKeys().size) {
      event.preventDefault()
      ;(event as BeforeUnloadEvent).returnValue = ''
    }
  }
  page.addEventListener('pagehide', flush)
  page.addEventListener('beforeunload', leaving)
  visibility.addEventListener('visibilitychange', hidden)
  return () => {
    page.removeEventListener('pagehide', flush)
    page.removeEventListener('beforeunload', leaving)
    visibility.removeEventListener('visibilitychange', hidden)
    flush()
  }
}
