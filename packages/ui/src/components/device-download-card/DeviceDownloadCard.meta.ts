import type { ComponentMeta } from '@rotra/ui/meta'

export const deviceDownloadCardMeta = {
  name: 'DeviceDownloadCard',
  description:
    'Preparation › This device (Q-DOWNLOAD): Not downloaded / Downloading… / Ready on this device, the per-device copy, and Download for offline use or Update download.',
  usage: [
    "Download state is per device (the mock store's downloads record), never a session field. Offline disables the button with its message.",
    'After a failed update, pass snapshotAge to label the previous usable copy; a partial transfer is never Ready.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › prepOverview() This device card',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/business_logic/product/queue/modules/offline/README.md',
  ],
  variants: ['none', 'downloading', 'ready'],
  related: ['SessionSetupCard', 'ThisDevicePanel', 'StartSessionBar'],
} satisfies ComponentMeta
