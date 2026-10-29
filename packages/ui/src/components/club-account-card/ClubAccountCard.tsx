import { Card } from '@rotra/ui/card'
import { Icon } from '@rotra/ui/icon'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { useId } from 'react'

export type ClubAccountCardProps = {
  username: string
  /** 'YYYY-MM-DD' the account was set up */
  setUpOn: string
}

/**
 * Club detail › Overview: the club's one shared account. There is deliberately no password prop:
 * the password is set by the club and never shown. No reset control until recovery is decided.
 */
export function ClubAccountCard({ username, setUpOn }: ClubAccountCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Club account</h2>
        <KeyValueList
          items={[
            { label: 'Username', value: <span className="font-mono">{username}</span> },
            {
              label: 'Password',
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="lock" className="flex-none" /> Set by the club, never shown
                </span>
              ),
            },
            { label: 'Set up', value: formatYmd(setUpOn) },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          The club changes its own password with the current one. If it's forgotten, you reset it;
          that reset method hasn't been decided, so there's no control for it here.
        </p>
        <p className="m-0 text-[13px] text-fg2">
          One shared account runs the club and its queue. There are no separate manager logins.
        </p>
      </section>
    </Card>
  )
}
