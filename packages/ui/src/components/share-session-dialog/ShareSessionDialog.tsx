'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { SessionJoinQr, type SessionJoinQrProps } from '@rotra/ui/session-join-qr'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { Textarea } from '@rotra/ui/textarea'
import { type ReactNode, type Ref, useState } from 'react'

type ShareSessionDialogBaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The full public session link shown in the read-only field */
  link: string
  /** Copy link: the caller copies and toasts "Session link copied" */
  onCopyLink: () => void
}

export type ShareSessionDialogPreparationProps = ShareSessionDialogBaseProps & {
  variant?: 'preparation'
  /** Share photos: the caller closes this dialog and opens the Session QR dialog */
  onSharePhotos: () => void
  /** Facebook post: the caller opens the Copy Facebook post dialog */
  onFacebookPost: () => void
}

export type ShareSessionDialogLiveProps = ShareSessionDialogBaseProps & {
  /** The live console's Share: Player list, Social post images and Invite link on one dialog */
  variant: 'live'
  /** The filled-in Facebook post with the player list */
  postText: string
  /** How many players the post lists */
  playerCount: number
  /** Copy list: the caller copies the post text */
  onCopyList: () => void
  /** Select everything in the textarea when the browser blocks copying */
  textareaRef?: Ref<HTMLTextAreaElement>
  /** The post is being filled in; Copy list waits for it */
  loading?: boolean
  /** Why the post could not be filled in; shown instead of the post, and Copy list is disabled */
  error?: string
  onRetry?: () => void
  /** The Session QR card: link, slug, club and session lines (the dialog's link is used for the QR) */
  card: Omit<SessionJoinQrProps, 'link' | 'format' | 'onFormatChange' | 'actions' | 'hideNote'>
  /** Starting image format; defaults to post */
  initialFormat?: 'post' | 'story'
}

export type ShareSessionDialogProps =
  | ShareSessionDialogPreparationProps
  | ShareSessionDialogLiveProps

const tileClass = cn(
  'flex min-w-0 items-start gap-3 rounded-lg border border-border-strong bg-bg px-3.5 py-3 text-left',
  'touch:px-4 touch:py-3.5',
)

function Tile({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <>
      <Icon name={icon} size={20} className="mt-0.5 flex-none text-accent" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex flex-col gap-0.5">
          <b>{title}</b>
          <span className="text-[13px] text-fg2">{description}</span>
        </span>
        {children}
      </span>
    </>
  )
}

/**
 * Share this session (the header Share button): a Sheet with three tiles, Share photos, Share the
 * link and Facebook post, and a Close footer. Not the image-only ShareDialog.
 */
export function ShareSessionDialog(props: ShareSessionDialogProps) {
  if (props.variant === 'live') return <LiveShareSessionDialog {...props} />
  const { open, onOpenChange, link, onSharePhotos, onCopyLink, onFacebookPost } = props
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share this session"
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <button
        type="button"
        onClick={onSharePhotos}
        className={cn(tileClass, 'cursor-pointer hover:border-accent')}
      >
        <Tile
          icon="qr"
          title="Share photos"
          description="A post or story image with the session QR. Download it or share it to Facebook and Instagram."
        />
      </button>
      <div className={tileClass}>
        <Tile
          icon="link"
          title="Share the link"
          description="Anyone with it sees the public page and can ask to join."
        >
          <span className="flex items-center gap-2">
            <TextInput
              readOnly
              value={link}
              aria-label="Session link"
              className="font-mono text-[13px]"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={onCopyLink}
              className="flex-none whitespace-nowrap"
            >
              Copy link
            </Button>
          </span>
        </Tile>
      </div>
      <button
        type="button"
        onClick={onFacebookPost}
        className={cn(tileClass, 'cursor-pointer hover:border-accent')}
      >
        <Tile
          icon="megaphone"
          title="Facebook post"
          description="The club's post text for this session, ready to paste."
        />
      </button>
    </Sheet>
  )
}

function LiveShareSessionDialog({
  open,
  onOpenChange,
  link,
  onCopyLink,
  postText,
  playerCount,
  onCopyList,
  textareaRef,
  loading = false,
  error,
  onRetry,
  card,
  initialFormat = 'post',
}: ShareSessionDialogLiveProps) {
  const [format, setFormat] = useState<'post' | 'story'>(initialFormat)
  const empty = !postText.trim()
  const canCopy = !loading && !error && !empty
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share this session"
      wide
      footer={<Button onClick={() => onOpenChange(false)}>Done</Button>}
    >
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 text-[15px]">Player list</h3>
            <Button size="xs" disabled={!canCopy} onClick={onCopyList}>
              Copy list
            </Button>
          </div>
          <Textarea
            ref={textareaRef}
            aria-label="Facebook post text with the player list"
            rows={9}
            readOnly
            value={loading ? 'Filling in the post…' : error ? '' : postText}
            className="font-mono text-xs"
          />
          {error ? (
            <p
              role="alert"
              className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-error"
            >
              <span>{error}</span>
              {onRetry ? (
                <Button size="xs" variant="ghost" onClick={onRetry}>
                  Try again
                </Button>
              ) : null}
            </p>
          ) : !loading && empty ? (
            <p role="alert" className="m-0 text-[13px] text-fg2">
              The post is empty, so there is nothing to copy. Check your template in Edit template.
            </p>
          ) : null}
          <p className="m-0 text-[13px] text-fg2">
            {loading || error
              ? 'Player count shows once the post is filled in.'
              : `${playerCount} player${playerCount === 1 ? '' : 's'} listed, from your club's post template.`}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 text-[15px]">Social post images</h3>
            <SegmentedControl
              aria-label="Image format"
              options={[
                { value: 'post', label: 'Post' },
                { value: 'story', label: 'Story' },
              ]}
              value={format}
              onChange={(next) => setFormat(next === 'story' ? 'story' : 'post')}
            />
          </div>
          <SessionJoinQr
            {...card}
            link={link}
            format={format}
            onFormatChange={setFormat}
            actions="download"
            hideNote
          />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[15px]">Invite link</h3>
          <span className="flex items-center gap-2">
            <TextInput
              readOnly
              value={link}
              aria-label="Invite link"
              className="font-mono text-[13px]"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={onCopyLink}
              className="flex-none whitespace-nowrap"
            >
              Copy link
            </Button>
          </span>
          <p className="m-0 text-[13px] text-fg2">
            Anyone with it sees the public page and can ask to join.
          </p>
        </section>
      </div>
    </Sheet>
  )
}
