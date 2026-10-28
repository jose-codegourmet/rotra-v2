import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .pub-hero: a column of the date line, the title and the organizer row. All three
// states share the layout; the state variant keeps them addressable (the chip carries the difference in
// text, never colour alone; "upcoming" draws no chip).
export const publicSessionHeroVariants = cva('flex min-w-0 flex-col gap-2.5', {
  variants: {
    state: {
      live: '',
      finished: '',
      upcoming: '',
    },
  },
  defaultVariants: { state: 'upcoming' },
})

export type PublicSessionHeroVariants = VariantProps<typeof publicSessionHeroVariants>
