import { argon2Sync, randomBytes } from 'node:crypto'

/**
 * An argon2id hash in the PHC format the Go API reads (`$argon2id$v=19$m=…,t=…,p=…$salt$key`, unpadded
 * base64), made with Node's built-in `crypto.argon2Sync`. The parameters are Go's defaults
 * (apps/api/internal/auth/password `DefaultParams`), so a sign-in does not rehash it.
 */
export function argon2idHash(password: string) {
  const memory = 19456
  const passes = 2
  const parallelism = 1
  const salt = randomBytes(16)
  const key = argon2Sync('argon2id', {
    message: Buffer.from(password),
    nonce: salt,
    parallelism,
    tagLength: 32,
    memory,
    passes,
  })
  const b64 = (bytes: Buffer) => bytes.toString('base64').replace(/=+$/, '')
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${b64(salt)}$${b64(key)}`
}
