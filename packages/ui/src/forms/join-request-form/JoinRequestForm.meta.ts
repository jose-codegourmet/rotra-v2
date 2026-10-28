import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestFormMeta = {
  name: 'JoinRequestForm',
  description:
    "Q-PUBLIC-JOIN › Request to join: the session line, the guest's name (required), nickname and phone (optional) and their self-declared level (Beginner / Intermediate / Advanced / Not sure), with the note that a request is not a booking. Cancel and Send request.",
  usage: [
    'Open it in a sheet titled "Request to join" from JoinRequestCard\'s Request to join button, with sessionLine as "title · date, time · venue".',
    'onSubmit receives nickname and phone as null when empty, the phone in E.164, and statedBand as one of beginner, intermediate, advanced or unsure (session_join_requests.stated_band).',
    'The form never sends: the container owns useSubmitJoinRequest, the "Request sent" toast and serverError. A failed send keeps what was typed; submit is disabled while isPending.',
    "Sending needs internet. The Queue Master's level for the night is set when they confirm, in JoinRequestsPanel, never here.",
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Public session (guest) › SHEETS.join, ACT.sendJoin',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md#q-public-join--guest-join-request',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
    'docs/coding-conventions.md#6-forms',
  ],
  related: ['JoinRequestCard', 'JoinRequestsPanel', 'ChoiceGroup', 'Field', 'Sheet'],
} satisfies ComponentMeta
