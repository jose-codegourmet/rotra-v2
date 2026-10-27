import { cn } from '@rotra/ui/cn'
import { setupStepVariants } from './SetupStepBar.variants'

export type SetupStepState = 'current' | 'done' | 'warn' | 'todo'

export type SetupStep = {
  label: string
  state: SetupStepState
}

export type SetupStepBarProps = {
  steps: SetupStep[]
  onSelect: (index: number) => void
  className?: string
}

const STATE_NAME: Record<SetupStepState, string> = {
  current: ', current step',
  done: ', complete',
  warn: ', needs details',
  todo: '',
}

/** The setup wizard's three clickable steps; the top bar, mark and accessible name carry the state. */
export function SetupStepBar({ steps, onSelect, className }: SetupStepBarProps) {
  return (
    <ol aria-label="Steps" className={cn('m-0 flex list-none gap-1.5 p-0', className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="min-w-0 flex-[1_1_0]">
          <button
            type="button"
            onClick={() => onSelect(index)}
            aria-current={step.state === 'current' ? 'step' : undefined}
            aria-label={`Step ${index + 1}, ${step.label}${STATE_NAME[step.state]}`}
            className={setupStepVariants({ state: step.state })}
          >
            <span
              className={cn(
                'font-mono text-[11px]',
                step.state === 'done' && 'font-extrabold text-accent',
                step.state === 'warn' && 'font-extrabold text-warn',
              )}
            >
              {step.state === 'done' ? '✓' : step.state === 'warn' ? '!' : index + 1}
            </span>
            <span className="max-[520px]:hidden">{step.label}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
