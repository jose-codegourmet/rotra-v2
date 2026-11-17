import type { ComponentMeta } from '@rotra/ui/meta'

export const legalDocumentMeta = {
  name: 'LegalDocument',
  description:
    'A static legal page in Player Information: the Privacy Policy (P-PRIVACY) or the Terms of Service (P-TERMS), with its title, effective date and sections.',
  usage: [
    'Pass the page copy as data: a title, the "Effective <date>" line and sections of paragraphs and lists. The copy lives next to the route, word for word from the mockup.',
    'Static text only: no links, controls or states. Public in both data modes.',
    'It renders the page <main> and the one h1 (through PageHeader); do not wrap it in another page column.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-PRIVACY / P-TERMS (viewLegal, .wrap.legal)',
  },
  docs: ['docs/screens/product/modules/player-information/legal.md'],
  related: ['PageHeader'],
} satisfies ComponentMeta
