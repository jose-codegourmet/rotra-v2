import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Where the hero sits. `card`: the profile card, whose Card has no top padding, so the strip runs
 * edge to edge from the top (.card.hero .hero-banner). `preview`: Edit profile › Name, under the
 * section intro; the strip pulls up into the panel gap with rounded top corners (.edit-hero).
 */
export const profileHeroBannerVariants = cva('-mx-4 h-24', {
  variants: {
    placement: {
      card: '',
      preview: '-mt-4 rounded-t-lg',
    },
  },
  defaultVariants: { placement: 'card' },
})

export type ProfileHeroVariants = VariantProps<typeof profileHeroBannerVariants>
