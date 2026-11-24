import type { MockState } from '../mock/store'

/**
 * The session exemption list (D-2026-11-19-07): roster players Generate Queue leaves out, in every
 * strategy. Add match, Make match and Suggest still allow them. Only players still on the roster
 * count, in the order they were added.
 */
export function exemptionOf(
  state: Pick<MockState, 'sessionExemptions' | 'roster'>,
  sessionId: string,
) {
  const ids = state.sessionExemptions?.[sessionId] ?? []
  return ids.filter((id) => state.roster.some((r) => r.id === id && r.sessionId === sessionId))
}

/** Who a save added and who it took off, against the saved list. */
export function exemptionDiff(before: readonly string[], after: readonly string[]) {
  return {
    added: after.filter((id) => !before.includes(id)),
    removed: before.filter((id) => !after.includes(id)),
  }
}

/** Toast copy. */
export const exemptionAddedToast = (name: string) => `${name} added to the exemption list`
export const exemptionRemovedToast = (name: string) => `${name} taken off the exemption list`
export const exemptionSavedToast = (count: number) =>
  count ? `Exemption list saved · ${count} player${count === 1 ? '' : 's'}` : 'Exemption list cleared'
