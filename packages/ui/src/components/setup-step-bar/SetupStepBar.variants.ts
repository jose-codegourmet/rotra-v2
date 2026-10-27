import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .wiz-steps button: a 3 px top bar whose colour and glow carry the step state,
// always paired with ✓ / ! / the number and the accessible name.
export const setupStepVariants = cva(
  [
    'flex w-full min-w-0 flex-col items-start gap-0.5 border-0 border-t-[3px] bg-transparent px-0.5 pt-2 text-left text-xs font-semibold',
    'hover:text-fg max-[520px]:items-center',
  ],
  {
    variants: {
      state: {
        current: 'border-t-accent text-fg',
        done: 'border-t-accent text-fg shadow-[0_-5px_12px_-5px_color-mix(in_srgb,var(--accent)_85%,transparent)]',
        warn: 'border-t-warn text-fg2',
        todo: 'border-t-border-strong text-fg2',
      },
    },
    defaultVariants: { state: 'todo' },
  },
)

export type SetupStepVariants = VariantProps<typeof setupStepVariants>
