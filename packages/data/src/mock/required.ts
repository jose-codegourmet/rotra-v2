/** Internal fixture/lookup invariant; callers validate user input separately. */
export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Missing mock fixture or related record.')
  return value
}
