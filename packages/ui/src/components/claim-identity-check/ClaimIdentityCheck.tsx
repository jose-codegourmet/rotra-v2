import type { ClaimLinkPreview } from '@rotra/data/player-account/types'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
export type ClaimIdentityCheckProps = {
  clubName: string
  /** The club-created identity; the phone arrives already masked and the full number never does */
  preview: ClaimLinkPreview
  onConfirm: () => void
  onReject: () => void
}
/** P-CLAIM step 1: the recipient checks the profile is theirs before setting a password. */
export function ClaimIdentityCheck({
  clubName,
  preview,
  onConfirm,
  onReject,
}: ClaimIdentityCheckProps) {
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
              src={preview.picture ?? undefined}
              size={64}
              tone={preview.picture ? 'neutral' : 'accent'}
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="[overflow-wrap:anywhere]">{preview.fullName}</h2>
              {preview.nickname ? <p className="m-0 text-fg2">“{preview.nickname}”</p> : null}
            </div>
          </div>
          <KeyValueList
            items={[
              { label: 'Player ID', value: <span className="font-mono">{preview.rtrId}</span> },
              { label: 'Phone', value: <span className="font-mono">{preview.maskedPhone}</span> },
            ]}
          />
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
