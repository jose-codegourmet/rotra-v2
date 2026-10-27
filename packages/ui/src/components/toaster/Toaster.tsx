'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

// The prototypes' .toast: a short inverted pill (foreground colour as background) near the bottom
// centre, above the phone dock, gone after 3.6 s.
const TOAST_MS = 3600

const toastClass = cn(
  'pointer-events-auto flex w-full items-start gap-2 rounded-lg bg-fg px-3.5 py-2.5 text-sm font-semibold text-bg shadow-pop',
)

/** Mount once per app (src/providers). Toasts are announced politely and never take focus. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      mobileOffset={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      gap={8}
      duration={TOAST_MS}
      toastOptions={{ unstyled: true, classNames: { toast: toastClass } }}
      style={{ width: 'min(440px, calc(100vw - 32px))' }}
    />
  )
}

/**
 * Shows a toast. `toast('Match 3 started')` confirms a saved action; `toast.error(...)` reports a
 * failure (with an alert icon and longer on screen). Copy comes from the prototype.
 */
export const toast = Object.assign((message: string) => sonnerToast(message), {
  success: (message: string) => sonnerToast(message),
  error: (message: string) =>
    sonnerToast(message, {
      duration: TOAST_MS * 1.5,
      icon: <Icon name="alert" className="mt-0.5 flex-none" />,
    }),
})
