import type { ComponentMeta } from '@rotra/ui/meta'

export const shareSessionMeta = {
  name: 'ShareSession',
  description:
    'The container behind the header Share button. Preparation (default): ShareSessionDialog with its three tiles wired to the Session QR dialog (SessionJoinQr in a Sheet), the Copy Facebook post dialog (FacebookPost) and Copy link ("Session link copied"). `variant="live"` (the console): the one-dialog live variant, Player list from useFacebookPost (Copy list toasts "Facebook post copied", or selects the text with "Text selected. Copy it with your keyboard or long-press"), the Session QR card with Post / Story and Download image, and the Invite link with Copy link.',
  usage: [
    'Rendered once by SessionConsole (variant="live") and SessionPreparation; the page owns the open state of the Share button. In the preparation variant Share photos and Facebook post close the share dialog and open the other dialog.',
    'The live variant fetches the post only while it is open and has no other dialogs; the console no longer renders FacebookPost.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-19-queue-share-dialog.md',
    'docs/mockup-changes/2026-11-26-queue-console-no-courts-and-time.md',
  ],
  related: [
    'ShareSessionDialog',
    'SessionJoinQr',
    'FacebookPost',
    'SessionConsole',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
