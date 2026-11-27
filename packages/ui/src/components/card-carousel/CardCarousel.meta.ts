import type { ComponentMeta } from '@rotra/ui/meta'

export const cardCarouselMeta = {
  name: 'CardCarousel',
  description:
    'An Embla carousel of cards: drag or swipe a track of slides, previous and next arrows and dots under it, and a side gradient mask only while there are more slides that way.',
  usage: [
    'Pass one { id, node } per slide and the labels: "Previous court" / "Next court" for the Courts Slide mode, "Previous match" / "Next match" for Put a match on Court N.',
    'slideClassName sets the slide size: COURT_SLIDE_CLASS (one slide with the next peeking on phones, two from 760 px, three from 1200 px) or SINGLE_SLIDE_CLASS (one a view).',
    'A drag that starts on a button, field, label, link or switch inside a slide does not swipe.',
    'The arrows disable at the ends; the 48 px fade shows only on a side with more slides. Reduced motion jumps instead of scrolling.',
    'Built on embla-carousel-react. The container owns what a slide shows; it keeps no state about the courts.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Live console › Courts › Slide mode (setupCourtSlide, .cs-wrap .cs-embla .cs-ctl .cs-dots) and Put a match on Court N (setupChooseSlider)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-26-queue-court-match-line.md',
  ],
  related: ['CourtCard', 'AddCourtTile', 'SnapCarousel', 'QueueViewSwitch'],
} satisfies ComponentMeta
