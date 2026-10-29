import { clubs } from '@rotra/data/fixtures/clubs'
import { rankingSettings } from '@rotra/data/fixtures/ranking-settings'
import { formatPeso } from '@rotra/schema/money'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ValueTiles } from './ValueTiles'

const paid = clubs.find((club) => club.licensePricing === 'paid')
if (!paid) throw new Error('Paid club fixture missing')

// rotra-admin.html savePct(): story display only; the club detail screen owns the real number.
const savePct = Math.round(
  (1 - paid.licenseYearlyMinor / (paid.licenseMonthlyMinor * 12)) * 100,
)

const priceTiles = [
  { id: 'monthly', label: 'Monthly', value: formatPeso(paid.licenseMonthlyMinor), mono: true },
  {
    id: 'yearly',
    label: 'Yearly',
    value: formatPeso(paid.licenseYearlyMinor),
    sub: savePct > 0 ? `${savePct}% less than 12 months` : 'No yearly discount',
    mono: true,
  },
]

const inEffectTiles = [
  {
    id: 'assessment',
    label: 'Assessment',
    value: `${rankingSettings.assessmentWeightPercent}%`,
    mono: true,
  },
  {
    id: 'performance',
    label: 'Performance',
    value: `${100 - rankingSettings.assessmentWeightPercent}%`,
    mono: true,
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    value: String(rankingSettings.matchRequirement),
    sub: 'recent matches',
    mono: true,
  },
]

const meta = {
  title: 'Admin/ValueTiles',
  component: ValueTiles,
  args: { tiles: priceTiles },
} satisfies Meta<typeof ValueTiles>

export default meta
type Story = StoryObj<typeof meta>

export const Price: Story = {}
export const Free: Story = {
  args: {
    tiles: [
      {
        id: 'price',
        label: 'Price',
        value: 'Free',
        sub: 'Tester club. Licenses are recorded at ₱0.',
      },
    ],
  },
}
export const InEffect: Story = { args: { tiles: inEffectTiles } }
export const InEffectPhone: Story = {
  args: { tiles: inEffectTiles },
  globals: { viewport: { value: 'phone' } },
}
export const PricePhone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = {
  args: { tiles: inEffectTiles },
  globals: { viewport: { value: 'desktop' } },
}
export const PriceLight: Story = { globals: { theme: 'light' } }
export const InEffectLight: Story = { args: { tiles: inEffectTiles }, globals: { theme: 'light' } }
