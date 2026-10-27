import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .slot-meter: the bar turns amber when 2 or fewer slots are left, or when full.
export const slotMeterBarVariants = cva('block h-full rounded-[inherit]', {
  variants: {
    state: { ok: 'bg-accent', near: 'bg-warn', full: 'bg-warn', over: 'bg-warn' },
  },
  defaultVariants: { state: 'ok' },
})

export type SlotMeterVariants = VariantProps<typeof slotMeterBarVariants>
