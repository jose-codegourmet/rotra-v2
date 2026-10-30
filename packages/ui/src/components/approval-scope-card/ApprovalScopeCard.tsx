import type { ContactChangeField } from '@rotra/data/contact-change-request/types'
import { Card } from '@rotra/ui/card'
import { REQUEST_FIELD_WORD } from '@rotra/ui/contact-request-status/variants'
import { useId } from 'react'

export type ApprovalScopeCardProps = {
  field: ContactChangeField
  /** The player's nickname or first name, as the prototype's firstName() */
  firstName: string
}

/** A-CONTACT-REVIEW side card: what approving a contact change touches, and what it never does. */
export function ApprovalScopeCard({ field, firstName }: ApprovalScopeCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>What approval changes</h2>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm">
          <li>
            Only the {REQUEST_FIELD_WORD[field]} {firstName} signs in with.
          </li>
          <li>Not the RTR ID, match history, results or rank.</li>
          <li>Never another player's profile.</li>
        </ul>
      </section>
    </Card>
  )
}
