import type { ComponentMeta } from '@rotra/ui/meta'

export const exportFramePreviewMeta = {
  name: 'ExportFramePreview',
  description:
    'One thumbnail in the Download images sheet (Q-EXPORT): the image itself (the result slide it downloads as) drawn 480 px wide and scaled into Story (108 × 192) or Feed post (144 × 180) proportions.',
  usage: [
    'Rendered by ExportImagesSheet for every image; pass the slide as children and a label ("Standings · 1 of 3", "Awards", "Off Day") for its accessible name.',
    'Purely visual: the slide inside is inert and hidden from assistive tech, so its buttons never take focus. The image files themselves come from the export (Q08.5).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.export › .frames .frame.story / .frame.feed (.frame-art)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-export--download-images',
    'docs/business_logic/product/queue/modules/results/README.md#image-downloads',
  ],
  variants: ['story', 'feed'],
  related: ['ExportImagesSheet', 'StandingsSlide', 'AwardsSlide', 'OffDaySlide'],
} satisfies ComponentMeta
