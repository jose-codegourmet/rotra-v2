import { cva, type VariantProps } from 'class-variance-authority'

// rotra-admin.html .who .main second line: viewPlayers() puts the nickname under the name
// (.small.muted, in quotes); request rows and the request review put the RTR ID there (.mono.small.muted).
export const playerIdentityCellVariants = cva('text-fg2 [overflow-wrap:anywhere]', {
  variants: {
    variant: {
      directory: 'text-[13px]',
      request: 'font-mono text-xs',
    },
  },
  defaultVariants: { variant: 'directory' },
})

export type PlayerIdentityCellVariants = VariantProps<typeof playerIdentityCellVariants>
