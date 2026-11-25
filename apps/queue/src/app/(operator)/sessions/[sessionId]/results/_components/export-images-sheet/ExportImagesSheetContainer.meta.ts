import type { ComponentMeta } from '@rotra/ui/meta'

export const exportImagesSheetContainerMeta = {
  name: 'ExportImagesSheetContainer',
  description:
    "Q-EXPORT container: ExportImagesSheet over the Results page's snapshot, with the format (Story · tall default, Feed post · 4:5) and the selection (Standings + Awards on, Include Off Day off) as local state; buildExportFrames decides the images and each preview is the StandingsSlide, AwardsSlide or OffDaySlide (public variant) that image downloads as.",
  usage: [
    'Mounted by SessionResults (Download images) and by the session record Results tab, both passing { sessionId, open, onOpenChange }. It loads the snapshot, session, club and saved players itself and draws the same slide frame and pictures as the Results tabs; renders nothing until they have loaded.',
    'Every open resets to Story with Standings and Awards on and Off Day off, so a download never includes Off Day unless it is ticked in that same sheet; Standings + Awards never yields an Off Day frame. Long standings continue onto extra images (14 rows per Story image, 9 per Feed image; a shared position is never split).',
    "Download N images stays disabled in the mock phase, as in the prototype, without the prototype's note. Generating the PNG files waits for a dependency decision (docs/coding-conventions.md §1) and for the export pixel dimensions (open composition detail in docs/screens/product/open-decisions.md).",
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-export--download-images',
    'docs/business_logic/product/queue/modules/results/README.md#image-downloads',
    'docs/screens/product/open-decisions.md',
  ],
  related: [
    'ExportImagesSheet',
    'SessionResults',
    'RecordResultsTab',
    'StandingsSlide',
    'AwardsSlide',
    'OffDaySlide',
  ],
} satisfies ComponentMeta
