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
  /** Guests are invited to make an account; unclaimed profiles to claim theirs */
  identity: 'guest' | 'unclaimed'
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
          ? 'They already have a ROTRA profile from playing here. This link lets them claim it'
          : 'This link lets them create a ROTRA account'}{' '}
        with their phone and email, so their games and rank follow them to every club.
      </p>
      {offline ? (
        <Notice tone="warn">Making an invite link needs an internet connection.</Notice>
      ) : (
        <Field label="Invite link" hint="Send it any way you like, such as Messenger or SMS.">
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
        The link only sets up their account. It doesn't book them into a session; you still add
        players to each session yourself.
      </p>
    </Sheet>
  )
}
