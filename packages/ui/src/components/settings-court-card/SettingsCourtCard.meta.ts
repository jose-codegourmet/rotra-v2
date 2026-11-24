import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsCourtCardMeta = {
  name: 'SettingsCourtCard',
  description:
    'One small court card in the Settings tab\'s Courts box: the court label and a status chip (Playing, Getting ready, Free, Not open yet), the court drawing with its players (grey "FREE" when no match is on it; a Playing court has the accent border and glow), then From and Until time fields and a "Follows session end" checkbox. Every change saves at once with a toast.',
  usage: [
    'Use inside SettingsCourtsBox only; the Courts tab uses CourtCard.',
    'From and Until are DateTimePicker time fields: tapping one opens the time dialog titled "COURT opens" / "COURT open until"; never a native time input. From must be before Until. Until must be after From and within 24 h, and shows "next day" when it falls on the next day (the dialog has the "Ends the next day" switch).',
    'Until is always editable. Picking a time other than the session end calls onChangeUntil (the box unticks); picking the session end calls onFollowSessionEnd (the box ticks). Ticking Follows session end calls onFollowSessionEnd; unticking calls onChangeUntil with the current end ("COURT has its own end time").',
    'The card toasts itself: "COURT opens TIME", "COURT open until TIME", "COURT follows the session end". A From at or after Until (or an Until at or before From) is refused with the error toast "Court 1 has to open before it closes." and the callbacks are not called; a From that already sits at or after Until shows the same words under the fields.',
    'The container maps the court to state (match status Playing / Getting ready, courtOpen false = not-open), passes the court opening and closing as epoch ms (until is the session end while followsSessionEnd) and saves through the courts-and-time hooks (useUpdateCourt).',
    'Asking before a time change while a match is on the court is open (docs/mockup-changes/2026-11-19-queue-settings-court-cards.md); the card saves at once.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Settings › Courts › liveSettings() courtMini(), courtTimePickers() (.ls-cc)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-19-queue-settings-court-cards.md',
    'docs/mockup-changes/2026-11-19-queue-time-picker-standard.md',
    'docs/mockup-changes/2026-11-19-queue-settings-until-editable.md',
  ],
  variants: ['free', 'getting-ready', 'playing', 'not-open'],
  related: ['SettingsCourtsBox', 'CourtCard', 'CourtDrawing', 'DateTimePicker', 'Checkbox'],
} satisfies ComponentMeta
