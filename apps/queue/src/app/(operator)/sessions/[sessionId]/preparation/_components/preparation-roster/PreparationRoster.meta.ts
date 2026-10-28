import type { ComponentMeta } from '@rotra/ui/meta'

export const preparationRosterMeta = {
  name: 'PreparationRoster',
  description:
    'Q-ROSTER in preparation: the Roster and levels tab (RosterPanel) and the Waitlist tab (WaitlistPanel) on useSessionRoster, with useSetRosterLevel, useSetPresence, useSetAllPresence, useRemoveRosterPlayer, useGiveSlot, useFillOpenSlots and useRemoveFromWaitlist; player pictures open PlayerProfileSheet and Add player opens the shared AddPlayer container.',
  usage: [
    'Rendered by SessionPreparation inside the Roster and levels and Waitlist tab panels with tab="roster" or tab="waitlist".',
    'Level changes save immediately with their toast; removing a roster player is immediate with its toast and no dialog. Each mutation toasts the mutation message and toast.error on failure.',
    'Saved-player details (identity, suggestion, profile fields) come from useClubPlayers by clubPlayerId; the roster entries carry the name snapshot, level and presence.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/players-roster.md#q-roster--confirmed-slots-and-presence',
    'docs/business_logic/product/queue/modules/players/README.md#slots-and-waitlist',
  ],
  related: [
    'RosterPanel',
    'WaitlistPanel',
    'AddPlayer',
    'PlayerProfileSheet',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
