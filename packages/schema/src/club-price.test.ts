import { describe, expect, it } from 'vitest'
import {
  clubPriceField,
  MONTHLY_PRICE_ERROR,
  parseWholePesos,
  YEARLY_PRICE_ERROR,
  yearlySavingPercent,
} from './club-price'

const paid = (monthly: string, yearly: string) =>
  clubPriceField.safeParse({ pricing: 'paid', monthly, yearly })
const messages = (result: ReturnType<typeof paid>) =>
  result.success ? [] : result.error.issues.map((issue) => [issue.path.join('.'), issue.message])

describe('whole-peso parsing', () => {
  it.each([
    ['1500', 150000],
    ['1,500', 150000],
    [' 15000 ', 1500000],
    ['1500.00', 150000],
    ['1', 100],
  ])('reads %s as %i centavos', (value, expected) => expect(parseWholePesos(value)).toBe(expected))

  it.each(['', ' ', '0', '0.00', '1500.50', '-1500', '1.5e3', 'abc', null, undefined])(
    'refuses %s',
    (value) => expect(parseWholePesos(value)).toBeNull(),
  )

  it('stores a paid price as integer centavos', () => {
    expect(clubPriceField.parse({ pricing: 'paid', monthly: '1,500', yearly: '15000' })).toEqual({
      pricing: 'paid',
      monthly: 150000,
      yearly: 1500000,
    })
  })

  it('needs both amounts in whole pesos above zero', () => {
    expect(messages(paid('', '0'))).toEqual([
      ['monthly', MONTHLY_PRICE_ERROR],
      ['yearly', YEARLY_PRICE_ERROR],
    ])
    expect(messages(paid('1500.50', '15000'))).toEqual([['monthly', MONTHLY_PRICE_ERROR]])
  })
})

describe('yearly < 12 × monthly', () => {
  it('accepts a yearly price one peso under twelve months', () => {
    expect(paid('1500', '17999').success).toBe(true)
  })

  it.each(['18000', '18,001', '20000'])('refuses a yearly price of %s at ₱1,500 a month', (y) =>
    expect(messages(paid('1500', y))).toEqual([
      [
        'yearly',
        'Make it less than 12 months at the monthly price (₱18,000). Yearly plans get a discount.',
      ],
    ]),
  )

  it('only compares once the monthly price is valid', () => {
    expect(messages(paid('', '18000'))).toEqual([['monthly', MONTHLY_PRICE_ERROR]])
  })

  it('rounds the saving to a whole percent', () => {
    expect(yearlySavingPercent(150000, 1500000)).toBe(17)
    expect(yearlySavingPercent(120000, 1200000)).toBe(17)
    expect(yearlySavingPercent(150000, 1800000)).toBe(0)
  })
})

describe('free', () => {
  it('needs no amounts', () => {
    expect(clubPriceField.parse({ pricing: 'free' })).toEqual({
      pricing: 'free',
      monthly: null,
      yearly: null,
    })
  })

  it('keeps the last paid amounts without checking the discount', () => {
    expect(clubPriceField.parse({ pricing: 'free', monthly: '1500', yearly: '20000' })).toEqual({
      pricing: 'free',
      monthly: 150000,
      yearly: 2000000,
    })
    expect(clubPriceField.parse({ pricing: 'free', monthly: '15.5', yearly: '' })).toEqual({
      pricing: 'free',
      monthly: null,
      yearly: null,
    })
  })
})
