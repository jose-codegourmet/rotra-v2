import type { ComponentMeta } from '@rotra/ui/meta'

export const clubIdentityPanelMeta = {
  name: 'ClubIdentityPanel',
  description:
    'Club settings › Club identity: upload or replace the club logo, request a club name change, and the fixed founding address and city code.',
  usage: [
    'Logos: any image up to 5 MB, centre-cropped to a 256 px square PNG; onLogoChange gets the data URL, onError gets the message to toast. Logos need no approval.',
    'Name changes are requests the platform owner approves in Admin; Request change is disabled while unchanged or offline. With pendingRequest the name is read-only with Cancel request.',
    'Founding address and city code never change here.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Club settings › Club identity (#club-identity)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['ClubSettingsMenu', 'SessionDefaultsPanel'],
} satisfies ComponentMeta
