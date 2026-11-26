'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import type { ReactNode } from 'react'

export type ShareSessionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The full public session link shown in the read-only field */
  link: string
  /** Share photos: the caller closes this dialog and opens the Session QR dialog */
  onSharePhotos: () => void
  /** Copy link: the caller copies and toasts "Session link copied" */
  onCopyLink: () => void
  /** Facebook post: the caller opens the Copy Facebook post dialog */
  onFacebookPost: () => void
}

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
export function ShareSessionDialog({
  open,
  onOpenChange,
  link,
  onSharePhotos,
  onCopyLink,
  onFacebookPost,
}: ShareSessionDialogProps) {
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
