import type { ComponentMeta } from '@rotra/ui/meta'

export const publicSessionMeta = {
  name: 'PublicSession',
  description:
    'Q-PUBLIC-DETAILS / Q-PUBLIC-PARTICIPANTS / Q-PUBLIC-RESULTS / Q-PUBLIC-JOIN container: the public session page from usePublicSession(slug): PublicSessionHero, the JoinRequestCard (prepared and active sessions), Details and "Participants · N" tabs (local state), and PublicResultsSection below the tabs for completed sessions only.',
  usage: [
    'Rendered by /s/[slug] (viewer "visitor": no sign-in, no operator top bar, nav or sync pill; proxy.ts lets /s/* through) and by the operator preview /sessions/[sessionId]/public-page under PublicPreviewBanner (viewer "operator").',
    'Hero chip: Happening now (active), Finished (completed), none for prepared and invalid sessions.',
    'JoinRequestCard variant: this visitor\'s own request from useMyJoinRequest first (Request sent, Confirmed · you have a slot, Confirmed · waitlist #N, Request not accepted), then requests off, "N of M slots open." or all slots taken. Request to join opens JoinRequestSheet; sending creates a request only, so the participant list is unchanged until the Queue Master confirms it.',
    'Results: only the published slides, Off Day only when included (public variant, no private band). Before publication: "Results for this session have not been shared." Invalid sessions have no Results section and no join card.',
    'Loading: skeleton hero, tabs and cards with no names or counts. Unknown or deleted slug: the neutral EmptyState "This session page isn\'t available." with no club, roster or retained data (copy proposal; needs product-owner sign-off).',
    'Offline visitor (DevMenu Simulate offline in the visitor\'s tab; reach /s/<slug> with Open as a guest so the tab keeps its state): a cached copy keeps showing with "Last updated HH:MM" in Details, and Request to join is disabled because sending needs internet. With no cached copy, QueryError "Couldn\'t load this session page." with "You\'re offline. Reconnect, then try again." (title is a copy proposal; needs product-owner sign-off). The public page has no DevMenu of its own.',
    'Requests off ("This session isn\'t taking requests online…") and slots full variants come from the projection; a failed send keeps JoinRequestSheet open with serverError and the typed values. Invalid sessions: hero without a status chip, Details and Participants only, no Results section and no join card. "Happening now" shows only for an active session; stale data is never called Live.',
    'Q-PUBLIC-STALE is not built: the open decision "Stale-page access and post-deletion restoration" (docs/business_logic/product/open-decisions.md) has no policy yet, so there is no stale variant and expired-club pages are out of scope.',
    'Leak check: the PublicSessionPage object (React Query devtools: public-session › detail) holds no phone, cost, level, presence or unpublished Off Day for any fixture session, and nothing private is rendered or preloaded.',
    "All values come from the last synced state: a disconnected operator's local edits never show, and Details adds the pending-changes line while the server knows changes are waiting. No fees, costs, phones, levels, presence or unpublished Off Day are ever in the data.",
  ],
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/README.md#public-session-page',
  ],
  related: [
    'PublicSessionHero',
    'JoinRequestCard',
    'PublicSessionDetails',
    'PublicParticipants',
    'PublicResultsSection',
    'JoinRequestSheet',
    'PublicPagePreview',
  ],
} satisfies ComponentMeta
