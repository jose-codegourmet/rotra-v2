'use client'

import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { FeatureFlag } from '@rotra/data/feature-flag/types'
import { useFeatureFlags } from '@rotra/data/feature-flag/useFeatureFlags'
import { useSetFeatureFlagValue } from '@rotra/data/feature-flag/useSetFeatureFlagValue'
import { ConflictError } from '@rotra/data/mock/errors'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { FeatureFlagRow } from '@rotra/ui/feature-flag-row'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { PageHeader } from '@rotra/ui/page-header'
import { toast } from '@rotra/ui/toaster'
import { Fragment, type ReactNode, useRef, useState } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { AddFlagSheet } from '../add-flag-sheet/AddFlagSheet'
import { FeatureFlagsSkeleton } from './FeatureFlagsSkeleton'

const valueLabel = (on: boolean) => (on ? 'On' : 'Off')

/**
 * A-FEATURE-FLAGS: the platform owner's flags, Add flag (A-ADD-FLAG) and the value confirmation.
 * A row's switch never changes the value itself: it opens the confirmation on the flag as it was
 * when pressed (its revision included), and only Turn on / Turn off saves. Back leaves it unchanged.
 * Offline the list stays readable; Turn on / Turn off sends nothing and says so in the sheet.
 */
export function FeatureFlags() {
  const flags = useFeatureFlags()
  const setValue = useSetFeatureFlagValue()
  const denied = useDenyOnPermissionError(flags.error)
  const { offline } = useAdminConnectivity()
  const [adding, setAdding] = useState(false)
  // The flag as it was when its switch was pressed; the confirmation reads only this.
  const [confirming, setConfirming] = useState<FeatureFlag | null>(null)
  // A fresh node per refused tap (offline), so the sheet's one-commit guard lets the next tap through.
  const [confirmError, setConfirmError] = useState<ReactNode>(null)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)

  if (denied) return null

  const requestToggle = (key: string) => {
    const flag = flags.data?.find((item) => item.key === key)
    if (!flag || setValue.isPending) return
    setValue.reset()
    setConfirmError(null)
    setConfirming(flag)
  }

  const closeConfirm = () => {
    if (setValue.isPending) return
    setConfirming(null)
    setConfirmError(null)
  }

  const confirm = () => {
    if (!confirming || setValue.isPending || sending.current) return
    // rotra-admin.html offlineBlock: nothing is sent; the sheet stays with the value unchanged.
    if (offline) {
      setValue.reset()
      setConfirmError(<>{ADMIN_OFFLINE_ERROR}</>)
      return
    }
    sending.current = true
    setConfirmError(null)
    setValue.mutate(
      { key: confirming.key, on: !confirming.on, revision: confirming.revision },
      {
        onSettled: () => {
          sending.current = false
        },
        onSuccess: (saved) => {
          setConfirming(null)
          toast(`${saved.name} is ${saved.on ? 'on' : 'off'}.`)
        },
        onError: (error) => {
          // Changed elsewhere: this confirmation is stale, so close it; the list shows the flag now.
          if (error instanceof ConflictError) {
            setConfirming(null)
            toast.error(error.message)
            return
          }
          setConfirmError(error.message)
        },
      },
    )
  }

  const next = confirming ? !confirming.on : false
  const list = flags.data ?? []

  return (
    <>
      <PageHeader
        title="Feature flags"
        description="Switches for platform behavior. Each flag says what it does."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add flag
          </Button>
        }
      />
      {flags.isError && !flags.data ? (
        <Card>
          <ErrorState
            title="Couldn't load the feature flags."
            onRetry={() => void flags.refetch()}
            retrying={flags.isFetching}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        </Card>
      ) : !flags.data ? (
        <FeatureFlagsSkeleton />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title="No feature flags yet."
            action={
              <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                Add flag
              </Button>
            }
          >
            Add a flag to describe a switch and what it does. New flags start off.
          </EmptyState>
        </Card>
      ) : (
        <Card asChild className="flex flex-col gap-3">
          <section aria-label="Feature flags">
            {list.map((flag, index) => (
              <Fragment key={flag.key}>
                {index > 0 ? <hr className="my-1 border-0 border-t border-border" /> : null}
                <FeatureFlagRow
                  flag={flag}
                  lastChangedBy={flag.changedByEmail}
                  onRequestToggle={requestToggle}
                  disabled={setValue.isPending && confirming?.key === flag.key}
                />
              </Fragment>
            ))}
          </section>
        </Card>
      )}
      <p className="m-0 text-[13px] text-fg2">
        No flag can change confirmed winners or scores, or bring back lost offline records.
      </p>
      <AddFlagSheet open={adding} onOpenChange={setAdding} />
      <ConfirmSheet
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) closeConfirm()
        }}
        title={confirming ? `Turn ${next ? 'on' : 'off'} ${confirming.name}?` : ''}
        summary={
          confirming ? (
            <KeyValueList
              items={[
                { label: 'Now', value: valueLabel(confirming.on) },
                { label: 'After saving', value: valueLabel(next) },
              ]}
            />
          ) : null
        }
        consequence={confirming?.description ?? ''}
        note="Saving here doesn't prove an offline Queue device has the change. When devices pick it up hasn't been decided."
        confirmLabel={setValue.isPending ? 'Saving…' : `Turn ${next ? 'on' : 'off'}`}
        onConfirm={confirm}
        isPending={setValue.isPending}
        error={confirmError}
      />
    </>
  )
}
