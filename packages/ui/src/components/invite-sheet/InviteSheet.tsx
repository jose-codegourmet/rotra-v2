'use client'

import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { TextInput } from '@rotra/ui/text-input'

export type InviteSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  /**
   * Both get their own link, and registering through it claims that record (D-2026-11-18-07). The
   * words differ: a guest makes an account, an unclaimed player (saved by this club with their
   * email) turns that record into one.
   */
  identity: 'guest' | 'unclaimed'
  /** False for an unclaimed player saved with a social link and no email (#1019) */
  emailOnFile?: boolean
  /** The invite link; undefined while it is being made */
  link?: string
  onCopy: (link: string) => void
  /** Making a link needs internet */
  offline?: boolean
}

/**
 * Gives the operator a link to send a guest (to create a ROTRA account) or an unclaimed player (to claim
 * their profile). ROTRA does not send anything itself.
 */
export function InviteSheet({
  open,
  onOpenChange,
  name,
  identity,
  link,
  onCopy,
  offline,
  emailOnFile = true,
}: InviteSheetProps) {
  const claim = identity === 'unclaimed'
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={claim ? `Invite ${name} to claim their profile` : `Invite ${name} to ROTRA`}
      footer={<Button onClick={() => onOpenChange(false)}>Done</Button>}
    >
      <p className="m-0">
        {claim
          ? `Your club saved them with ${emailOnFile ? 'their email' : 'a social link'}. This link lets them turn that record into a ROTRA account`
          : 'This link lets them create a ROTRA account'}{' '}
        with their phone and email, so their games and rank follow them to every club.
      </p>
      {offline ? (
        <Notice tone="warn">Making an invite link needs an internet connection.</Notice>
      ) : (
        <Field
          label="Invite link"
          hint="Send it any way you like, such as Messenger or SMS. Works once and lasts 7 days. Opening Invite again makes a new link and cancels this one."
        >
          {link ? (
            <div className="flex items-center gap-2">
              <TextInput
                readOnly
                value={link}
                className="font-mono text-[13px]"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="sm"
                variant="primary"
                className="flex-none whitespace-nowrap"
                onClick={() => onCopy(link)}
              >
                Copy link
              </Button>
            </div>
          ) : (
            <section
              aria-busy="true"
              aria-label="Making the invite link"
              className="flex items-center gap-2"
            >
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-9 w-24" />
            </section>
          )}
        </Field>
      )}
      <p className="m-0 text-[13px] text-fg2">
        {!claim
          ? 'This record becomes theirs when they register: their games here stay with them. '
          : ''}
        The link only sets up their account. It doesn't book them into a session; you still add
        players to each session yourself.
      </p>
    </Sheet>
  )
}
