import 'server-only'
import type { CookieAdapter } from '../auth/supabase'

type NextCookieStore = {
  getAll(): { name: string; value: string }[]
  set(name: string, value: string, options?: object): unknown
}

/**
 * Adapts Next 16's `await cookies()` store in a Route Handler, where cookies may be set, to the
 * Supabase cookie methods. Refreshed session cookies are written back on the response; the
 * no-store headers are already set by `handleAccountRequest`.
 */
export function routeCookieAdapter(store: NextCookieStore): CookieAdapter {
  return {
    getAll: () => store.getAll(),
    setAll: (values) => {
      for (const { name, value, options } of values) store.set(name, value, options)
    },
  }
}
