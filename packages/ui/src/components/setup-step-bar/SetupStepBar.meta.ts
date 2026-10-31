import type { ComponentMeta } from '@rotra/ui/meta'

export const setupStepBarMeta = {
  name: 'SetupStepBar',
  description:
    "The session setup wizard's three-step bar: every step is clickable and shows current (accent), done (green glow and ✓), needs details (amber and !) or not visited (number).",
  usage: [
    "SessionSetupForm computes each step's state (visited + valid → done; visited + invalid → warn; editing counts every step as visited).",
    'On phones (≤ 520 px) the labels hide; the card below names the step.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() .wiz-steps',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  variants: ['current', 'done', 'warn', 'todo'],
  related: ['SessionSetupForm'],
} satisfies ComponentMeta
