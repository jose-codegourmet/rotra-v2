import { zodResolver } from '@hookform/resolvers/zod'
import { adminPlayerChangedFields, adminPlayerEditValuesOf } from '@rotra/data/admin-player/rules'
import type { AdminPlayerEdit } from '@rotra/data/admin-player/types'
import {
  ADMIN_PLAYER_REASON_REQUIRED,
  type AdminPlayerEditParsed,
  type AdminPlayerEditValues,
  adminPlayerEditSchemaFor,
} from '@rotra/schema/admin-player'
import type { Resolver } from 'react-hook-form'

/** The field rules plus the ones that depend on the player (email for a registered one, no password for an unclaimed one). */
export const adminEditPlayerSchema = (player: AdminPlayerEdit) => adminPlayerEditSchemaFor(player)

/**
 * Whether the registration place or date differs from the loaded RTR ID's, which changes the RTR ID
 * (rotra-admin.html pmSave() rtrChanged). A player with no RTR ID has neither field.
 */
export const adminEditPlayerRegistrationChanged = (
  player: AdminPlayerEdit,
  values: AdminPlayerEditValues,
) => {
  const start = adminPlayerEditValuesOf(player)
  return (
    (values.registrationPlace ?? start.registrationPlace) !== start.registrationPlace ||
    (values.registrationDate ?? start.registrationDate) !== start.registrationDate
  )
}

/** Whether Save changes would change anything (rotra-admin.html pmSave(): the same fields the data layer compares, and the RTR ID). */
export const adminEditPlayerChanged = (player: AdminPlayerEdit, values: AdminPlayerEditValues) =>
  adminPlayerChangedFields(player, values).length > 0 ||
  adminEditPlayerRegistrationChanged(player, values)

/**
 * The form's resolver: the shared schema, and "Say why you are making this change." when anything
 * changed without a reason. The reason check runs alongside the field errors, so every message
 * shows at once, as the prototype's peErrors() + reason check does.
 */
export function adminEditPlayerResolver(
  player: AdminPlayerEdit,
): Resolver<AdminPlayerEditValues, unknown, AdminPlayerEditParsed> {
  const base = zodResolver(adminEditPlayerSchema(player))
  return async (values, context, options) => {
    const result = await base(values, context, options)
    if (values.reason.trim() || !adminEditPlayerChanged(player, values)) return result
    return {
      values: {},
      errors: {
        ...result.errors,
        reason: { type: 'required', message: ADMIN_PLAYER_REASON_REQUIRED },
      },
    }
  }
}
