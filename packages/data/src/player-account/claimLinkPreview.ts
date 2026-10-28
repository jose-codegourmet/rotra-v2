import { CLAIM_TOKEN } from '../fixtures/playerAccounts'
import { mockStore } from '../mock/store'
/**
 * Dev menu only: puts the prototype's registration link into a state and returns its token, like
 * the prototype's 'Open a registration link (Jomar)'. Unused shows 'claimed' once Jomar registered.
 */
export function openClaimLinkPreview(state: 'valid' | 'processing' | 'expired') {
  mockStore.update((draft) => {
    const record = draft.claimLinks[CLAIM_TOKEN]
    if (record) {
      record.status = state
      record.checks = 0
    }
  })
  return CLAIM_TOKEN
}
