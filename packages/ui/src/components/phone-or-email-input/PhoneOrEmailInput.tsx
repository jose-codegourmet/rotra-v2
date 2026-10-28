'use client'
import { TextInput, type TextInputProps } from '@rotra/ui/text-input'
import { type Ref, useLayoutEffect, useRef } from 'react'
import { caretAfterDigits, countDigitsBeforeCaret, formatIdentifier } from './PhoneOrEmailInput.helpers'
export type PhoneOrEmailInputProps = Omit<TextInputProps, 'value' | 'onChange' | 'ref'> & {
  value: string
  onChange: (value: string) => void
  mode?: 'phone' | 'phone-or-email'
  ref?: Ref<HTMLInputElement>
}
export function PhoneOrEmailInput({ value, onChange, mode = 'phone-or-email', ref, ...props }: PhoneOrEmailInputProps) {
  const input = useRef<HTMLInputElement | null>(null), nextCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (nextCaret.current !== null && input.current && document.activeElement === input.current) input.current.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [value])
  return <TextInput {...props} ref={(element) => { input.current = element; if (typeof ref === 'function') return ref(element); if (ref) ref.current = element }}
    value={value} inputMode={mode === 'phone' ? 'tel' : undefined}
    onChange={(event) => {
      const raw = event.target.value, deleting = (event.nativeEvent as InputEvent).inputType?.startsWith('delete')
      const next = deleting ? raw : formatIdentifier(raw, mode)
      nextCaret.current = next !== raw ? caretAfterDigits(next, countDigitsBeforeCaret(raw, event.target.selectionStart ?? raw.length)) : null
      onChange(next)
    }} />
}
