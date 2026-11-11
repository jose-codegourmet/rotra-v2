import type { ComponentMeta } from '@rotra/ui/meta'

export const thisDevicePanelMeta = {
  name: 'ThisDevicePanel',
  description:
    'Club settings › This device: the sessions downloaded on this device with Ready chips (or the hint to download one from its preparation page), then Export play history and Import play history… with the backup note.',
  usage: [
    'The container filters useDeviceDownloads to state "ready". Downloads are per device, never per club.',
    'onExport receives nothing: the container builds playhistory.json from @rotra/data (useExportPlayHistory) and saves it through the browser. onImport receives the chosen File; the container reads it and calls useImportPlayHistory. Export is disabled with no downloads. Both work offline.',
    'Toasts belong to the container: "Play history exported", "Play history imported · N changes waiting to sync", "That file isn\'t a ROTRA play history."',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CLUB › viewClub() #club-device',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/queue/modules/offline/README.md',
    'docs/mockup-changes/2026-11-11-queue-device-play-history-file.md',
  ],
  related: ['ListRow', 'Chip', 'Button', 'DeviceDownloadCard'],
} satisfies ComponentMeta
