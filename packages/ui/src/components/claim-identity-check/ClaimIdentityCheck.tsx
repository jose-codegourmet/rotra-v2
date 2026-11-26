import type { ClaimLinkPreview } from '@rotra/data/player-account/types'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
export type ClaimIdentityCheckProps = {
  clubName: string
  /** The club-created identity (name, nickname, picture, RTR ID) */
  preview: ClaimLinkPreview
  /**
   * The email the club saved, already masked ("j•••••@example.com"); the full address never arrives.
   * Empty for a guest's record (a name only, D-2026-11-18-07): the Email row is left out.
   */
  maskedEmail: string
  onConfirm: () => void
  onReject: () => void
}
/** P-CLAIM step 1: the recipient checks the profile is theirs before setting a password. */
export function ClaimIdentityCheck({
  clubName,
  preview,
  maskedEmail,
  onConfirm,
  onReject,
}: ClaimIdentityCheckProps) {
  const rows = [
    // A club's own record has no RTR ID yet: it is given when they register.
    ...(preview.rtrId
      ? [{ label: 'Player ID', value: <span className="font-mono">{preview.rtrId}</span> }]
      : []),
    // A guest's record has no email: they type their own on the next step.
    ...(maskedEmail
      ? [
          {
            label: 'Email',
            value: <span className="font-mono [overflow-wrap:anywhere]">{maskedEmail}</span>,
          },
        ]
      : []),
  ]
  // A photo URL as is; a `character:` picture drawn from the same seed as the club's card.
  const pictureSrc = profilePictureSrc(
    preview.picture,
    preview.pictureSeedId ?? preview.playerId ?? '',
    preview.fullName,
  )
  return (
    <LinkPage
      label={`Registration link from ${clubName}`}
      title="Is this you?"
      description={`${clubName} added this profile for you. Check it's yours before you set a password.`}
    >
      <Card asChild>
        <section className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar
              name={preview.fullName}
              src={pictureSrc}
              size={64}
              tone={pictureSrc ? 'neutral' : 'accent'}
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="[overflow-wrap:anywhere]">{preview.fullName}</h2>
              {preview.nickname ? <p className="m-0 text-fg2">“{preview.nickname}”</p> : null}
            </div>
          </div>
          {rows.length ? <KeyValueList items={rows} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={onConfirm}>
              Yes, this is me
            </Button>
            <Button onClick={onReject}>This isn't me</Button>
          </div>
        </section>
      </Card>
    </LinkPage>
  )
}
