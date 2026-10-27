import { describe, expect, it } from 'vitest'
import { formatPeso, moneyField } from './money'

describe('integer centavos', () => {
  it.each([
    ['0', 0],
    ['0.29', 29],
    ['1.01', 101],
    ['350', 35000],
    ['1,234.50', 123450],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER],
  ])('converts %s pesos exactly', (value, expected) =>
    expect(moneyField.parse(value)).toBe(expected))
  it('preserves numeric centavos', () => {
    expect(moneyField.parse(35000)).toBe(35000)
    expect(moneyField.parse(0)).toBe(0)
  })
  it.each([
    '',
    ' ',
    '-1',
    '1.001',
    '1,23',
    '1e3',
    'NaN',
    '90071992547409.92',
    -1,
    0.29,
    Infinity,
    NaN,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid or unsafe amount %s', (value) =>
    expect(moneyField.safeParse(value).success).toBe(false))
})

describe('formatPeso', () => {
  it.each([
    [150000, '₱1,500'],
    [150050, '₱1,500.50'],
    [35000, '₱350'],
    [5, '₱0.05'],
    [0, '₱0'],
  ])('%i centavos → %s', (minor, expected) => {
    expect(formatPeso(minor)).toBe(expected)
  })
})
