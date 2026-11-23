/**
 * The newest snapshot version a live message named for a public session (B-25). It rides in the
 * request (`?minVersion=<n>`), never in a TanStack Query key, so one cache entry per page stays.
 */
const versions = new Map<string, number>()

export function noteSnapshotVersion(slug: string, version: number) {
  if (version > (versions.get(slug) ?? 0)) versions.set(slug, version)
}

/** The `?minVersion=` suffix for a public session read, or '' when no live message named one. */
export function minVersionQuery(slug: string): string {
  const version = versions.get(slug)
  return version === undefined ? '' : `?minVersion=${version}`
}
