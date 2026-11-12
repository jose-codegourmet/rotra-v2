import { cva, type VariantProps } from 'class-variance-authority'

/**
 * The banner wrapper (.hero-top): 5:2, no fixed height, positioned for the banner pencil. Where the
 * hero sits. `card`: the profile card, whose Card has no top padding, so the banner runs edge to
 * edge from the top (.card.hero .hero-top). `preview`: Edit profile › Name, under the section intro;
 * the banner pulls up into the panel gap with rounded top corners (.edit-hero).
 */
export const profileHeroBannerVariants = cva('relative -mx-4', {
  variants: {
    placement: {
      card: '',
      preview: '-mt-4 overflow-hidden rounded-t-lg',
    },
  },
  defaultVariants: { placement: 'card' },
})

export type ProfileHeroVariants = VariantProps<typeof profileHeroBannerVariants>
