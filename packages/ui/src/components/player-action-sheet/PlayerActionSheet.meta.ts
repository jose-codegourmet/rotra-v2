import type { ComponentMeta } from '@rotra/ui/meta'

export const playerActionSheetMeta = {
  name: 'PlayerActionSheet',
  description:
    '"Change NAME?": the player tapped in a Playing match (picture, name, "Team A · match N, playing"), then two big square choices side by side — Substitute ("Has to leave", swap arrows) and Replace ("Fix a mistake", a circular arrow with a check) — a View profile link and Back to match.',
  usage: [
    'Open it from a player card on the Playing match sheet (ActiveMatchSheet onSelectPlayer).',
    'Substitute opens SwapPickerSheet in substitute mode with this player coming off; Replace opens it in replace mode with this player coming out.',
    'The longer explanations live in the accessible names ("Substitute: NAME has to leave mid-game", "Replace: fix a mistake, the wrong player was put in").',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.playerAction, ACT.playerAction / ACT.pickPlayerAction, .choice.pa-big',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/mockup-changes/2026-11-13-queue-replace-during-play.md',
  ],
  variants: ['team A', 'team B'],
  related: ['ActiveMatchSheet', 'SwapPickerSheet'],
} satisfies ComponentMeta
