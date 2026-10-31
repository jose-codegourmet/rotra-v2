import type { ComponentMeta } from '@rotra/ui/meta'

export const exportImagesSheetMeta = {
  name: 'ExportImagesSheet',
  description:
    'The Download images sheet (Q-EXPORT): Story · tall or Feed post · 4:5, the Standings, Awards and Include Off Day choices (Off Day warn-bordered and off by default), "N images. Long standings continue onto extra images so every name stays readable.", a scrolling row of frame previews and the primary "Download N images".',
  usage: [
    'Open it from Download images on ResultsHeader or the session record Results tab. The container owns format and selection state, and computes frames from the result snapshot with the Q08 session-result rules (14 standings rows per Story image, 10 per Feed image, "Standings 1", "Standings 2" … only when split); this sheet only renders them.',
    'Always open with includeOffDay false (D-OFF-DAY): seeing the private slide or pressing Download never implies inclusion. The Off Day frame appears only after the explicit tick.',
    'Download N images is disabled while downloadEnabled is false (the prototype turns downloading off; pass disabledReason to say so) or when no frame is selected. onDownload asks the container to generate the files (Q08.5); downloading never publishes and never re-finalizes the session.',
    'Images are files for the operator to share. No automatic posting or social login.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.export (ACT.openExport)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-export--download-images',
    'docs/screens/product/dialogs.md#d-off-day--explicit-sharing-inclusion',
    'docs/business_logic/product/queue/modules/results/README.md#image-downloads',
  ],
  related: [
    'ExportFramePreview',
    'ResultsHeader',
    'PublishResultsForm',
    'SegmentedControl',
    'Checkbox',
    'Sheet',
  ],
} satisfies ComponentMeta
