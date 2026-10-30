import { cva, type VariantProps } from 'class-variance-authority'

// rotra-admin.html .logo (36 px, radius 10), .logo.lg (56 px, radius 14) and .logo.acc.
export const clubLogoVariants = cva(
  'grid flex-none place-items-center overflow-hidden border font-extrabold tracking-[0.5px] select-none',
  {
    variants: {
      size: {
        sm: 'size-9 rounded-[10px] text-xs',
        lg: 'size-14 rounded-[14px] text-[17px]',
      },
      tone: {
        default: 'border-border-strong bg-elev text-fg',
        accent: 'border-accent bg-accent text-on-accent',
      },
    },
    defaultVariants: { size: 'sm', tone: 'default' },
  },
)

export type ClubLogoVariants = VariantProps<typeof clubLogoVariants>
