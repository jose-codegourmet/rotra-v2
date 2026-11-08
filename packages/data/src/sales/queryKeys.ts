import type { SalesPeriod } from './sales.types'

export const salesKeys = {
  all: ['sales'] as const,
  /** A-SALES for one period */
  platform: (period: SalesPeriod) => [...salesKeys.all, 'platform', period] as const,
  /** A-CLUB-SALES for one club */
  club: (clubId: string) => [...salesKeys.all, 'club', clubId] as const,
}
