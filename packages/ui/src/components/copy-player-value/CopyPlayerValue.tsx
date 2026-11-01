'use client'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
export type CopyPlayerValueProps = { value: string; onClose: () => void }
export function CopyPlayerValue({ value, onClose }: CopyPlayerValueProps) {
  return (
    <Sheet
      open={!!value}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Copy manually"
    >
      <p>Clipboard access was blocked. Select and copy this value.</p>
      <TextInput
        aria-label="Value to copy"
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
      />
    </Sheet>
  )
}
