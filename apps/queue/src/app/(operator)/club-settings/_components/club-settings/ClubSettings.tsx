'use client'

import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { useClub } from '@rotra/data/club'
import { DEFAULT_COURT_RULES, DEFAULT_POST_TEMPLATE, POST_KEYS } from '@rotra/data/club/rules'
import type { Club } from '@rotra/data/club/types'
import { useCancelClubNameChange } from '@rotra/data/club/useCancelClubNameChange'
import { useChangeClubPassword } from '@rotra/data/club/useChangeClubPassword'
import { usePostPreview } from '@rotra/data/club/usePostPreview'
import { useRequestClubNameChange } from '@rotra/data/club/useRequestClubNameChange'
import { useResetFacebookPostTemplate } from '@rotra/data/club/useResetFacebookPostTemplate'
import { useSaveFacebookPost } from '@rotra/data/club/useSaveFacebookPost'
import { useUpdateClubLogo } from '@rotra/data/club/useUpdateClubLogo'
import { useUpdateSessionDefaults } from '@rotra/data/club/useUpdateSessionDefaults'
import { useDeviceDownloads } from '@rotra/data/device/useDeviceDownloads'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { licensePaymentsCsv } from '@rotra/data/license/fetchers'
import { useClubLicense } from '@rotra/data/license/useClubLicense'
import { useLicensePayments } from '@rotra/data/license/useLicensePayments'
import { MockError } from '@rotra/data/mock/errors'
import { useNowCard } from '@rotra/data/queue-session/useNowCard'
import { useSyncState } from '@rotra/data/sync/useSyncState'
import { formatPeso } from '@rotra/schema/money'
import { useAppShell } from '@rotra/ui/app-shell'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ClubIdentityPanel } from '@rotra/ui/club-identity-panel'
import { ClubSettingsMenu, type ClubSettingsSection } from '@rotra/ui/club-settings-menu'
import { FacebookPostEditor, type PostDraft } from '@rotra/ui/facebook-post-editor'
import { ChangePasswordForm } from '@rotra/ui/forms/change-password-form'
import { LicensePanel } from '@rotra/ui/license-panel'
import { Notice } from '@rotra/ui/notice'
import { PostPreviewSheet } from '@rotra/ui/post-preview-sheet'
import { SessionDefaultsPanel } from '@rotra/ui/session-defaults-panel'
import { SignOutSheet } from '@rotra/ui/sign-out-sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { ThisDevicePanel } from '@rotra/ui/this-device-panel'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { shortDateLabel } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import { useOperatorShell } from '../../../_components/operator-shell/DockAction.context'
import { slugFromSection } from './sections'

const POST_KEY_LIST = POST_KEYS.map(([key, label]) => ({ key, label }))

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

function draftOf(club: Club): PostDraft {
  return {
    template: club.postTemplate ?? DEFAULT_POST_TEMPLATE,
    description: club.description,
    courtRules: club.courtRules ?? DEFAULT_COURT_RULES,
  }
}

/** Facebook post section: the editor's draft, save, reset and the preview dialog. */
function FacebookPostSection({ club }: { club: Club }) {
  const [draft, setDraft] = useState(() => draftOf(club))
  const [previewOpen, setPreviewOpen] = useState(false)
  const save = useSaveFacebookPost()
  const reset = useResetFacebookPostTemplate()
  const nowCard = useNowCard()
  const saved = draftOf(club)
  const dirty =
    draft.template !== saved.template ||
    draft.description !== saved.description ||
    draft.courtRules !== saved.courtRules
  return (
    <>
      <FacebookPostEditor
        draft={draft}
        onDraftChange={setDraft}
        keys={POST_KEY_LIST}
        dirty={dirty}
        canPreview={Boolean(nowCard.data?.live ?? nowCard.data?.upcoming)}
        onPreview={() => setPreviewOpen(true)}
        isPending={save.isPending || reset.isPending}
        onSave={(values) =>
          save.mutate(values, {
            onSuccess: () => toast('Post template saved'),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
        onReset={() =>
          reset.mutate(undefined, {
            onSuccess: () => {
              setDraft((d) => ({ ...d, template: DEFAULT_POST_TEMPLATE }))
              toast('Template reset to the default')
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
      {previewOpen ? (
        <PostPreview draft={draft} dirty={dirty} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </>
  )
}

function PostPreview({
  draft,
  dirty,
  onClose,
}: {
  draft: PostDraft
  dirty: boolean
  onClose: () => void
}) {
  const preview = usePostPreview(draft)
  const data = preview.data
  return (
    <PostPreviewSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      sessionTitle={data?.sessionTitle ?? '…'}
      dateLabel={data ? '' : ''}
      text={preview.isPending ? 'Filling in the post…' : (data?.text ?? 'No session to preview.')}
      includesUnsaved={dirty}
    />
  )
}

function LicenseSection({ clubName }: { clubName: string }) {
  const license = useClubLicense()
  const payments = useLicensePayments()
  if (!license.data || !payments.data) return <Skeleton className="h-64 rounded-lg" />
  const exportCsv = () => {
    try {
      const rows = payments.data ?? []
      const blob = new Blob([licensePaymentsCsv(rows)], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-license-payments.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('License payments exported')
    } catch {
      toast.error('This browser blocked the download')
    }
  }
  return (
    <LicensePanel
      status={license.data.status}
      plan={license.data.plan}
      activeSince={license.data.activeSince}
      activeUntil={license.data.activeUntil}
      daysLeft={license.data.daysLeft}
      payments={payments.data}
      onExport={exportCsv}
      sampleAmounts
    />
  )
}

function DeviceSection() {
  const downloads = useDeviceDownloads()
  if (!downloads.data) return <Skeleton className="h-40 rounded-lg" />
  return (
    <ThisDevicePanel
      downloaded={downloads.data
        .filter((d) => d.state === 'ready')
        .map((d) => ({ sessionId: d.sessionId, title: d.title, startsAt: d.startsAt }))}
    />
  )
}

export type ClubSettingsProps = { section: ClubSettingsSection }

/** Q-CLUB: the settings menu and the chosen section, plus Sign out (D-SIGN-OUT). */
export function ClubSettings({ section }: ClubSettingsProps) {
  const router = useRouter()
  const shell = useAppShell()
  const { settingsMenuOpen, setSettingsMenuOpen } = useOperatorShell()
  const offline = useAppSelector(selectDev).offline
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const club = useClub(clubId)
  const sync = useSyncState()
  const nowCard = useNowCard()

  const logo = useUpdateClubLogo()
  const requestName = useRequestClubNameChange()
  const cancelName = useCancelClubNameChange()
  const defaults = useUpdateSessionDefaults()
  const password = useChangeClubPassword()
  const signOut = useSignOut('club')
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [passwordReset, setPasswordReset] = useState(0)

  const openSignOut = () => {
    setSettingsMenuOpen(false)
    shell.closeDrawer()
    setSignOutOpen(true)
  }

  const page = (children: React.ReactNode) => (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      <h1>Club settings</h1>
      {children}
    </main>
  )

  if (offline) {
    return page(
      <Card className="flex max-w-[560px] flex-col gap-3">
        <Notice tone="warn" title="Club settings need an internet connection.">
          Your club details, license and account are kept online, so they can't be viewed or changed
          while you're offline.
        </Notice>
        <p className="m-0 text-[13px] text-fg2">
          Sessions downloaded to this device still run offline, and their changes sync when you
          reconnect.
        </p>
        <div>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </Card>,
    )
  }

  const data = club.data
  const content = !data ? (
    <Skeleton className="h-64 rounded-lg" />
  ) : section === 'identity' ? (
    <ClubIdentityPanel
      clubName={data.name}
      initials={data.initials}
      logoUrl={data.logoUrl ?? undefined}
      foundingAddress={data.foundingAddress}
      cityCode={data.cityCode}
      offline={offline}
      pendingRequest={
        data.pendingNameChange
          ? {
              name: data.pendingNameChange.requestedName,
              sentAt: new Date(data.pendingNameChange.requestedAt).toISOString(),
            }
          : undefined
      }
      isPending={logo.isPending || requestName.isPending || cancelName.isPending}
      onError={(message) => toast.error(message)}
      onLogoChange={(dataUrl) =>
        logo.mutate(
          { logoUrl: dataUrl },
          {
            onSuccess: () => toast('Logo updated'),
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }
      onLogoRemove={() =>
        logo.mutate(
          { logoUrl: null },
          {
            onSuccess: () => toast('Logo removed'),
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }
      onRequestNameChange={(name) =>
        requestName.mutate(
          { requestedName: name },
          {
            onSuccess: () => toast('Name change requested. Waiting for approval'),
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }
      onCancelRequest={() =>
        cancelName.mutate(undefined, {
          onSuccess: () => toast('Name change request cancelled'),
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
    />
  ) : section === 'defaults' ? (
    <SessionDefaultsPanel
      playersPerCourt={data.defaultPlayersPerCourt}
      entranceFeeMinor={data.defaultEntranceFeeMinor}
      isPending={defaults.isPending}
      onPlayersPerCourtChange={(value) =>
        defaults.mutate(
          { defaultPlayersPerCourt: value, defaultEntranceFeeMinor: data.defaultEntranceFeeMinor },
          { onError: (error) => toast.error(errorMessage(error)) },
        )
      }
      onSaveEntranceFee={(minor) =>
        defaults.mutate(
          { defaultPlayersPerCourt: data.defaultPlayersPerCourt, defaultEntranceFeeMinor: minor },
          {
            onSuccess: () => toast(`Default entrance fee set to ${formatPeso(minor)} a person`),
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }
      onClearEntranceFee={() =>
        defaults.mutate(
          { defaultPlayersPerCourt: data.defaultPlayersPerCourt, defaultEntranceFeeMinor: null },
          {
            onSuccess: () => toast('Default entrance fee turned off'),
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }
    />
  ) : section === 'post' ? (
    <FacebookPostSection key={data.postTemplate ?? 'default'} club={data} />
  ) : section === 'license' ? (
    <LicenseSection clubName={data.name} />
  ) : section === 'device' ? (
    <DeviceSection />
  ) : (
    <ChangePasswordForm
      username={data.username}
      isPending={password.isPending}
      resetKey={passwordReset}
      serverError={
        password.error instanceof MockError ? password.error.fieldErrors?.current : undefined
      }
      onSignOut={openSignOut}
      onSubmit={(values) => {
        if (offline) {
          toast.error('Changing your password needs an internet connection')
          return
        }
        password.mutate(
          { current: values.current, next: values.next },
          {
            onSuccess: () => {
              setPasswordReset((n) => n + 1)
              toast('Password changed. Use the new one next time you sign in.')
            },
            onError: (error) => {
              if (!(error instanceof MockError && error.fieldErrors?.current))
                toast.error(errorMessage(error))
            },
          },
        )
      }}
    />
  )

  return page(
    <>
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[760px]:grid-cols-[minmax(0,1fr)]">
        <ClubSettingsMenu
          current={section}
          onSelect={(next) => router.push(`/club-settings/${slugFromSection(next)}`)}
          onSignOut={openSignOut}
          open={settingsMenuOpen}
          onOpenChange={(open) => {
            if (open) shell.closeDrawer()
            setSettingsMenuOpen(open)
          }}
        />
        <div className="flex min-w-0 max-w-[820px] flex-col gap-4">{content}</div>
      </div>
      <SignOutSheet
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        pendingCount={sync.data?.pendingCount}
        liveSessionTitle={nowCard.data?.live?.title}
        offline={offline}
        isPending={signOut.isPending}
        onSignOut={() =>
          signOut.mutate(undefined, {
            onSuccess: () => router.push('/login'),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </>,
  )
}
