import type { ComponentMeta } from '@rotra/ui/meta'

export const editLivePlayerSheetMeta = {
  name: 'EditLivePlayerSheet',
  description:
    'D-EDIT-LIVE-PLAYER: Edit NAME, opened by the pencil on a live Players card. A header (picture in its level ring, shown name, full name when different, chips for level, account kind and tonight), a Profile section (club nickname for registered players, the picture editor for unclaimed players) and a Tonight section (Games played with Now N, Availability Present · Not here). Cancel and Save changes; no confirmation step.',
  usage: [
    'Pass kind "registered" with clubNickname and accountNickname, "unclaimed" with the picture group (picture state and its onChange / onRemove / onUsePrevious: picture changes apply at once), or "guest" with neither.',
    'Pass match when the player is in a match (chip "Playing · Court 2" / "On court · Court 2"); marking them Not here then shows the hint that it does not take them off the match.',
    'onSave(values) receives { nickname, games, present }; the container compares them with the current values, saves only what changed (games as an adjustment, as D-SET-GAMES) and toasts "Changes saved · NAME" or "No changes".',
    'onCancel closes without saving. Pass isPending while saving and error when it fails; close the sheet only on success.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › pencil › Edit player (SHEETS.editLive)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-edit-live-player--edit-player-during-a-session',
    'docs/mockup-changes/2026-11-19-queue-live-edit-player.md',
  ],
  variants: [
    'registered',
    'unclaimed',
    'guest',
    'not here in a match',
    'nickname differs from full name',
    'pending',
    'failed',
  ],
  related: [
    'Sheet',
    'ClubNicknameForm',
    'ClubPictureField',
    'CountStepper',
    'SegmentedControl',
    'SetGamesSheet',
    'PlayerPoolCard',
  ],
} satisfies ComponentMeta
