import type { ComponentMeta } from '@rotra/ui/meta'

export const exportImagesSheetMeta = {
  name: 'ExportImagesSheet',
  description:
    'The Download images sheet (Q-EXPORT): Story · tall or Feed post · 4:5, the Standings, Awards and Include Off Day choices (Off Day warn-bordered and off by default), "N images. Long standings continue onto extra images so every name stays readable.", a scrolling row of previews (each the image itself, scaled down) and the primary "Download N images".',
  usage: [
    'Open it from Download images on ResultsHeader or the session record Results tab. The container owns format and selection state, works out the images from the result snapshot with buildExportFrames (14 standings rows per Story image, 9 per Feed image, a shared position never split, "Standings · 1 of 3" only when split) and passes previews: one { key, label, image } per image, where image is the StandingsSlide, AwardsSlide or OffDaySlide that image downloads as; this sheet only renders them.',
    'Always open with includeOffDay false (D-OFF-DAY): seeing the private slide or pressing Download never implies inclusion. The Off Day frame appears only after the explicit tick.',
    'Download N images is disabled while downloadEnabled is false (the prototype turns downloading off; pass disabledReason to say so) or when no frame is selected. onDownload asks the container to generate the files (Q08.5); downloading never publishes and never re-finalizes the session.',
    'Images are files for the operator to share. No automatic posting or social login.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.export (ACT.openExport)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-export--download-images',
    'docs/mockup-changes/2026-11-25-queue-standings-image-shared-rows.md',
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
