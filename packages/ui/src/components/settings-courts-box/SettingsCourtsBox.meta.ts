import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsCourtsBoxMeta = {
  name: 'SettingsCourtsBox',
  description:
    'The Courts box of the Settings tab and the Preparation Settings tab: "Courts · N" with "Session ends TIME · N h left" (or "Planned end passed …" in the warning colour) and the buttons Extend 30 min and Extend 1 h, then one SettingsCourtCard per court and a dashed Add court tile ("Set its label and hours") as the last tile. Two courts a row in a box under 1000 px wide; from 1000 px as many as fit at 350 px, stretched. On phones (640 px and narrower) an Embla slider: one court a slide at 86% so the next peeks in, dots under it ("Show COURT LABEL", group "Courts").',
  usage: [
    'Pass the courts as data (label, state, teams, from, until, followsSessionEnd) with the session end and the current time; the callbacks carry the court id. The screen wires them to the courts-and-time hooks (useUpdateCourt, useExtendSession); the box only reports.',
    'The widths follow the box\'s own width (a container query), not the screen, so the same box fits the console and the Preparation page. Only the phone slider follows the screen (640 px and narrower).',
    'The slider keeps the slide the person is on across re-renders (a time edit, a court added) and clamps it when courts go away. The Add court tile is the last slide and the last dot.',
    'Extend toasts "Session ends at TIME · public page updates after sync" (TIME with its day when it is not today). Do not toast again in the container.',
    'Add court opens the existing Add court dialog (AddCourtForm); the Courts and time sheet stays elsewhere (console header, Overview, court menus).',
    'Setting an exact end time in this box is open (docs/mockup-changes/2026-11-19-queue-settings-courts-add-extend.md); not built.',
    'Do not move SnapCarousel to Embla; this slider is the only one (with SavedPlayerStatsCarousel).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Settings › Courts · N (.ls-card.ls-wide, .ls-courts, .ls-embla, .ls-dots), setupCourtSlider()',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-19-queue-settings-court-widths.md',
    'docs/mockup-changes/2026-11-19-queue-settings-courts-add-extend.md',
    'docs/mockup-changes/2026-11-19-queue-settings-courts-slider.md',
  ],
  variants: ['grid', 'slider'],
  related: ['SettingsCourtCard', 'AddCourtTile', 'CourtCard', 'SavedPlayerStatsCarousel'],
} satisfies ComponentMeta
