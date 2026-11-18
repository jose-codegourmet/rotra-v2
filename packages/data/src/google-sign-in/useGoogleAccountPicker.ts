import { googlePickerAccounts } from '../fixtures/googleSignIn'
import type { GooglePickerAccount } from './googleSignIn.types'

/**
 * The accounts the prototype's Google picker lists (a stand-in for Google's own window, fictional
 * names only). Real mode redirects to Google and never shows this list. Synchronous on purpose.
 */
export function useGoogleAccountPicker(): GooglePickerAccount[] {
  return googlePickerAccounts
}
