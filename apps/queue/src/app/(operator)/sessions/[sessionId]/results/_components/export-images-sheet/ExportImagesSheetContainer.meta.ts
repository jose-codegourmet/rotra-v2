import type { ComponentMeta } from '@rotra/ui/meta'

export const exportImagesSheetContainerMeta = {
  name: 'ExportImagesSheetContainer',
  description:
    'Q-EXPORT container: ExportImagesSheet over useSessionResults, with the format (Story · tall default, Feed post · 4:5) and the selection (Standings + Awards on, Include Off Day off) as local state and the preview frames from buildExportFrames.',
  usage: [
    'Mounted by SessionResults (Download images) and by the session record Results tab, both passing { sessionId, open, onOpenChange }. Renders nothing until the snapshot has loaded.',
    'Every open resets to Story with Standings and Awards on and Off Day off, so a download never includes Off Day unless it is ticked in that same sheet; Standings + Awards never yields an Off Day frame. Long standings continue onto extra frames (14 rows per Story image, 10 per Feed image).',
    "Download N images stays disabled in the mock phase, as in the prototype, without the prototype's note. Generating the PNG files waits for a dependency decision (docs/coding-conventions.md §1) and for the export pixel dimensions (open composition detail in docs/screens/product/open-decisions.md).",
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-export--download-images',
    'docs/business_logic/product/queue/modules/results/README.md#image-downloads',
    'docs/screens/product/open-decisions.md',
  ],
  related: ['ExportImagesSheet', 'SessionResults', 'RecordResultsTab'],
} satisfies ComponentMeta
