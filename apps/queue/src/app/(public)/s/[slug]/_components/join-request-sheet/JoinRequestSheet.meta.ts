import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestSheetMeta = {
  name: 'JoinRequestSheet',
  description:
    'Q-PUBLIC-JOIN container: the Request to join Foundation Sheet around JoinRequestForm, sent with useSendJoinRequest(slug).',
  usage: [
    'Mounted by PublicSession and opened by Request to join on the JoinRequestCard. The form remounts empty on every open.',
    'Success closes the sheet and toasts "Request sent"; useSendJoinRequest refreshes useMyJoinRequest, so the card switches to the Request sent status. The request is a request only: the participant list does not change until the Queue Master confirms it in Join requests (Q03).',
    'A refusal (requests turned off, a finished session, the guest offline, DevMenu next save fails) keeps the sheet open with the reason as serverError and what was typed. While sending, Cancel, Escape and the scrim cannot close the sheet.',
  ],
  docs: [
    'docs/screens/product/modules/queue/public-session.md#q-public-join--guest-join-request',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  related: ['JoinRequestForm', 'JoinRequestCard', 'PublicSession', 'Sheet'],
} satisfies ComponentMeta
