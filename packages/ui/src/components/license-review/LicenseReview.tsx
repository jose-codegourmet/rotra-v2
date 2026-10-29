import type { ClubLicenseTerm } from '@rotra/data/license/types'
import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { Notice } from '@rotra/ui/notice'
import { SheetSteps } from '@rotra/ui/sheet-steps'

export type LicenseReviewProps = {
  /** Activate for a club with no recorded term, Renew otherwise */
  verb: 'Activate' | 'Renew'
  club: { name: string; username: string }
  plan: ClubLicenseTerm['plan']
  /** 'YYYY-MM-DD' first and last day of the term */
  startsOn: string
  endsOn: string
  /** What the club paid outside ROTRA; null for a free tester club ("Free · tester club") */
  payment: { amountMinor: number; paidOn: string } | null
  /** The club's price for this plan, in centavos; a different amount adds a note under Paid */
  planPriceMinor: number
  /** Optional reference; "—" when empty */
  reference: string
  /** "What this does" bullets, worked out by the container (rotra-admin.html licEffects) */
  effects: string[]
  /** Days the new term overlaps the current one; above 0 shows the undecided-overlap warning */
  overlapDays: number
  /** Back to the details step with every value kept */
  onBack: () => void
  onConfirm: () => void
  /** Saving: "Saving…", and Back and the primary button cannot be pressed */
  isPending?: boolean
  /** Why saving failed, e.g. "It wasn't saved. You can save it again." */
  serverError?: string
}

const STEPS = ['Details', 'Review']

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`

/**
 * A-LICENSE step 2 (D-LICENSE): the club, plan, period, payment and reference to check, what the
 * license does to access and public pages, and Activate license / Renew license. Payment happened
 * outside ROTRA; nothing here collects money.
 */
export function LicenseReview({
  verb,
  club,
  plan,
  startsOn,
  endsOn,
  payment,
  planPriceMinor,
  reference,
  effects,
  overlapDays,
  onBack,
  onConfirm,
  isPending = false,
  serverError,
}: LicenseReviewProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <SheetSteps steps={STEPS} current={1} />
      <KeyValueList
        items={[
          {
            label: 'Club',
            value: (
              <>
                <b>{club.name}</b> · <span className="font-mono">{club.username}</span>
              </>
            ),
          },
          { label: 'Plan', value: plan },
          { label: 'Covers', value: `${formatYmd(startsOn)} – ${formatYmd(endsOn)}` },
          {
            label: 'Paid',
            value: payment ? (
              <>
                {formatPeso(payment.amountMinor)} on {formatYmd(payment.paidOn)}
                {payment.amountMinor !== planPriceMinor ? (
                  <>
                    <br />
                    <span className="text-xs text-fg2">
                      The club's {plan.toLowerCase()} price is {formatPeso(planPriceMinor)}.
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              'Free · tester club'
            ),
          },
          { label: 'Reference', value: <span className="font-mono">{reference || '—'}</span> },
        ]}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          What this does
        </span>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm">
          {effects.map((effect) => (
            <li key={effect}>{effect}</li>
          ))}
        </ul>
      </div>
      {overlapDays > 0 ? (
        <Notice tone="warn">
          This term overlaps the current one by {plural(overlapDays, 'day')}. How overlapping terms
          combine hasn't been decided.
        </Notice>
      ) : null}
      {serverError ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-error">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button disabled={isPending} onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" disabled={isPending} onClick={onConfirm}>
          {isPending ? 'Saving…' : `${verb} license`}
        </Button>
      </div>
    </div>
  )
}
