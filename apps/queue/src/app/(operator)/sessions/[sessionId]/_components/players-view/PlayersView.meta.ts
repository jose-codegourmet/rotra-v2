import type { ComponentMeta } from '@rotra/ui/meta'

export const playersViewMeta = {
  name: 'PlayersView',
  description:
    'Q-POOL container, the console\'s Players view: "Players" with "Tap players to pick them, then make a match. P present of R." and Add late player (the shared AddPlayer container), PlayerPoolToolbar with the filter and sort in local state (Available · N and longest wait by default), the PlayerPoolCard grid from useSessionRoster, useSessionMatches and the match rules (gamesPlayed for the adjusted count, waitMinutes, activeMatchFor, queue position), the pick order in local state with SelectionBar and formatForSelection, advisory SlotMeter and live WaitlistPanel with admission of any chosen waiter above plan, the Make match confirmation sheet, and Set games for all… / each card\'s Set games played… opening SetGamesSheet on useSetGamesPlayed (D-SET-GAMES, #717).',
  usage: [
    'Individual presence uses useSetPresenceMany: immediate shared optimistic state, an 800 ms desired-state batch, one summary toast, scoped rollback and flush before navigation or other roster writes.',
    "Listed in SessionConsole's VIEWS registry under the Players tab; the prototype's sorters apply (longest wait: off court first, present first, longest wait; least games; most games; level high to low). Wait minutes are measured against the `now` the console passes (its one-second clock), so they move without a refetch.",
    'The Present switch calls useSetPresence and toasts the mutation message, which counts the waiting matches that now need attention; turning someone off never ends their current game. No remove action exists for roster players in a live session.',
    'Make match previews pick order, optionally arranges the teams, and confirms the lineup through useMakeMatch; success clears the selection and errors stay in the sheet. Give slot, Fill open slots and remove-from-waitlist toast their messages; giving a slot during play makes the player present with a locked level.',
    'Empty Available reads "No one is free right now. Try Present or Everyone."; an empty roster reads "No players yet.". Waitlist pictures open the profile through onOpenProfile; onOpenQueue is accepted but unused here.',
    'Shows a toolbar and card-sized Skeletons while the session, roster or matches load and a QueryError when one fails.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/business_logic/product/queue/modules/players/README.md#presence',
    'docs/business_logic/product/queue/modules/players/README.md#roster-changes',
  ],
  related: [
    'SessionConsole',
    'PlayerPoolCard',
    'PlayerPoolToolbar',
    'SelectionBar',
    'WaitlistPanel',
    'AddPlayer',
    'PlayerProfile',
  ],
} satisfies ComponentMeta
