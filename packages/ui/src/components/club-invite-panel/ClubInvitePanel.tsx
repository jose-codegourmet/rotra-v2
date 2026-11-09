'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useId, useState } from 'react'

export type ClubInvitePanelProps = {
  /** The full club invite link, e.g. "https://rotra.app/register/lahug-smash?k=k7m2p9qw" */
  link: string
  onCopyLink: () => void
  /** Opens the Share club invite sheet (the share card) */
  onShareClubInvite: () => void
  /** The user confirmed Regenerate in the sheet; the container makes the new code and toasts */
  onRegenerate: () => void
  /** Controlled state of the "Regenerate the club invite link?" sheet; omit to let the panel keep it */
  confirmOpen?: boolean
  onConfirmOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * Club settings › Club invite link: one standing link with Copy link, Share club invite and
 * Regenerate link (confirm sheet). It only reports; toasts and link generation live in the container.
 */
export function ClubInvitePanel({
  link,
  onCopyLink,
  onShareClubInvite,
  onRegenerate,
  confirmOpen,
  onConfirmOpenChange,
  className,
}: ClubInvitePanelProps) {
  const id = useId()
  const [openState, setOpenState] = useState(false)
  const open = confirmOpen ?? openState
  const setOpen = (next: boolean) => {
    setOpenState(next)
    onConfirmOpenChange?.(next)
  }
  return (
    <Card asChild className={className}>
      <section id="club-invite" aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <h2 id={`${id}-h`}>Club invite link</h2>
        <p className="m-0 text-[13px] text-fg2">
          One standing link for your club. Anyone who registers through it joins your saved players.
          A signed-in ROTRA player who opens it joins with one tap.
        </p>
        <div className="flex items-center gap-2">
          <TextInput
            readOnly
            value={link}
            aria-label="Club invite link"
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onShareClubInvite}>
            Share club invite
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            Regenerate link
          </Button>
        </div>
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title="Regenerate the club invite link?"
          footer={
            <>
              <Button onClick={() => setOpen(false)} data-autofocus>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setOpen(false)
                  onRegenerate()
                }}
              >
                Regenerate
              </Button>
            </>
          }
        >
          <p className="m-0">
            The old link and every image with its QR stop working. People who already joined keep
            their place.
          </p>
        </Sheet>
      </section>
    </Card>
  )
}
