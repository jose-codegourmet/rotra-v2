import type { ComponentMeta } from '@rotra/ui/meta'

export const editLivePlayerSheetMeta = {
  name: 'EditLivePlayerSheet',
  description:
    'D-EDIT-LIVE-PLAYER: Edit NAME, opened by the pencil on a live Players card. A header (picture in its level ring, shown name, full name when different, chips for level, account kind and tonight), a Profile section with the Club nickname, a Tonight section (Games played with Now N, Availability Present · Not here) and Handicap · tonight. The Queue Master edits only these four (mockup change 2026-11-27); the full name and picture are not edited here. mode "preparing" (the Roster and levels pencil) shows Profile and Handicap only. Cancel and Save changes; no confirmation step.',
  usage: [
    'Handicap · tonight (D-2026-11-25-03): pass handicapSpots (the spots marked now); onSave receives `spots`, the whole set. The container saves it with useSetHandicap only when it changed (sameHandicap).',
    'Pass kind "registered" with clubNickname and accountNickname, or "unclaimed" / "guest" with clubNickname as their one nickname (what the card shows above the full name).',
    'mode "preparing" (Roster and levels, before Start): no Tonight section and no tonight chip; onSave returns the games and present props unchanged.',
    'Pass match when the player is in a match (chip "Playing · Court 2" / "On court · Court 2"); marking them Not here then shows the hint that it does not take them off the match.',
    'onSave(values) receives { nickname, games, present, spots }. The container compares them with the current values, saves only what changed (games as an adjustment, as D-SET-GAMES) and toasts "Changes saved · NAME" or "No changes".',
    'onCancel closes without saving. Pass isPending while saving and error when it fails; close the sheet only on success.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Live console › Players › pencil, and Roster and levels › pencil › Edit player (SHEETS.editLive)',
  },
  docs: [
    'docs/mockup-changes/2026-11-27-queue-edit-player-limits.md',
    'docs/mockup-changes/2026-11-25-queue-handicap-tonight.md',
    'docs/screens/product/dialogs.md#d-edit-live-player--edit-player-during-a-session',
    'docs/mockup-changes/2026-11-19-queue-live-edit-player.md',
  ],
  variants: [
    'registered',
    'unclaimed',
    'guest',
    'not here in a match',
    'nickname differs from full name',
    'preparing',
    'handicap with several spots',
    'pending',
    'failed',
  ],
  related: [
    'HandicapPicker',
    'Sheet',
    'ClubNicknameForm',
    'EditPencilButton',
    'CountStepper',
    'SegmentedControl',
    'SetGamesSheet',
    'PlayerPoolCard',
  ],
} satisfies ComponentMeta
