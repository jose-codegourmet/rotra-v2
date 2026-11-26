import { Chip, type ChipProps } from '@rotra/ui/chip'

export type NotRankedChipProps = Omit<ChipProps, 'tone' | 'children'>

/** The "Not ranked" chip of a session with Record games off: the console header and the session record. */
export function NotRankedChip(props: NotRankedChipProps) {
  return (
    <Chip tone="warn" {...props}>
      Not ranked
    </Chip>
  )
}
