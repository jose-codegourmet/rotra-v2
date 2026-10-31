import 'server-only'

/** What a service may put on the wire: plain JSON, built explicitly from allowlisted fields. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** Money on the wire: integer minor units and ISO 4217 currency; null stays null, never 0. */
export type MoneyJson = { amountMinor: number; currency: string }

export const toIso = (value: Date): string => value.toISOString()
export const toIsoOrNull = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null

/** Bigint revisions and sequences travel as decimal strings, so no precision is lost. */
export const toDecimalString = (value: bigint): string => value.toString()

/** A `@db.Date` column as YYYY-MM-DD. */
export const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10)

export function toMoney(
  amountMinor: number | null | undefined,
  currency: string,
): MoneyJson | null {
  if (amountMinor == null) return null
  if (!Number.isSafeInteger(amountMinor)) throw new Error('Money must be integer minor units')
  return { amountMinor, currency }
}

/** Copies only the named keys, so a raw row cannot leak extra columns. */
export function pick<T extends object, K extends keyof T>(row: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const key of keys) out[key] = row[key]
  return out
}

/**
 * Last-line guard on every response body: converts Date → ISO string and bigint → decimal string,
 * keeps null, and refuses bytes, functions and class instances (such as a Prisma result model)
 * so nothing reaches the wire that was not deliberately shaped.
 */
export function toJson(value: unknown, path = '$'): Json {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${path}`)
    return value
  }
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item, index) => toJson(item, `${path}[${index}]`))
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null)
      throw new Error(`Only plain objects can be serialized (at ${path})`)
    const out: { [key: string]: Json } = {}
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) out[key] = toJson(item, `${path}.${key}`)
    }
    return out
  }
  throw new Error(`Cannot serialize ${typeof value} at ${path}`)
}
