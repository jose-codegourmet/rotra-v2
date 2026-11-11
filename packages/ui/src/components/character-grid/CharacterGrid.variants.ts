import { cva, type VariantProps } from 'class-variance-authority'

/** character: square images, 88 px minimum (.ch-grid). banner: wide 3:1 tiles, 210 px minimum (.bn-grid). */
export const characterGridVariants = cva('grid gap-3', {
  variants: {
    variant: {
      character: 'grid-cols-[repeat(auto-fill,minmax(88px,1fr))]',
      banner: 'grid-cols-[repeat(auto-fill,minmax(210px,1fr))]',
    },
  },
  defaultVariants: { variant: 'character' },
})

export const characterGridTileVariants = cva(
  'block w-full cursor-pointer overflow-hidden border border-border bg-elev p-0 transition-opacity duration-150',
  {
    variants: {
      variant: {
        character: 'aspect-square rounded-[14px]',
        banner: 'aspect-[3/1] rounded-lg',
      },
    },
    defaultVariants: { variant: 'character' },
  },
)

export type CharacterGridVariants = VariantProps<typeof characterGridVariants>
