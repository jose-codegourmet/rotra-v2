import type { ClubPriceValues } from '@rotra/schema/club-price'
import { Button } from '@rotra/ui/button'
import { clubPriceLine } from '@rotra/ui/forms/club-price-fields/helpers'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { SheetSteps } from '@rotra/ui/sheet-steps'

/** The checked Add club values, without the password itself: only its length reaches the review. */
export type AddClubReviewValues = {
  name: string
  foundingAddress: string
  cityCode: string
  username: string
  passwordLength: number
  price: ClubPriceValues
}

export type AddClubReviewProps = {
  values: AddClubReviewValues
  /** The founding city's name for values.cityCode, e.g. "Cebu City" */
  cityName: string
  /** Back to the details step with every value kept */
  onBack: () => void
  onCreate: () => void
  /** Creating the club: "Creating…", and Back and Create club cannot be pressed */
  isPending?: boolean
  /** Why creating failed; nothing was created and the values are kept */
  serverError?: string
}

const STEPS = ['Details', 'Review']

/** A-ADD-CLUB step 2: every value except the password, what happens next, and Create club. */
export function AddClubReview({
  values,
  cityName,
  onBack,
  onCreate,
  isPending = false,
  serverError,
}: AddClubReviewProps) {
  const free = values.price.pricing === 'free'
  return (
    <div className="flex flex-col gap-3.5">
      <SheetSteps steps={STEPS} current={1} />
      <KeyValueList
        items={[
          { label: 'Club name', value: <b>{values.name}</b> },
          { label: 'Founding address', value: values.foundingAddress },
          {
            label: 'City',
            value: (
              <>
                {cityName} · <span className="font-mono">{values.cityCode}</span>
              </>
            ),
          },
          { label: 'Username', value: <span className="font-mono">{values.username}</span> },
          { label: 'Password', value: `Set · ${values.passwordLength} characters` },
          { label: 'Price', value: clubPriceLine(values.price) },
        ]}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          What happens next
        </span>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm">
          <li>The club can sign in to the Queue app with this username and password.</li>
          <li>
            It can't run sessions until you activate a license
            {free ? '. As a tester club its licenses are free, recorded at ₱0' : ''}.
          </li>
          <li>The founding address and city code can't be changed later.</li>
          <li>
            The password isn't shown again. Give it to the club yourself; they can change it in Club
            settings.
          </li>
        </ul>
      </div>
      {serverError ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-error">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button disabled={isPending} onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" disabled={isPending} onClick={onCreate}>
          {isPending ? 'Creating…' : 'Create club'}
        </Button>
      </div>
    </div>
  )
}
