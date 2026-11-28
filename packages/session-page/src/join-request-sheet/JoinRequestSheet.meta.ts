import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestSheetMeta = {
  name: 'JoinRequestSheet',
  description:
    'Q-PUBLIC-JOIN container: the Request to join Foundation Sheet around JoinRequestForm, sent with useSendJoinRequest(slug).',
  usage: [
    'Preserves unsent form fields and retry ID in Queue-local sessionStorage for up to 30 minutes across Player login; clears on send or cancel.',
    'Mounted by PublicSession and opened by Request to join on the JoinRequestCard. The form remounts empty on every open, with a new requestId; a retry within one open sheet sends the same requestId, so real mode saves one request.',
    'Success closes the sheet and toasts "Request sent"; useSendJoinRequest refreshes useMyJoinRequest, so the card switches to the Request sent status. The request is a request only: the participant list does not change until the Queue Master confirms it in Join requests (Q03).',
    "On the visitor's own page a SegmentedControl offers Continue as guest (selected: the form), Log in with ROTRA Player and Register with ROTRA (D-2026-11-09-06). The last two show one line, the notice \"Logging in or registering never gives a slot. The Queue Master confirms every request.\" and a primary button. Mock mode: the button signs the viewer in as the sample ROTRA Player (useSignIn('player')) and closes the sheet; the page then shows the one-tap join card. Real mode: Log in links to the Player app /login?next=<this page>?join=1 and Register to the Player app /register/<clubId>?next=<this page> (registerHref from the page; unavailable while the page data has no club id). Neither ever confirms a slot. Switching back to Continue as guest restores the unsent form.",
    'The operator preview shows the guest form only. The returned line "You\'re back — finish your request below." shows above the guest form.',
    'A refusal (requests turned off, a finished session, the guest offline, DevMenu next save fails) keeps the sheet open with the reason as serverError and what was typed. While sending, Cancel, Escape and the scrim cannot close the sheet.',
  ],
  docs: [
    'docs/screens/product/modules/queue/public-session.md#q-public-join--guest-join-request',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  related: ['JoinRequestForm', 'JoinRequestCard', 'PublicSession', 'Sheet'],
} satisfies ComponentMeta
