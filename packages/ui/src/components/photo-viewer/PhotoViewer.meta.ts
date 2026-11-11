import type { ComponentMeta } from '@rotra/ui/meta'

export const photoViewerMeta = {
  name: 'PhotoViewer',
  description:
    'The full-photo dialog (D-PHOTO-VIEWER, #716): a black overlay (--photo-scrim, the same in both themes) with the picture centred, at most 560 px and always inside the screen, and a × named “Close” at the top right. Dialog and image are named “Photo of NAME”; there is no visible text.',
  usage: [
    'Open it from an Avatar with onView, or from the big photo in a profile sheet (ProfileBannerCard / PlayerProfileSheet / ParticipantProfileSheet / PrivateProfileCard onPhotoClick, ClubMemberProfileSheet onViewPhoto). Same for Queue, Player Information and Admin.',
    'Only for real pictures (an uploaded photo or a chosen character), never initials. Whoever can see the picture can enlarge it; a picture masked for this viewer shows initials, so there is nothing to open.',
    'Closes on a tap anywhere on the overlay (not on the photo itself), the × or Esc. Esc closes only the viewer when it opens over a sheet; focus returns to the avatar or photo button that opened it.',
    'Controlled: open, src, name, onClose. usePhotoViewer (@rotra/ui/hooks/use-photo-viewer) keeps that state for a container: photo.show({ src, name }) and {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}.',
    'label replaces “Photo of NAME” (e.g. a club logo). Reduced motion: no fade.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Full-photo viewer (.photo-view, openPhoto); also rotra-player.html and rotra-admin.html .viewer (viewPhoto)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-photo-viewer--full-photo',
    'docs/mockup-changes/2026-11-11-queue-avatar-photo-viewer.md',
    'docs/mockup-changes/2026-11-11-player-avatar-photo-viewer.md',
    'docs/mockup-changes/2026-11-11-admin-avatar-photo-viewer.md',
  ],
  related: ['Avatar', 'ProfileBannerCard', 'Sheet'],
} satisfies ComponentMeta
