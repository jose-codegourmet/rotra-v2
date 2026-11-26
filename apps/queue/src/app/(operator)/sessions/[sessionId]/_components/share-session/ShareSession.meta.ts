import type { ComponentMeta } from '@rotra/ui/meta'

export const shareSessionMeta = {
  name: 'ShareSession',
  description:
    'The container behind the header Share button: ShareSessionDialog (Share this session) with its three tiles wired to the existing Session QR dialog (SessionJoinQr in a Sheet), the Copy Facebook post dialog (FacebookPost) and Copy link ("Session link copied").',
  usage: [
    'Rendered once by SessionConsole and SessionPreparation; the page owns the open state of the Share button. Share photos and Facebook post close the share dialog and open the other dialog.',
    'The console more menu keeps its own Copy Facebook post item (its own FacebookPost instance, never open at the same time).',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-19-queue-share-dialog.md',
  ],
  related: [
    'ShareSessionDialog',
    'SessionJoinQr',
    'FacebookPost',
    'SessionConsole',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
