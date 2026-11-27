import type { ComponentMeta } from '@rotra/ui/meta'

export const winChanceMeta = {
  name: 'WinChance',
  description:
    'The win chance explanation container hook, useWinChanceDialog(roster, matches): open(lineup) shows WinChanceDialog on winChanceBreakdown for that lineup, with the same names and pictures as the cards.',
  usage: [
    "Call once per container that has win chance chips or pills; pass each chip an onOpenWinChance that calls open(...) and render the returned dialog element after the container's sheets so it stacks over an open sheet.",
    'open takes a lineup ({ format, teamA, teamB, state?, decision? }) or a getter (matches) => lineup read on every render (use a getter for a match by id, so the dialog follows it live). The breakdown is recomputed from the current roster and matches while open.',
    'Closing the dialog changes nothing else: an underlying sheet stays open with its state intact. Queue Master only; never mounted in the public pages.',
  ],
  docs: ['docs/business_logic/product/queue/modules/queueing/README.md#win-chance'],
  related: [
    'WinChanceDialog',
    'WinChanceChip',
    'SessionView',
    'QueueView',
    'AutoQueue',
    'HistoryView',
  ],
} satisfies ComponentMeta
