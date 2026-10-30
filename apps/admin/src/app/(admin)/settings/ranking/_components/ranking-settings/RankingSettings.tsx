'use client'

import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { ConflictError, MockError } from '@rotra/data/mock/errors'
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
import { ErrorState } from '@rotra/ui/error-state'
import { FixedRulesCard } from '@rotra/ui/fixed-rules-card'
import { Notice } from '@rotra/ui/notice'
import { PageHeader } from '@rotra/ui/page-header'
import { RankingInEffectCard } from '@rotra/ui/ranking-in-effect-card'
import { RankingSettingsForm } from '@rotra/ui/ranking-settings-form'
import {
  isRankingDraftDirty,
  rankingSettingsDraftFrom,
} from '@rotra/ui/ranking-settings-form/default-values'
import type {
  RankingSettingsFormInput,
  RankingSettingsFormValues,
} from '@rotra/ui/ranking-settings-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearLeave, selectPendingLeave, setUnsavedDraft } from '@/store/slices/uiSlice'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { RankingSettingsSkeleton } from './RankingSettingsSkeleton'

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

/** The version a draft started from; after a conflict it is older than the one in effect. */
function baseOf(
  versions: RankingPolicyVersion[],
  baseVersion: number,
  effective: RankingPolicyVersion,
) {
  return versions.find((version) => version.version === baseVersion) ?? effective
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
 * rebase or start over; a failed save keeps the draft and the version in effect. Offline, Save
 * configuration sends nothing and says so in the sheet. Leaving with an unsaved draft (the rail, the
 * brand or the browser) asks "Discard your draft?" first.
 */
export function RankingSettings() {
  const policy = useRankingPolicy()
  const save = useSaveRankingSettings()
  const denied = useDenyOnPermissionError(policy.error)
  const { offline } = useAdminConnectivity()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const pendingLeave = useAppSelector(selectPendingLeave)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [conflict, setConflict] = useState<RankingPolicyVersion | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Each refused offline tap counts, so the sheet re-renders and its one-commit guard lets the next
  // tap through.
  const [offlineTaps, setOfflineTaps] = useState(0)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)

  // "Unsaved draft" (cfgDirty): typing back the base values is not a draft worth asking about.
  const dirty =
    draft !== null &&
    policy.data !== undefined &&
    isRankingDraftDirty(
      draft.values,
      formValuesOf(baseOf(policy.data.versions, draft.baseVersion, policy.data.effective)),
    )

  // The shell asks before in-app navigation while this is set; leaving the page clears it.
  useEffect(() => {
    dispatch(setUnsavedDraft(dirty))
  }, [dirty, dispatch])
  useEffect(() => () => void dispatch(setUnsavedDraft(false)), [dispatch])
  // Reloading or closing the tab with a draft gets the browser's own leave prompt.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (denied) return null

  const header = (
    <PageHeader
      title="Ranking settings"
      description="The agreed adjustable settings behind every player's shared rank. Changing them changes the algorithm's settings, never individual match results."
    />
  )
  // A failed refetch keeps the last accepted data (the query keeps it) and the draft lives here,
  // apart from it, so only a first load that fails shows the error.
  if (!policy.data) {
    return (
      <>
        {header}
        {policy.isError ? (
          <ErrorState
            title="Couldn't load the ranking settings."
            onRetry={() => void policy.refetch()}
            retrying={policy.isFetching}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        ) : (
          <RankingSettingsSkeleton />
        )}
      </>
    )
  }

  const { effective, versions } = policy.data
  const baseVersion = draft?.baseVersion ?? effective.version
  // The draft is compared with the version it started from (cfgDirty), which after a conflict is
  // older than the one in effect until they rebase.
  const base = baseOf(versions, baseVersion, effective)
  const values = draft?.values ?? rankingSettingsDraftFrom(formValuesOf(effective))

  const discard = () => {
    setDraft(null)
    setConflict(null)
    setSaveError(null)
  }

  // Discard draft continues the navigation the shell held back.
  const discardAndLeave = () => {
    const destination = pendingLeave
    discard()
    dispatch(setUnsavedDraft(false))
    if (destination) router.push(destination)
  }

  const openReview = (parsed: RankingSettingsFormValues) => {
    if (conflict) return
    setSaveError(null)
    setOfflineTaps(0)
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
    setOfflineTaps(0)
  }

  const confirm = () => {
    if (!review || save.isPending || sending.current) return
    // rotra-admin.html offlineBlock: nothing is sent; the sheet, the draft and the version in effect
    // stay as they are.
    if (offline) {
      save.reset()
      setOfflineTaps((taps) => taps + 1)
      return
    }
    setOfflineTaps(0)
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
        // Connection lost while saving: the same inline reason as a refused tap.
        if (error instanceof MockError && error.kind === 'offline') {
          setOfflineTaps((taps) => taps + 1)
          return
        }
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
        error={offlineTaps ? <>{ADMIN_OFFLINE_ERROR}</> : null}
      />
      <ConfirmSheet
        open={pendingLeave !== null}
        onOpenChange={(open) => {
          if (!open) dispatch(clearLeave())
        }}
        title="Discard your draft?"
        consequence="Your changes to the ranking settings haven't been saved. The values in effect stay the same."
        backLabel="Keep editing"
        confirmLabel="Discard draft"
        onConfirm={discardAndLeave}
        destructive
      />
    </>
  )
}
