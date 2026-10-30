'use client'

import { ConflictError } from '@rotra/data/mock/errors'
import {
  basisPointsToPercent,
  diffRows,
  percentToBasisPoints,
} from '@rotra/data/ranking-settings/rules'
import type { RankingDraft, RankingPolicyVersion } from '@rotra/data/ranking-settings/types'
import { useRankingPolicy } from '@rotra/data/ranking-settings/useRankingPolicy'
import { useSaveRankingSettings } from '@rotra/data/ranking-settings/useSaveRankingSettings'
import { ConfigConflictNotice } from '@rotra/ui/config-conflict-notice'
import { ConfigDiff } from '@rotra/ui/config-diff'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { FixedRulesCard } from '@rotra/ui/fixed-rules-card'
import { Notice } from '@rotra/ui/notice'
import { PageHeader } from '@rotra/ui/page-header'
import { RankingInEffectCard } from '@rotra/ui/ranking-in-effect-card'
import { RankingSettingsForm } from '@rotra/ui/ranking-settings-form'
import { rankingSettingsDraftFrom } from '@rotra/ui/ranking-settings-form/default-values'
import type {
  RankingSettingsFormInput,
  RankingSettingsFormValues,
} from '@rotra/ui/ranking-settings-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'

/** The draft as typed, with the version it was started from (rotra-admin.html S.ui.cfg). */
type Draft = { values: RankingSettingsFormInput; baseVersion: number }

/** What D-CONFIG is reviewing: the parsed draft and the version it would replace. */
type Review = { draft: RankingDraft; baseVersion: number }

/** rotra-admin.html shows the lead of a failed save in bold. */
const SAVE_FAILED_LEAD = "Couldn't save."

function formValuesOf(version: RankingPolicyVersion): RankingSettingsFormValues {
  return {
    assessmentPercent: basisPointsToPercent(version.assessmentWeightBp),
    performancePercent: basisPointsToPercent(version.performanceWeightBp),
    recentStandardMatchThreshold: version.recentStandardMatchThreshold,
  }
}

function SaveFailedNotice({ message }: { message: string }) {
  if (!message.startsWith(SAVE_FAILED_LEAD)) return <Notice tone="error">{message}</Notice>
  return (
    <Notice tone="error" title={SAVE_FAILED_LEAD}>
      {message.slice(SAVE_FAILED_LEAD.length).trim()}
    </Notice>
  )
}

/**
 * A-RANK-CONFIG: the draft lives here with the version it was based on, apart from the version in
 * effect (useRankingPolicy), so public copy and In effect never show unsaved values. Review changes
 * opens D-CONFIG; Save configuration appends a new version. A conflict keeps the draft and offers to
 * rebase or start over; a failed save keeps the draft and the version in effect.
 */
export function RankingSettings() {
  const policy = useRankingPolicy()
  const save = useSaveRankingSettings()
  const denied = useDenyOnPermissionError(policy.error)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [conflict, setConflict] = useState<RankingPolicyVersion | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)

  if (denied) return null

  const header = (
    <PageHeader
      title="Ranking settings"
      description="The agreed adjustable settings behind every player's shared rank. Changing them changes the algorithm's settings, never individual match results."
    />
  )
  // Loading and a failed load are A04.8.
  if (!policy.data) return header

  const { effective, versions } = policy.data
  const baseVersion = draft?.baseVersion ?? effective.version
  // The draft is compared with the version it started from (cfgDirty), which after a conflict is
  // older than the one in effect until they rebase.
  const base = versions.find((version) => version.version === baseVersion) ?? effective
  const values = draft?.values ?? rankingSettingsDraftFrom(formValuesOf(effective))

  const discard = () => {
    setDraft(null)
    setConflict(null)
    setSaveError(null)
  }

  const openReview = (parsed: RankingSettingsFormValues) => {
    if (conflict) return
    setSaveError(null)
    setReview({
      draft: {
        assessmentWeightBp: percentToBasisPoints(parsed.assessmentPercent),
        performanceWeightBp: percentToBasisPoints(parsed.performancePercent),
        recentStandardMatchThreshold: parsed.recentStandardMatchThreshold,
      },
      baseVersion,
    })
  }

  const closeReview = () => {
    if (save.isPending) return
    setReview(null)
  }

  const confirm = () => {
    if (!review || save.isPending || sending.current) return
    sending.current = true
    save.mutate(review, {
      onSettled: () => {
        sending.current = false
      },
      onSuccess: (saved) => {
        setReview(null)
        discard()
        toast(`Saved. Version ${saved.version} is in effect.`)
      },
      onError: (error) => {
        setReview(null)
        if (error instanceof ConflictError) {
          setConflict(error.current as RankingPolicyVersion)
          return
        }
        setSaveError(error.message)
      },
    })
  }

  return (
    <>
      {header}
      {conflict ? (
        <ConfigConflictNotice
          currentVersion={conflict.version}
          baseVersion={baseVersion}
          onRebase={() => {
            setDraft({ values, baseVersion: conflict.version })
            setConflict(null)
          }}
          onStartOver={discard}
        />
      ) : null}
      {saveError ? <SaveFailedNotice message={saveError} /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <RankingSettingsForm
            values={values}
            baseline={formValuesOf(base)}
            onChange={(next) => setDraft({ values: next, baseVersion })}
            onSubmit={openReview}
            onDiscard={discard}
            locked={conflict !== null}
          />
          <FixedRulesCard />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <RankingInEffectCard effective={effective} versions={versions} />
        </div>
      </div>
      <ConfirmSheet
        open={review !== null}
        onOpenChange={(open) => {
          if (!open) closeReview()
        }}
        title="Save configuration?"
        summary={review ? <ConfigDiff rows={diffRows(effective, review.draft)} /> : null}
        consequence={`This saves version ${effective.version + 1}. It applies to every player's shared rank and to the overall leaderboard.`}
        notice={
          <Notice tone="warn">
            Whether existing ranks are recalculated right away or only from now on hasn't been
            decided. Don't tell players their rank changed until that's settled.
          </Notice>
        }
        confirmLabel={save.isPending ? 'Saving…' : 'Save configuration'}
        backLabel="Keep editing"
        onConfirm={confirm}
        isPending={save.isPending}
      />
    </>
  )
}
