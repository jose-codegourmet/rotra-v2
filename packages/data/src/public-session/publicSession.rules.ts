/**
 * Public participant names (owner decision, November 7, 2026; #475): each whitespace-separated word
 * becomes its first character plus a fixed "***", so "Jose Adrian" → "J*** A***" and "Mika" →
 * "M***". The fixed suffix never reveals a word's length. An empty or whitespace-only name reads
 * "Player". The first character is the first code point, so an emoji or accented letter stays whole.
 * Applied on the server (or the mock server) before a name enters `PublicSessionPage`.
 */
export function maskPublicName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'Player'
  return words.map((w) => `${Array.from(w)[0]}***`).join(' ')
}
