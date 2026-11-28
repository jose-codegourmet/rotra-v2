/**
 * The visitor's join-request receipt (proposal pending #248): `<requestId>.<receipt>` in an
 * httpOnly, same-site cookie that only this slug's public-session routes receive. A browser
 * session cookie: no expiry is set while lost-receipt and expiry behaviour stay open in #248.
 */
export const RECEIPT_COOKIE = 'rotra_join_request'

export function receiptCookie(slug: string, requestId: string, receipt: string) {
  return {
    name: RECEIPT_COOKIE,
    value: `${requestId}.${receipt}`,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: `/api/public-sessions/${encodeURIComponent(slug)}`,
  }
}

export function parseReceiptCookie(value: string | undefined) {
  const [requestId, receipt, ...rest] = value?.split('.') ?? []
  if (!requestId || !receipt || rest.length) return null
  return { requestId, receipt }
}
