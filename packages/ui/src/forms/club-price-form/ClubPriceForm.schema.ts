import { clubPriceField } from '@rotra/schema/club-price'
import { z } from 'zod'

/** A-CLUB-PRICE: the club's Paid or Free price, under `price` as ClubPriceFields expects. */
export const clubPriceFormSchema = z.object({ price: clubPriceField })

/** What the fields hold while typing (amounts as peso text). */
export type ClubPriceFormInput = z.input<typeof clubPriceFormSchema>
/** What onSubmit receives: amounts in integer centavos (free: the kept amounts or null). */
export type ClubPriceFormValues = z.output<typeof clubPriceFormSchema>
