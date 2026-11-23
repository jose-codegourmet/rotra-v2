import type { ComponentMeta } from '@rotra/ui/meta'

export const setGamesSheetMeta = {
  name: 'SetGamesSheet',
  description:
    'D-SET-GAMES: Set games played for one roster player or every roster player. Step 1 shows who, a Now → To comparison box (Now count or range; To with a − N + stepper 0–99 and +1 game / −2 games / No change yet, accent once different) and the Auto Queue / Catch Up / sorting line; step 2 confirms the change with Back and Set games.',
  usage: [
    'Pass target { kind: "one", name, current } from a card, or { kind: "all", count, median, range? } from Set games for all…; the stepper prefills from it.',
    'onConfirm(games) receives the count to show; the data layer stores games − counted games as the adjustment, so later games keep counting up.',
    'Pass isPending from the mutation and error when it fails; close the sheet only on success and toast the mutation message ("Games played set · NAME" / "Games played set for 14 players").',
    'Live sessions only: the Players tab exists only after Start session.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › Set games played sheet (SHEETS.setGames)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-set-games--set-games-played',
    'docs/business_logic/product/queue/modules/players/README.md#games-played-override-717',
  ],
  variants: ['one player', 'one player changed', 'every player', 'every player with a range', 'pending', 'failed'],
  related: ['Sheet', 'CountStepper', 'KeyValueList', 'PlayerPoolCard', 'ConfirmSheet'],
} satisfies ComponentMeta
