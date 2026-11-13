'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { PlayerProfile, PlayerSessionRecord } from '@rotra/data/player/types'
import type { ParticipantStats } from '@rotra/data/public-session/types'
import {
  AdminEditPlayerForm,
  type AdminEditPlayerFormProps,
} from '@rotra/ui/admin-edit-player-form'
import { AdminPlayerHistory } from '@rotra/ui/admin-player-history'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { ErrorState } from '@rotra/ui/error-state'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { LEVEL_OPTION_GROUPS } from '@rotra/ui/level-select'
import { Notice } from '@rotra/ui/notice'
import { ProfileBannerCard, ProfileStatsSection } from '@rotra/ui/profile-banner-card'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useState } from 'react'

export type AdminPlayerQuickViewProps = {
  linkComponent?: import('react').ElementType
  open: boolean
  onClose: () => void
  player?: AdminPlayer | null
  error?: boolean
  onRetry: () => void
  createdBy: string
  pendingRequests?: number
  sessions?: PlayerSessionRecord[]
  gamesError?: boolean
  onRetryGames: () => void
  profileHref: string
  historyHref: string
  /** Retained for existing callers; directory actions belong outside the compact panel. */
  actions?: ReactNode
  /** Retained for existing callers; the card's own Copy RTR ID button under the name copies now */
  onCopyId?: () => void
  /** Actual links from this player's public profile; never generated from their name. */
  socialLinks?: PlayerProfile['socialLinks']
  /**
   * Edit (A-PLAYER-EDIT): the form's props, with the loaded edit record as `player`. Absent while it
   * loads (Edit is off; Edit mode shows a skeleton). The footer's Save changes submits the form.
   */
  edit?: Omit<AdminEditPlayerFormProps, 'formId'>
  onInvite?: () => void
  registrationLink?: string
  invitePending?: boolean
  inviteError?: string
  onCopyRegistrationLink?: () => void
  initialMode?: 'view' | 'edit' | 'invite'
  /**
   * Opens the full photo (PhotoViewer, #716) from the hero picture and, in Edit, the Profile
   * picture preview. Esc closes the viewer only; this panel stays open behind it.
   */
  onViewPhoto?: (photo: { src: string; name: string }) => void
  /** The player's resolved banner (the Admin default for no pick and unclaimed players) */
  bannerKey?: string | null
  bannerImageUrl?: string | null
  /** The calendar year the stats count (Latest stats) */
  year?: number
  /** Latest stats from the same games as History; null is “No games yet this year” */
  stats?: ParticipantStats | null
  statsLoading?: boolean
  /** The Player app's `/find/<RTR>` profile: the new-tab icon right of the name */
  rotraProfileHref?: string | null
  /** Share profile in the footer (between Full history and Full profile); registered players only */
  onShare?: () => void
}

export function AdminPlayerQuickView(props: AdminPlayerQuickViewProps) {
  return <QuickViewPanel key={`${props.player?.id ?? 'loading'}-${props.open}`} {...props} />
}

function QuickViewPanel({
  linkComponent: Link = 'a',
  open,
  onClose,
  player: p,
  error,
  onRetry,
  sessions,
  gamesError,
  onRetryGames,
  profileHref,
  historyHref,
  socialLinks,
  edit,
  onInvite,
  registrationLink,
  invitePending,
  inviteError,
  onCopyRegistrationLink,
  initialMode = 'view',
  onViewPhoto,
  bannerKey,
  bannerImageUrl,
  year,
  stats = null,
  statsLoading = false,
  rotraProfileHref,
  onShare,
}: AdminPlayerQuickViewProps) {
  const [mode, setMode] = useState(initialMode)
  const level =
    p?.levelIndex == null
      ? null
      : LEVEL_OPTION_GROUPS.flatMap((group) => group.options)[p.levelIndex]?.label
  const socials = (
    [
      ['facebook', 'Facebook'],
      ['instagram', 'Instagram'],
      ['youtube', 'YouTube'],
      ['linkedin', 'LinkedIn'],
    ] as const
  ).flatMap(([key, label]) => {
    const href = socialLinks?.[key]
    return href && /^https?:\/\//i.test(href) ? [{ label, href }] : []
  })
  const back = () => setMode('view')
  // Quick view (2026-11-13-admin-default-banner-quick-view): the banner profile card, edge to edge.
  const card = mode === 'view' && !!p && !error
  const photoSrc = p ? profilePictureSrc(p.picture, p.id, p.name) : undefined
  const hero = p ? (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg bg-elev p-3',
        p.claimed &&
          mode !== 'invite' &&
          'bg-[linear-gradient(135deg,var(--color-accent-subtle),transparent_70%)] bg-elev',
      )}
    >
      {mode !== 'invite' ? (
        <Avatar
          name={p.name}
          src={profilePictureSrc(p.picture, p.id, p.name)}
          size={52}
          onView={(() => {
            const src = profilePictureSrc(p.picture, p.id, p.name)
            return src && onViewPhoto ? () => onViewPhoto({ src, name: p.name }) : undefined
          })()}
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-lg font-bold [overflow-wrap:anywhere]">
          {mode === 'edit' ? 'Edit ' : mode === 'invite' ? 'Invite ' : ''}
          {p.name}
          {mode === 'invite' ? ' to ROTRA' : ''}
        </h2>
        {mode === 'view' ? (
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={level ? 'accent' : 'neutral'}>{level ?? 'No rank yet'}</Chip>
            <Chip>{p.claimed ? 'Registered' : 'Unclaimed'}</Chip>
          </div>
        ) : (
          <span className={cn('text-sm text-fg2', mode === 'edit' && 'font-mono')}>
            {mode === 'edit'
              ? (p.rtrId ?? 'Not registered yet')
              : 'Registration link for this profile'}
          </span>
        )}
      </div>
    </div>
  ) : null
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
      side
      headerless={card}
      title={
        mode === 'edit'
          ? 'Edit profile'
          : mode === 'invite'
            ? 'Invite to ROTRA'
            : card && p
              ? p.nickname || p.name
              : 'Quick view'
      }
      dismissible={!edit?.isPending}
      hideClose={edit?.isPending}
      className="[&>div]:flex-1"
      footer={
        p && !error ? (
          mode === 'view' ? (
            <>
              <Button disabled={!edit} onClick={() => setMode('edit')}>
                Edit
              </Button>
              <Button asChild>
                <Link href={historyHref} aria-label="View full history" onClick={onClose}>
                  Full history
                </Link>
              </Button>
              {p.rtrId && onShare ? (
                <Button onClick={onShare}>
                  <Icon name="share" size={16} />
                  Share profile
                </Button>
              ) : null}
              <Button asChild variant="primary">
                <Link href={profileHref} aria-label="View full profile" onClick={onClose}>
                  Full profile
                </Link>
              </Button>
            </>
          ) : mode === 'invite' ? (
            <>
              <Button onClick={back}>Back</Button>
              <Button
                variant="primary"
                disabled={!registrationLink || !onCopyRegistrationLink}
                loading={invitePending}
                onClick={onCopyRegistrationLink}
              >
                Copy link
              </Button>
            </>
          ) : (
            <>
              <Button disabled={edit?.isPending} onClick={back}>
                Back
              </Button>
              <Button
                type="submit"
                form={`admin-edit-player-${p.id}`}
                variant="primary"
                disabled={!edit || edit.isPending}
                loading={edit?.isPending}
              >
                Save changes
              </Button>
            </>
          )
        ) : undefined
      }
    >
      {error ? (
        <ErrorState title="Couldn't load the player." onRetry={onRetry} />
      ) : p === null ? (
        <p>Player not found.</p>
      ) : !p ? (
        <Skeleton label="Loading player" />
      ) : (
        <>
          {card ? null : hero}
          {mode === 'edit' ? (
            edit ? (
              <AdminEditPlayerForm
                {...edit}
                formId={`admin-edit-player-${p.id}`}
                onViewPicture={
                  onViewPhoto ? (src) => onViewPhoto({ src, name: p.name }) : undefined
                }
              />
            ) : (
              <Skeleton label="Loading player" />
            )
          ) : mode === 'invite' && !p.claimed ? (
            <>
              {inviteError ? (
                <ErrorState title={inviteError} onRetry={onInvite ?? (() => {})} />
              ) : registrationLink ? (
                <Field label="Link">
                  <TextInput
                    aria-label="Registration link"
                    className="font-mono"
                    value={registrationLink}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                </Field>
              ) : (
                <Skeleton label="Creating registration link" />
              )}
              <Notice title="No club is assigned.">
                A player who registers from an Admin link is not added to any club, and the clubs
                that already played with this profile keep their records as they are.
              </Notice>
              <ul className="list-disc pl-[18px] text-sm text-fg2">
                <li>The link works for 7 days and once. Making a new one replaces this one.</li>
                <li>ROTRA sends no email or text. Share the link yourself.</li>
              </ul>
            </>
          ) : (
            <ProfileBannerCard
              name={p.name}
              nickname={p.nickname}
              rtrId={p.rtrId}
              profileLink={
                p.rtrId && rotraProfileHref ? { href: rotraProfileHref, newTab: true } : null
              }
              photoUrl={photoSrc}
              onPhotoClick={
                photoSrc && onViewPhoto
                  ? () => onViewPhoto({ src: photoSrc, name: p.name })
                  : undefined
              }
              pictureSize={72}
              bannerKey={bannerKey}
              bannerImageUrl={bannerImageUrl}
              chips={
                <>
                  <Chip tone={level ? 'accent' : 'neutral'}>{level ?? 'No rank yet'}</Chip>
                  <Chip>{p.claimed ? 'Registered' : 'Unclaimed'}</Chip>
                </>
              }
            >
              {!p.claimed ? (
                <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-dashed border-border-strong px-3 py-2.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <b>Not registered yet</b>
                    <span className="text-sm text-fg2">
                      Send an invite so this player claims the profile.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!onInvite}
                    onClick={() => {
                      setMode('invite')
                      onInvite?.()
                    }}
                  >
                    Invite to ROTRA
                  </Button>
                </div>
              ) : null}
              <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm max-[420px]:grid-cols-1 max-[420px]:gap-y-0 [&>dt]:text-fg2 [&>dd]:min-w-0 [&>dd]:[overflow-wrap:anywhere] max-[420px]:[&>dd]:mb-2">
                <dt>Phone</dt>
                <dd className="font-mono">{p.phone || 'Not given'}</dd>
                <dt>Email</dt>
                <dd className="font-mono">{p.email || 'Not given'}</dd>
                <dt>Socials</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  {socials.length ? (
                    socials.map(({ label, href }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={href}
                      >
                        <Chip>{label}</Chip>
                      </a>
                    ))
                  ) : (
                    <span className="text-fg2">None added</span>
                  )}
                </dd>
              </dl>
              {year !== undefined ? (
                <ProfileStatsSection year={year} stats={stats} loading={statsLoading} />
              ) : null}
              <AdminPlayerHistory
                variant="compact"
                name={p.name}
                backHref={profileHref}
                sessions={sessions}
                error={gamesError}
                onRetry={onRetryGames}
                tab="all"
                club=""
                from=""
                to=""
                page={1}
                onChange={() => {}}
              />
            </ProfileBannerCard>
          )}
        </>
      )}
    </Sheet>
  )
}
