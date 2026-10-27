import { cva, type VariantProps } from 'class-variance-authority'

// Sizes the prototypes use: 24 (court sides, history), 28 (queue tiles), 36 (default .avatar),
// 40 (queue cards on touch), 44 (payments), 52 (.avatar.lg and match dialog cards), 64 (.avatar.xl),
// 88 (.avatar.xxl club logo).
export const avatarVariants = cva(
  'inline-grid flex-none place-items-center overflow-hidden font-bold select-none',
  {
    variants: {
      size: {
        24: 'size-6 text-[10px]',
        28: 'size-7 text-[11px]',
        36: 'size-9 text-[13px]',
        40: 'size-10 text-sm',
        44: 'size-11 text-[15px]',
        52: 'size-[52px] text-lg',
        64: 'size-16 text-xl',
        88: 'size-[88px] text-[30px]',
      },
      shape: { circle: 'rounded-full', square: 'rounded-[14px]' },
      tone: {
        neutral: 'bg-elev text-fg2',
        accent: 'bg-accent font-extrabold text-on-accent',
      },
    },
    compoundVariants: [
      { shape: 'square', size: 88, className: 'rounded-[20px]' },
      { shape: 'square', size: 64, className: 'rounded-2xl' },
    ],
    defaultVariants: { size: 36, shape: 'circle', tone: 'neutral' },
  },
)

export type AvatarVariants = VariantProps<typeof avatarVariants>
