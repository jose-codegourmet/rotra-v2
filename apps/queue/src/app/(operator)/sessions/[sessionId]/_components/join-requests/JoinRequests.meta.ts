import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestsMeta = {
  name: 'JoinRequests',
  description:
    'The Requests container (Q18.12): JoinRequestsPanel with the Join tab (Can\'t make it drop-out notices, then join requests) and the Match tab. Join requests come from useSessionRoster; ROTRA-player tags, "Invited by NAME", drop-out notices and match requests from useSessionRequests; the shared rank and the phone-match prompt from useJoinRequestHints.',
  usage: [
    'Card variant on Preparation (Q-PREPARE) between the header and the tabs, titled "Requests · N": it renders nothing while nothing waits (no join request, drop-out notice or match request).',
    'Sheet variant inside the "Requests" sheet behind every Requests · N button (live console header, live Overview actions): always renders the panel body, including the empty texts.',
    'Decisions and toasts: Confirm / Confirm guest / Confirm to waitlist through useConfirmRequest (a ROTRA player new to the club is saved as registered, "Joined via session link"; a linked guest request gives the linked saved player the slot), Decline through useDeclineJoinRequest, Link ("Linked to NAME") and Not them (no toast), Remove from roster ("NAME removed from the roster") and Keep ("NAME stays on the roster"), Add to queue ("Match added to the queue", or the "Not enough present players to fill this FORMAT match" error) and match Decline ("NAME\'s match request declined"). A missing level never reaches the mutation: the panel asks for one first.',
    "Drop-out rows and named match spots show the saved player's picture (useClubPlayers, the same source as the Queue view); Remove from roster works in prepared and live sessions, as in the prototype.",
    'Real mode has no Requests read yet: its join requests still show and work; drop-out notices, match requests and hints are mock only.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: [
    'JoinRequestsPanel',
    'DropOutNoticeRow',
    'MatchRequestCard',
    'SessionLinkCard',
    'SessionPreparation',
    'SessionConsole',
  ],
} satisfies ComponentMeta
