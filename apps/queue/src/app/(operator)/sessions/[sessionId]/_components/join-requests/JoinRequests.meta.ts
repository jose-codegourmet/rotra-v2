import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestsMeta = {
  name: 'JoinRequests',
  description:
    'The join requests container: JoinRequestsPanel on useSessionRoster, confirming a guest with the level the Queue Master chose through useConfirmJoinRequest and declining through useDeclineJoinRequest; slotsFull comes from the roster count against slotCapacity.',
  usage: [
    'Card variant on Preparation (Q-PREPARE) between the header and the tabs: it renders nothing while no request is pending, so the page shows no empty card.',
    'Sheet variant inside the live console\'s "Join requests · N" Sheet (Queue › Session console): always renders the panel body, including the "No requests waiting." text.',
    'Owns the confirm/decline mutations and their success and failure toasts; the toast names the level, or the waitlist position once slots are full. A missing level never reaches the mutation: the panel asks for one first.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  related: ['JoinRequestsPanel', 'SessionLinkCard', 'SessionPreparation', 'PreparationRoster'],
} satisfies ComponentMeta
