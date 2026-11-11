import type { ComponentMeta } from '@rotra/ui/meta'

export const publicSessionMeta = {
  name: 'PublicSession',
  description:
    'Q-PUBLIC-DETAILS / Q-PUBLIC-PARTICIPANTS / Q-PUBLIC-RESULTS / Q-PUBLIC-JOIN container: the public session page from usePublicSession(slug): PublicSessionHero, the JoinRequestCard (prepared and active sessions), Details and "Participants · N" tabs (local state), and PublicResultsSection below the tabs for completed sessions only.',
  usage: [
    'Wires the Player-hosted access query to PublicSessionQueue and confirmed-only uncapped PublicParticipants; errors hide access data. Restores the local session tab/hash; identity never grants admission.',
    'Rendered by /s/[slug] (viewer "visitor": no sign-in, no operator top bar, nav or sync pill; proxy.ts lets /s/* through) and by the operator preview /sessions/[sessionId]/public-page under PublicPreviewBanner (viewer "operator").',
    'Hero chip: Happening now (active), Finished (completed), none for prepared and invalid sessions.',
    'JoinRequestCard variant: this visitor\'s own request from useMyJoinRequest first (Request sent, Confirmed · you have a slot, Confirmed · waitlist #N, Request not accepted), then requests off, active, "1 slot left" / "N slots left" or all slots taken. The available variants show the confirmed players’ Skill mix. Request to join opens JoinRequestSheet; sending creates a request only, so the participant list is unchanged until the Queue Master confirms it.',
    'Signed-in Player (mock mode): MyNight (useMyNight, MyNightCard) sits under the join area above the tabs for a confirmed or waitlisted Player; Invite opens SessionInviteSheet. ?invite=<code> is read by the page and sent with Request to join as NAME; it also survives the Player login round trip with tab and join. Request a match is Q17.14.',
    'Signed-in states (mock mode): while the Player\'s own read loads, a skeleton "Loading your night" stands in for the join and My night cards and the Queue shows its checking skeleton; when it fails (or the visitor is offline with nothing cached) the page shows "Couldn\'t check Player access." with Retry and the Queue says the same, never the guest login prompt. A refresh that fails keeps the data on screen. Guests see no My night card; their status card adds "Register to check in and see your matches." The refresh bar disables Refresh offline ("You\'re offline. Reconnect and try again."). Finished or cancelled: no join card, notices, match request or Invite; Request a match is unreachable. Requests off: "This session isn\'t taking requests online…", no Invite.',
    'Participant profile (#731, D-PARTICIPANT-PROFILE): for any signed-in Player (mock: the signed-in read; real: the Player app’s access read) every tile in Participants and the Waitlist is a button with the hint “Tap a player to see their profile and stats.”; the tap opens ParticipantProfile (full card, always-private card or Not on ROTRA yet card). Visitors keep plain tiles. Real mode: the waitlist comes from the visitor read, so its tiles stay plain, and the cards have no Tonight line.',
    'Results: only the published slides, Off Day only when included (public variant, no private band). Before publication: "Results for this session have not been shared." Invalid sessions have no Results section and no join card.',
    'Loading: skeleton hero, tabs and cards with no names or counts. Unknown or deleted slug: the neutral EmptyState "This session page isn\'t available." with no club, roster or retained data (copy proposal; needs product-owner sign-off).',
    'Offline visitor (DevMenu Simulate offline in the visitor\'s tab; reach /s/<slug> with Open as a guest so the tab keeps its state): a cached copy keeps showing with "Last updated HH:MM" in Details, and Request to join is disabled because sending needs internet. With no cached copy, QueryError "Couldn\'t load this session page." with "You\'re offline. Reconnect, then try again." (title is a copy proposal; needs product-owner sign-off). The public page has no DevMenu of its own.',
    'Requests off ("This session isn\'t taking requests online…") and slots full variants come from the projection; a failed send keeps JoinRequestSheet open with serverError and the typed values. Invalid sessions: hero without a status chip, Details and Participants only, no Results section and no join card. "Happening now" shows only for an active session; stale data is never called Live.',
    'Q-PUBLIC-STALE is not built: the open decision "Stale-page access and post-deletion restoration" (docs/business_logic/product/open-decisions.md) has no policy yet, so there is no stale variant and expired-club pages are out of scope.',
    'Leak check: the PublicSessionPage object (React Query devtools: public-session › detail) holds no phone, cost, presence or unpublished Off Day for any fixture session, and nothing private is rendered or preloaded.',
    "All values come from the last synced state: a disconnected operator's local edits never show, and Details adds the pending-changes line while the server knows changes are waiting. No fees, costs, phones, presence or unpublished Off Day are ever in the data; public skill groups and level labels power the participant rings.",
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
    'ParticipantProfile',
    'PublicResultsSection',
    'JoinRequestSheet',
    'MyNight',
    'SessionInviteSheet',
    'PublicPagePreview',
  ],
} satisfies ComponentMeta
