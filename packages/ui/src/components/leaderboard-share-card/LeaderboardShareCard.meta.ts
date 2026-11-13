import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardShareCardMeta = {
  name: 'LeaderboardShareCard',
  description:
    'Share leaderboard: the standings split into several images (10 / 8 / 6 places by size) with pictures, picked and downloaded or shared, then OR and the Session link.',
  usage: [
    'Put it inside ShareDialog titled “Share leaderboard”.',
    'Session record › Results › Standings (Queue Master): no viewer row. Finished session page › Leaderboard: flag the signed-in viewer’s row with `isViewer` to highlight it and open the carousel on their image.',
    'Names follow the page’s rule; long names end in an ellipsis. Wins green, losses red, games in the text colour.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Share leaderboard (SHEETS.shareBoard, LB_SHARE_ROWS, .lbs-*)',
  },
  docs: ['docs/mockup-changes/2026-11-13-share-leaderboard.md'],
  related: ['ShareDialog', 'ShareImagePicker', 'ShareImage', 'SessionStandings'],
} satisfies ComponentMeta
