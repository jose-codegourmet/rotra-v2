import type { ComponentMeta } from '@rotra/ui/meta'

export const exportFramePreviewMeta = {
  name: 'ExportFramePreview',
  description:
    'One thumbnail in the Download images sheet (Q-EXPORT): the club name, the slide title ("Standings 2", "Awards", "Off Day"), its rows and the "powered by rotra" footer at Story (tall) or Feed post (4:5) proportions.',
  usage: [
    'Rendered by ExportImagesSheet for every frame the container computed; one preview per image file that will be downloaded.',
    'A preview only: rows past the frame are clipped, like the prototype. The real slides are ResultSlideFrame / StandingsSlide / AwardsSlide / OffDaySlide, and the image files come from the export (Q08.5).',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.export › .frames .frame.story / .frame.feed',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-export--download-images',
    'docs/business_logic/product/queue/modules/results/README.md#image-downloads',
  ],
  variants: ['story', 'feed'],
  related: ['ExportImagesSheet', 'ResultSlideFrame'],
} satisfies ComponentMeta
