import { manilaToday } from '../license/license.rules'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { RealRequestError, realRequest } from '../real/client'
import { isRealDataMode } from '../real/mode'
import { sampleSalesSessions } from './sales.fixtures'
import { clubSalesReport, platformSalesReport } from './sales.rules'
import type {
  ClubSalesReport,
  PlatformSalesReport,
  SalesInput,
  SalesPeriod,
  SalesSessionRow,
} from './sales.types'

/**
 * The rows the Sales rules read from the mock store, for today in Manila: every recorded license
 * term (a free term, recorded without a paid day, counts on the day it was recorded), the final
 * (completed) sessions with their completed matches, and the sample history the prototype draws.
 * Invalid and cancelled sessions never count as started.
 */
export function salesInputOf(state: MockState, today: string = manilaToday()): SalesInput {
  const completedMatches = new Map<string, number>()
  for (const match of state.matches) {
    if (match.state !== 'completed') continue
    completedMatches.set(match.sessionId, (completedMatches.get(match.sessionId) ?? 0) + 1)
  }
  const finalSessions: SalesSessionRow[] = state.sessions.flatMap((session) => {
    if (session.state !== 'completed' || session.startedAt == null) return []
    const startedOn = manilaToday(new Date(session.startedAt))
    if (startedOn > today) return []
    return [{ clubId: session.clubId, startedOn, matches: completedMatches.get(session.id) ?? 0 }]
  })
  return {
    today,
    clubs: state.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      pricing: club.licensePricing,
      monthlyListMinor: club.licenseMonthlyMinor,
    })),
    payments: state.licensePayments.map((term) => ({
      termId: term.id,
      clubId: term.clubId,
      plan: term.plan,
      paidOn: term.paidOn ?? manilaToday(new Date(term.activatedAt)),
      amountMinor: term.amountMinor,
      startsAt: term.startsAt,
    })),
    sessions: [...finalSessions, ...sampleSalesSessions(state.clubs, state.licensePayments, today)],
  }
}

/**
 * A-SALES for one period. Real mode reads Admin's `/api/sales`, computed in Postgres
 * (`@rotra/db/admin/sales`, D-2026-11-08-01), which returns the same `PlatformSalesReport`.
 */
export async function getPlatformSales(
  period: SalesPeriod,
  signal?: AbortSignal,
): Promise<PlatformSalesReport> {
  if (isRealDataMode()) {
    const query = new URLSearchParams({ period })
    return (await realRequest<{ report: PlatformSalesReport }>(`/api/sales?${query}`, { signal }))
      .report
  }
  await delay(400, signal)
  return platformSalesReport(salesInputOf(readMockState()), period)
}

/**
 * A-CLUB-SALES for one club, null when no club has this id. The cost per session is the Admin
 * configuration figure in the mock store; real mode reads Admin's `/api/sales/clubs/:id`, where an
 * unknown club is a 404, shown as not found like the mock's null.
 */
export async function getClubSales(
  clubId: string,
  signal?: AbortSignal,
): Promise<ClubSalesReport | null> {
  if (isRealDataMode()) {
    try {
      return (
        await realRequest<{ report: ClubSalesReport }>(
          `/api/sales/clubs/${encodeURIComponent(clubId)}`,
          { signal },
        )
      ).report
    } catch (error) {
      if (error instanceof RealRequestError && error.status === 404) return null
      throw error
    }
  }
  await delay(400, signal)
  const state = readMockState()
  return clubSalesReport(salesInputOf(state), clubId, state.salesSettings.costPerSession)
}
