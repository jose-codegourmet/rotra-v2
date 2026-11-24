import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { ProgressBar } from '@rotra/ui/progress-bar'
import { RotraLogo } from '@rotra/ui/rotra-logo'
import type { ReactNode } from 'react'

export type OnboardingFrameProps = {
  /** 1 to 4 */
  step: number
  /** Total steps; the prototype always has 4 */
  totalSteps?: number
  /** The step's name, e.g. "Your details" */
  stepName: string
  /** Hint at the start of the footer, e.g. "Next: 3 quick questions" (step 1 only) */
  hint?: ReactNode
  /** Back button; omit on step 1 of a fresh sign-up */
  onBack?: () => void
  backLabel?: string
  /** Skip button; shown on the question steps */
  onSkip?: () => void
  /** Continue / Finish */
  primaryLabel: string
  /** Click handler; omit when the primary button submits a form through primaryFormId */
  onPrimary?: () => void
  /** Makes the primary button a submit button for the form with this id */
  primaryFormId?: string
  primaryPending?: boolean
  /** Right of the logo in the header, e.g. the prototype button; opt-in */
  headerAction?: ReactNode
  /** Replaces the whole footer row when the default buttons do not fit */
  footer?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * P-ONBOARD's fullscreen frame (.ob): sticky header with the logo, "Step N of 4 · name" and a
 * progress bar, the content column, and a fixed footer. No top bar or dock. On phones inputs
 * inside are 48 px tall with 16 px text so the page does not zoom.
 */
export function OnboardingFrame({
  step,
  totalSteps = 4,
  stepName,
  hint,
  onBack,
  backLabel = 'Back',
  onSkip,
  primaryLabel,
  onPrimary,
  primaryFormId,
  primaryPending,
  headerAction,
  footer,
  className,
  children,
}: OnboardingFrameProps) {
  return (
    <main className={cn('flex min-h-dvh flex-col bg-bg text-fg', className)}>
      <header className="sticky top-0 z-[5] flex flex-col gap-2.5 border-b border-border bg-bg/95 px-4 pt-3.5 pb-3 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-3">
          <RotraLogo variant="responsive" />
          <span className="flex items-center gap-2.5">
            <span className="text-[13px] text-fg2">
              Step {step} of {totalSteps} · {stepName}
            </span>
            {headerAction}
          </span>
        </div>
        <div className="mx-auto w-full max-w-[640px]">
          <ProgressBar
            value={step}
            max={totalSteps}
            size="sm"
            aria-label={`Onboarding: step ${step} of ${totalSteps}`}
          />
        </div>
      </header>
      <div
        className={cn(
          'mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-3 pt-5 pb-[120px] min-[641px]:px-4',
          '[&_input]:min-h-12 [&_input]:text-base [&_select]:min-h-12 [&_select]:text-base [&_textarea]:text-base',
        )}
      >
        {children}
      </div>
      <footer className="fixed inset-x-0 bottom-0 z-[5] border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-3">
          {footer ?? (
            <>
              {onBack ? (
                <Button variant="ghost" onClick={onBack}>
                  {backLabel}
                </Button>
              ) : hint ? (
                <span className="text-[13px] text-fg2">{hint}</span>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                {onBack && hint ? <span className="text-[13px] text-fg2">{hint}</span> : null}
                {onSkip ? (
                  <Button variant="ghost" onClick={onSkip}>
                    Skip
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  type={primaryFormId ? 'submit' : 'button'}
                  form={primaryFormId}
                  onClick={onPrimary}
                  loading={primaryPending}
                >
                  {primaryLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </footer>
    </main>
  )
}
