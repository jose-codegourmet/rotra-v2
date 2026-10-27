import type { ComponentMeta } from '@rotra/ui/meta'

export const thisDevicePanelMeta = {
  name: 'ThisDevicePanel',
  description:
    'Club settings › This device: the sessions downloaded on this device with Ready chips, or the hint to download one from its preparation page.',
  usage: [
    'The container filters useDeviceDownloads to state "ready". Downloads are per device, never per club.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-CLUB › viewClub() #club-device',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/queue/modules/offline/README.md',
  ],
  related: ['ListRow', 'Chip', 'DeviceDownloadCard'],
} satisfies ComponentMeta
