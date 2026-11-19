import { Chip, type ChipProps } from '@rotra/ui/chip'

export type NotRecordedChipProps = Omit<ChipProps, 'tone' | 'children'>

/** The "Not recorded" chip of a session with Record games off: the console header and the session record. */
export function NotRecordedChip(props: NotRecordedChipProps) {
  return (
    <Chip tone="warn" {...props}>
      Not recorded
    </Chip>
  )
}
