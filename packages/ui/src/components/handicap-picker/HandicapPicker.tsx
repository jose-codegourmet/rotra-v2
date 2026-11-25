'use client'

import {
  HANDICAP_SPOTS,
  type HandicapSpot,
  handicapLabel,
  handicapSpotsOf,
} from '@rotra/data/session-roster/handicap'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

/** The still of the Higgsfield figure (the mockup's art/handicap-figure.png, 490 × 1008). */
export const HANDICAP_FIGURE_SRC = '/art/handicap/handicap-figure.png'

/**
 * Each spot's 44 × 44 px tap area (left, top) in the 220 × 226 px figure area, and the dot inside
 * it on the joint in the art (the mockup's HC_SPOTS box and at, drawn 220 px tall). The boxes never
 * overlap. The figure faces you, so the player's left is on your right.
 */
const SPOTS: Record<HandicapSpot, { box: [number, number]; dot: [number, number] }> = {
  left_shoulder: { box: [110, 4], dot: [17.5, 40.7] },
  right_shoulder: { box: [66, 4], dot: [26.5, 40.7] },
  left_elbow: { box: [136, 50], dot: [5.6, 27.9] },
  right_elbow: { box: [40, 50], dot: [38.4, 27.9] },
  left_wrist: { box: [146, 94], dot: [5.0, 13.6] },
  right_wrist: { box: [30, 94], dot: [39.0, 13.6] },
  lower_back: { box: [88, 72], dot: [22.0, 21.8] },
  left_knee: { box: [110, 138], dot: [21.2, 12.6] },
  right_knee: { box: [66, 138], dot: [22.2, 12.6] },
  left_ankle: { box: [114, 182], dot: [21.5, 11.2] },
  right_ankle: { box: [62, 182], dot: [21.8, 11.2] },
}

export type HandicapPickerProps = {
  /** The marked spots */
  value: readonly HandicapSpot[]
  onChange: (spots: HandicapSpot[]) => void
  /** The shown name, for the group's name and the hint */
  who: string
  disabled?: boolean
  /** Defaults to the still in the Queue app's public folder */
  figureSrc?: string
  className?: string
}

/**
 * Handicap · tonight (D-2026-11-25-03): a front-facing figure with eleven tappable spots, each a
 * real button with its name; a marked spot fills with the warning colour, glows and pulses (a
 * still ring with reduced motion). Under it, a chip per marked spot with a remove button, or
 * "No handicap", and the hint. The mockup's Rive breathing loop is not here: the Rive runtime is a
 * new dependency that needs a decision, so the still shows (as the mockup does without Rive).
 */
export function HandicapPicker({
  value,
  onChange,
  who,
  disabled = false,
  figureSrc = HANDICAP_FIGURE_SRC,
  className,
}: HandicapPickerProps) {
  const marked = handicapSpotsOf(value)
  const toggle = (spot: HandicapSpot) =>
    onChange(
      marked.includes(spot) ? marked.filter((s) => s !== spot) : handicapSpotsOf([...marked, spot]),
    )
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: the prototype's figure is a named group of toggle buttons */}
      <div
        role="group"
        aria-label={`Where ${who} has a handicap`}
        className="relative mx-auto h-[226px] w-[220px] flex-none"
      >
        <img
          src={figureSrc}
          alt=""
          draggable={false}
          className="pointer-events-none absolute top-0 left-1/2 h-[220px] w-[107px] -translate-x-1/2 select-none"
        />
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 text-[10px] leading-none text-fg2"
        >
          Right
        </span>
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 text-[10px] leading-none text-fg2"
        >
          Left
        </span>
        {HANDICAP_SPOTS.map(({ code, label }) => {
          const on = marked.includes(code)
          const { box, dot } = SPOTS[code]
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              aria-label={label}
              title={label}
              disabled={disabled}
              onClick={() => toggle(code)}
              style={{ left: box[0], top: box[1] }}
              className="group/spot absolute size-11 cursor-pointer rounded-[10px] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed"
            >
              <span
                style={{ left: dot[0], top: dot[1] }}
                className={cn(
                  'pointer-events-none absolute h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
                  code === 'lower_back' ? 'w-[26px]' : 'w-3',
                  on
                    ? 'border-warn bg-warn shadow-[0_0_8px_2px_color-mix(in_srgb,var(--warn)_55%,transparent)]'
                    : 'border-fg2 bg-surface group-hover/spot:border-warn',
                )}
              >
                {on ? (
                  <span className="absolute -inset-0.5 animate-ping rounded-[inherit] border-2 border-warn motion-reduce:scale-[1.7] motion-reduce:animate-none motion-reduce:opacity-45" />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
      <div aria-live="polite" className="flex flex-wrap items-center gap-2">
        {marked.length ? (
          marked.map((spot) => (
            <span
              key={spot}
              className="inline-flex h-8 items-center gap-0.5 rounded-full border border-warn/45 bg-warn-subtle py-0 pr-0.5 pl-3 text-[13px] text-warn"
            >
              <b className="font-semibold">{handicapLabel(spot)}</b>
              <button
                type="button"
                aria-label={`Clear ${handicapLabel(spot).toLowerCase()}`}
                title="Remove"
                disabled={disabled}
                onClick={() => toggle(spot)}
                className="relative grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit after:absolute after:-inset-2 hover:bg-warn/15 disabled:cursor-not-allowed"
              >
                <Icon name="x" size={14} />
              </button>
            </span>
          ))
        ) : (
          <Chip>No handicap</Chip>
        )}
      </div>
      <span className="-mt-1.5 text-xs text-fg2">
        Tap a spot to mark it, tap again to clear. Generate matches rests {who} after 1 game in a
        row (Hard mode: 2). Only you see it, and it clears when the session ends.
      </span>
    </div>
  )
}
