/**
 * Transfer link tokens (#1012) for the mock server: 32 random bytes in base64url, and the SHA-256
 * digest the store keeps instead of the token (hex), like the real service keeps the digest bytes.
 */
export function newTransferLinkToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function transferLinkDigest(token: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}
