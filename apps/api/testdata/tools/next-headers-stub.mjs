// Stands in for `next/headers` in the capture run: `cookies()` only works inside a Next.js request. The claim
// handlers hand the store to the Supabase adapter, which the refused-before-provider cases never reach.
export async function cookies() {
  return { getAll: () => [], set: () => {} }
}
