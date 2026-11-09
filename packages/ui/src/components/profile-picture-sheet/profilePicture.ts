/** The prototype derives the eight character illustrations from the player's identity. */
export const PROFILE_CHARACTER_IDS = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g'] as const
export type ProfileCharacterId = (typeof PROFILE_CHARACTER_IDS)[number]
export type ProfilePicture =
  | { kind: 'initials' }
  | { kind: 'photo'; src: string }
  | { kind: 'character'; id: ProfileCharacterId }

/** Resolve the saved choice with the global identity, never a club-local ID or nickname. */
export function profilePictureSrc(
  reference: string | null | undefined,
  playerId: string,
  name: string,
): string | undefined {
  if (!reference) return undefined
  if (!reference.startsWith('character:')) return reference
  const id = reference.slice('character:'.length)
  const face = PROFILE_CHARACTER_IDS.find((candidate) => candidate === id)
  return face === undefined ? undefined : profileCharacterUrl(playerId, name, face)
}

export function profileCharacterUrl(playerId: string, name: string, face: string): string {
  let h = 2166136261
  const seed = playerId + name + face
  for (let index = 0; index < seed.length; index++) {
    h ^= seed.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  h >>>= 0
  const pick = (values: string[], shift: number) => values[(h >>> shift) % values.length]
  const skin = pick(['#f3cfae', '#e3b089', '#c98d62', '#ad7349', '#8c5836', '#f6dcc4'], 0)
  const hair = pick(['#1b1817', '#2e211b', '#4a3021', '#6d4a2c', '#8f6b48', '#2a2a31'], 3)
  const bg = pick(
    ['#2f6f5e', '#3b4f8a', '#74488a', '#8a5a2f', '#2f6a85', '#7d3b4a', '#4d6b2f', '#5b4a8a'],
    6,
  )
  const shirt = pick(
    ['#00cc6a', '#e6e6ec', '#ffb800', '#4a90e2', '#ff6b6b', '#9b6bff', '#24242a'],
    9,
  )
  const style = (h >>> 12) % 5
  const front = [
    'M19 27C19 12 45 12 45 27C41 19 23 19 19 27Z',
    'M18 29C16 11 45 9 46 26C40 17 31 22 22 19C21 22 19 25 18 29Z',
    'M19 26C21 14 43 14 45 26C38 19 26 19 19 26Z',
    'M19 27C19 13 45 13 45 27C41 20 23 20 19 27Z',
    'M20 24C21 15 43 15 44 24C38 20 26 20 20 24Z',
  ][style]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/>${style === 2 ? `<path d="M17 26C17 9 47 9 47 26L48 47C44 49 40 45 41 37H23C24 45 20 49 16 47Z" fill="${hair}"/>` : ''}${style === 3 ? `<circle cx="32" cy="10" r="6" fill="${hair}"/>` : ''}<path d="M7 64C9 49 21 44 32 44S55 49 57 64Z" fill="${shirt}"/><rect x="27" y="37" width="10" height="9" rx="3" fill="${skin}"/><ellipse cx="19.5" cy="29" rx="2.4" ry="3.2" fill="${skin}"/><ellipse cx="44.5" cy="29" rx="2.4" ry="3.2" fill="${skin}"/><ellipse cx="32" cy="28" rx="12.5" ry="14.5" fill="${skin}"/><path d="${front}" fill="${hair}" ${style === 4 ? 'opacity=".85"' : ''}/><path d="M25 25.5h4M35 25.5h4" stroke="${hair}" stroke-width="1.5" stroke-linecap="round"/><circle cx="27" cy="29.5" r="1.6" fill="#1b1817"/><circle cx="37" cy="29.5" r="1.6" fill="#1b1817"/><path d="M27.5 35.5Q32 39 36.5 35.5" fill="none" stroke="#7a3e2e" stroke-width="1.6" stroke-linecap="round"/>${(h >>> 16) % 5 === 0 ? '<g fill="none" stroke="#1b1817" stroke-width="1.3"><circle cx="27" cy="29.5" r="4"/><circle cx="37" cy="29.5" r="4"/><path d="M31 29.5h2"/></g>' : ''}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
