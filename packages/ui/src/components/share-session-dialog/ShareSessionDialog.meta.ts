import type { ComponentMeta } from '@rotra/ui/meta'

export const shareSessionDialogMeta = {
  name: 'ShareSessionDialog',
  description:
    'Share this session: a Sheet with three tiles (Share photos, Share the link with a read-only field and Copy link, Facebook post) and a Close footer. Opened by the one Share button in the session header.',
  usage: [
    'The header shows one Share button (share icon); during play it sits beside Back to live session. Keep the live console more-menu Facebook post item.',
    'Share photos and Facebook post only report through callbacks: the caller opens the existing Session QR and Copy Facebook post dialogs. Copy link: the caller copies and toasts "Session link copied".',
    'variant="live" (the live console Share, SHEETS.share › share-live): a wide Sheet titled Share this session with Player list (Copy list, read-only post text, loading / error + Try again like FacebookPostSheet), Social post images (Post / Story switch in the heading, the Session QR card, Download image) and Invite link (Copy link); footer Done. Props: postText, playerCount, onCopyList, textareaRef, loading, error, onRetry, card (SessionJoinQr fields), initialFormat.',
    'Not the image-only ShareDialog. The Facebook post tile may move elsewhere (open in the share-dialog mockup log).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Q-PREPARE › header Share › SHEETS.share, ACT.openShare; live variant: SHEETS.share › share-live',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: [
    'Sheet',
    'SessionJoinQr',
    'SessionLinkCard',
    'ShareDialog',
    'ShareCard',
    'FacebookPostSheet',
  ],
} satisfies ComponentMeta
