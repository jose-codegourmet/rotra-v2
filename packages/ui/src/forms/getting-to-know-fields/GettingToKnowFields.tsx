'use client'
import type { GettingToKnowValues } from '@rotra/schema/getting-to-know'
import { type CourtPosition, CourtPositionCard } from '@rotra/ui/court-position-card'
import { FavoritePlayerChips } from '@rotra/ui/favorite-player-chips'
import { ShotChips } from '@rotra/ui/shot-chips'
import { Controller, useFormContext } from 'react-hook-form'

export type GettingToKnowSection = 'court' | 'shots' | 'favorite'

export type GettingToKnowFieldsProps = {
  /** Which pickers to show; the onboarding shows one per step, Edit profile all three */
  sections: GettingToKnowSection[]
  /** Edit profile: a "Where you play · public" style label above each picker. Onboarding leaves it off (the step heading asks). */
  labelled?: boolean
  /** Image per position; defaults to the player app's /art/onboarding/court-*.webp */
  courtArt?: Record<CourtPosition, string>
  disabled?: boolean
}

const DEFAULT_COURT_ART: Record<CourtPosition, string> = {
  front: '/art/onboarding/court-front.webp',
  back: '/art/onboarding/court-back.webp',
  all: '/art/onboarding/court-all.webp',
}

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-fg2">
        {children} · <span className="text-xs font-normal">public</span>
      </span>
      {hint ? <span className="text-xs text-fg2">{hint}</span> : null}
    </div>
  )
}

/**
 * Where you play, Shots you know and Favorite badminton player (D-2026-11-19-11), wired to the
 * parent form's context (GettingToKnowValues). Used by the onboarding steps 2 to 4 and Edit profile ›
 * Playing style.
 */
export function GettingToKnowFields({
  sections,
  labelled = false,
  courtArt = DEFAULT_COURT_ART,
  disabled = false,
}: GettingToKnowFieldsProps) {
  const {
    control,
    formState: { errors },
    getValues,
  } = useFormContext<GettingToKnowValues>()
  return (
    <div className="flex flex-col gap-5">
      {sections.includes('court') ? (
        <div className="flex flex-col gap-2.5">
          {labelled ? <Label>Where you play</Label> : null}
          <Controller
            control={control}
            name="playStyle"
            render={({ field }) => (
              <CourtPositionCard
                value={field.value}
                art={courtArt}
                disabled={disabled}
                onChange={(next) => field.onChange(next === field.value ? '' : next)}
              />
            )}
          />
        </div>
      ) : null}
      {sections.includes('shots') ? (
        <div className="flex flex-col gap-2.5">
          {labelled ? <Label hint="Pick all that apply.">Shots you know</Label> : null}
          <Controller
            control={control}
            name="shots"
            render={({ field: shots }) => (
              <Controller
                control={control}
                name="shotsOther"
                render={({ field: own }) => (
                  <ShotChips
                    value={shots.value}
                    onChange={shots.onChange}
                    ownShots={own.value}
                    onOwnShotsChange={own.onChange}
                    defaultOthersOpen={getValues('shotsOther').length > 0}
                  />
                )}
              />
            )}
          />
        </div>
      ) : null}
      {sections.includes('favorite') ? (
        <div className="flex flex-col gap-2.5">
          {labelled ? <Label>Favorite badminton player</Label> : null}
          <Controller
            control={control}
            name="favoritePlayer"
            render={({ field: pick }) => (
              <Controller
                control={control}
                name="favoritePlayerOther"
                render={({ field: other }) => (
                  <FavoritePlayerChips
                    value={pick.value}
                    onChange={pick.onChange}
                    otherName={other.value}
                    onOtherNameChange={other.onChange}
                    error={errors.favoritePlayerOther?.message}
                    disabled={disabled}
                  />
                )}
              />
            )}
          />
        </div>
      ) : null}
    </div>
  )
}
