# Current callable catalog

**Last verified:** 2026-10-28 · **Baseline:** `7d7029d`. Companion to [command contracts](command-contracts.md).

Extracted from the TypeScript checker and hook imports, then reviewed against the source. Inputs retain current names/types. Long inferred outputs list **top-level field names** only, marked `(fields)`; follow the callable link for complete nested types and validation. `Promise` means the current asynchronous mock, not an HTTP endpoint. The hook-module column links query keys and mutation cache behavior; two exported hooks in one module are listed together.

Every entry inherits its actor, business/screen issue mapping, lifecycle, error, offline and retry limits from [the domain and operation tables](command-contracts.md#domain-ownership-and-source-consumers). Local cookie/connectivity/dev helpers are distinguished below. Pure rules, serializers, fixture adapters and internal transaction/projection helpers are not separate server commands.

## admin-account

[Query keys](../../../packages/data/src/admin-account/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getAdminSession](../../../packages/data/src/admin-account/fetchers.ts#L22)<br>`(no arguments)` | `Promise<AdminSession>` | [useAdminSession](../../../packages/data/src/admin-account/useAdminSession.ts) |
| [signInAdmin](../../../packages/data/src/admin-account/fetchers.ts#L26)<br>`input: AdminSignInInput` | `Promise<AdminSession>` | [useSignInAdmin](../../../packages/data/src/admin-account/useSignInAdmin.ts) |
| [signOutAdmin](../../../packages/data/src/admin-account/fetchers.ts#L41)<br>`input?: { sessionEnded?: boolean; } \| undefined` | `Promise<AdminSession>` | [useSignOutAdmin](../../../packages/data/src/admin-account/useSignOutAdmin.ts) |

## auth

[Query keys](../../../packages/data/src/auth/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getSession](../../../packages/data/src/auth/fetchers.ts#L23)<br>`audience: AuthAudience` | `Promise<MockSession \| null>` | [useSession](../../../packages/data/src/auth/useSession.ts) |
| [signIn](../../../packages/data/src/auth/fetchers.ts#L27)<br>`audience: AuthAudience, input: SignInInput` | `Promise<MockSession>` | [useSignIn](../../../packages/data/src/auth/useSignIn.ts) |
| [signOut](../../../packages/data/src/auth/fetchers.ts#L67)<br>`audience: AuthAudience` | `Promise<null>` | [useSignOut](../../../packages/data/src/auth/useSignOut.ts) |

## club

[Query keys](../../../packages/data/src/club/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [approveClubNameChange](../../../packages/data/src/club/settings.ts#L40)<br>`(no arguments)` | `Promise<SaveOutcome & { data: null; }>` | [useApproveClubNameChange](../../../packages/data/src/club/useApproveClubNameChange.ts) |
| [cancelClubNameChange](../../../packages/data/src/club/settings.ts#L35)<br>`(no arguments)` | `Promise<SaveOutcome & { data: null; }>` | [useCancelClubNameChange](../../../packages/data/src/club/useCancelClubNameChange.ts) |
| [changeClubPassword](../../../packages/data/src/club/settings.ts#L93)<br>`input: { current: string; next: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useChangeClubPassword](../../../packages/data/src/club/useChangeClubPassword.ts) |
| [getClub](../../../packages/data/src/club/fetchers.ts#L9)<br>`id: string, signal?: AbortSignal \| undefined` | `Promise<Club>` | [useClub](../../../packages/data/src/club/useClub.ts) |
| [getFacebookPost](../../../packages/data/src/club/settings.ts#L137)<br>`sessionId: string` | `Promise<{ text: string; playerCount: number; sessionTitle: string; }>` | [useFacebookPost](../../../packages/data/src/club/useFacebookPost.ts) |
| [getPostPreview](../../../packages/data/src/club/settings.ts#L141)<br>`draft: { template?: string; description?: string; courtRules?: string; }` | `Promise<{ text: string; playerCount: number; sessionTitle: string; } \| null>` | [usePostPreview](../../../packages/data/src/club/usePostPreview.ts) |
| [requestClubNameChange](../../../packages/data/src/club/settings.ts#L29)<br>`input: { requestedName: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useRequestClubNameChange](../../../packages/data/src/club/useRequestClubNameChange.ts) |
| [resetFacebookPostTemplate](../../../packages/data/src/club/settings.ts#L88)<br>`(no arguments)` | `Promise<SaveOutcome & { data: null; }>` | [useResetFacebookPostTemplate](../../../packages/data/src/club/useResetFacebookPostTemplate.ts) |
| [saveFacebookPost](../../../packages/data/src/club/settings.ts#L76)<br>`input: { template?: string; description?: string; courtRules?: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useSaveFacebookPost](../../../packages/data/src/club/useSaveFacebookPost.ts) |
| [updateClubLogo](../../../packages/data/src/club/settings.ts#L19)<br>`input: { logoUrl: string \| null; }` | `Promise<SaveOutcome & { data: null; }>` | [useUpdateClubLogo](../../../packages/data/src/club/useUpdateClubLogo.ts) |
| [updateSessionDefaults](../../../packages/data/src/club/settings.ts#L55)<br>`input: { defaultPlayersPerCourt: number; defaultEntranceFeeMinor: number \| null; }` | `Promise<SaveOutcome & { data: null; }>` | [useUpdateSessionDefaults](../../../packages/data/src/club/useUpdateSessionDefaults.ts) |

## club-player

[Query keys](../../../packages/data/src/club-player/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getClubPlayer](../../../packages/data/src/club-player/fetchers.ts#L103)<br>`id: string` | `Promise<{ displayName, rtrId, suggestion, phoneHidden, hasPhone, sessionsHere, addedAt, id, clubId, playerId, fullName, nickname, identity, playingLevel } (fields)>` | [useClubPlayer](../../../packages/data/src/club-player/useClubPlayer.ts) |
| [getClubPlayers](../../../packages/data/src/club-player/fetchers.ts#L49)<br>`filters?: ClubPlayerFilters` | `Promise<{ players, groups } (fields)>` | [useClubPlayers](../../../packages/data/src/club-player/useClubPlayers.ts) |
| [createPlayerInvite](../../../packages/data/src/club-player/fetchers.ts#L111)<br>`clubPlayerId: string` | `Promise<{ url: string; message: string; }>` | [useCreatePlayerInvite](../../../packages/data/src/club-player/useCreatePlayerInvite.ts) |

## club-venue

[Query keys](../../../packages/data/src/club-venue/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getClubVenues](../../../packages/data/src/club-venue/fetchers.ts#L9)<br>`(no arguments)` | `Promise<{ sessionsHere, nextSession, id, clubId, name, address, courtFeeMinor, entranceFeeMinor, currency } (fields)[]>` | [useClubVenues](../../../packages/data/src/club-venue/useClubVenues.ts) |
| [saveClubVenue](../../../packages/data/src/club-venue/fetchers.ts#L27)<br>`input: Omit<ClubVenue, "id" \| "clubId" \| "currency"> & { id?: string; }` | `Promise<SaveOutcome & { data: ClubVenue; }>` | [useSaveClubVenue](../../../packages/data/src/club-venue/useSaveClubVenue.ts) |

## contact-change-request

[Query keys](../../../packages/data/src/contact-change-request/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [advanceContactChangeRequest](../../../packages/data/src/contact-change-request/fetchers.ts#L106)<br>`input: { requestId: string; to: ContactChangeStatus; }` | `Promise<ContactChangeRequest>` | [useAdvanceContactChangeRequest](../../../packages/data/src/contact-change-request/useAdvanceContactChangeRequest.ts) |
| [getMyContactChangeRequest](../../../packages/data/src/contact-change-request/fetchers.ts#L19)<br>`signal?: AbortSignal \| undefined` | `Promise<ContactChangeRequest \| null>` | [useMyContactChangeRequest](../../../packages/data/src/contact-change-request/useMyContactChangeRequest.ts) |
| [submitContactChangeRequest](../../../packages/data/src/contact-change-request/fetchers.ts#L35)<br>`input: { field: ContactChangeField; toValue: string; }` | `Promise<ContactChangeRequest>` | [useSubmitContactChangeRequest](../../../packages/data/src/contact-change-request/useSubmitContactChangeRequest.ts) |

## device

[Query keys](../../../packages/data/src/device/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getDeviceDownloads](../../../packages/data/src/device/fetchers.ts#L3)<br>`(no arguments)` | `Promise<{ sessionId: string; title: string; startsAt: number; state: DownloadState; }[]>` | [useDeviceDownloads](../../../packages/data/src/device/useDeviceDownloads.ts) |

## inventory

[Query keys](../../../packages/data/src/inventory/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getInventory](../../../packages/data/src/inventory/fetchers.ts#L9)<br>`(no arguments)` | `Promise<{ items, stockValue } (fields)>` | [useInventory](../../../packages/data/src/inventory/useInventory.ts) |
| [removeInventoryItem](../../../packages/data/src/inventory/fetchers.ts#L67)<br>`id: string` | `Promise<{ data: InventoryItem; message: string; }>` | [useRemoveInventoryItem](../../../packages/data/src/inventory/useRemoveInventoryItem.ts) |
| [saveInventoryItem](../../../packages/data/src/inventory/fetchers.ts#L38)<br>`input: SaveInventoryItemInput` | `Promise<{ data: InventoryItem; message: string; }>` | [useSaveInventoryItem](../../../packages/data/src/inventory/useSaveInventoryItem.ts) |
| [stepInventoryStock](../../../packages/data/src/inventory/fetchers.ts#L75)<br>`{ id, delta }: { id: string; delta: -1 \| 1; }` | `Promise<{ data: InventoryItem; message: string; }>` | [useStepInventoryStock](../../../packages/data/src/inventory/useStepInventoryStock.ts) |

## leaderboard

[Query keys](../../../packages/data/src/leaderboard/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getLeaderboardPage](../../../packages/data/src/leaderboard/fetchers.ts#L5)<br>`{ offset, limit = 25 }: { offset: number; limit?: 25; }, signal?: AbortSignal \| undefined` | `Promise<{ entries, total } (fields)>` | [useLeaderboard](../../../packages/data/src/leaderboard/useLeaderboard.ts) |
| [searchLeaderboard](../../../packages/data/src/leaderboard/fetchers.ts#L13)<br>`query: string, signal?: AbortSignal \| undefined` | `Promise<{ hits, total } (fields)>` | [useLeaderboardSearch](../../../packages/data/src/leaderboard/useLeaderboardSearch.ts) |
| [getMyLeaderboardPosition](../../../packages/data/src/leaderboard/fetchers.ts#L21)<br>`signal?: AbortSignal \| undefined` | `Promise<number \| null>` | [useMyLeaderboardPosition](../../../packages/data/src/leaderboard/useMyLeaderboardPosition.ts) |

## license

[Query keys](../../../packages/data/src/license/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getClubAccess](../../../packages/data/src/license/fetchers.ts#L6)<br>`(no arguments)` | `Promise<ClubAccess>` | [useClubAccess](../../../packages/data/src/license/useClubAccess.ts) |
| [getClubLicense](../../../packages/data/src/license/fetchers.ts#L21)<br>`(no arguments)` | `Promise<{ plan: "Monthly" \| "Yearly"; activeSince: string; activeUntil: string; daysLeft: number; status: "active" \| "expired" \| "unverified"; } \| null>` | [useClubLicense](../../../packages/data/src/license/useClubLicense.ts) |
| [getLicensePayments](../../../packages/data/src/license/fetchers.ts#L14)<br>`(no arguments)` | `Promise<ClubLicenseTerm[]>` | [useLicensePayments](../../../packages/data/src/license/useLicensePayments.ts) |

## match

[Query keys](../../../packages/data/src/match/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [addMatch](../../../packages/data/src/match/queue.mutations.ts#L83)<br>`input: MatchLineup & { sessionId: string; }` | `Promise<SaveOutcome & { data: Match; }>` | [useAddMatch](../../../packages/data/src/match/useAddMatch.ts) |
| [addSuggestedMatch](../../../packages/data/src/match/queue.mutations.ts#L130)<br>`input: { sessionId: string; lineup: MatchLineup; switched: boolean; }` | `Promise<SaveOutcome & { data: Match; }>` | [useAddSuggestedMatch](../../../packages/data/src/match/useAddSuggestedMatch.ts) |
| [autoQueue](../../../packages/data/src/match/queue.mutations.ts#L140)<br>`input: { sessionId: string; n: 2 \| 3 \| 4 \| 6; }` | `Promise<SaveOutcome & { data: Match[]; }>` | [useAutoQueue](../../../packages/data/src/match/useAutoQueue.ts) |
| [completeMatch](../../../packages/data/src/match/control.ts#L54)<br>`input: { matchId: string; winningTeam?: "A" \| "B" \| null; teamAScore?: number \| null; teamBScore?: number \| null; operationId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useCompleteMatch](../../../packages/data/src/match/useCompleteMatch.ts) |
| [invalidateMatch](../../../packages/data/src/match/control.ts#L81)<br>`input: { matchId: string; operationId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useInvalidateMatch](../../../packages/data/src/match/useInvalidateMatch.ts) |
| [getLiveStandings](../../../packages/data/src/match/fetchers.ts#L13)<br>`sessionId: string` | `Promise<{ playerId: string; name: string; wins: number; losses: number; games: number; }[]>` | [useLiveStandings](../../../packages/data/src/match/useLiveStandings.ts) |
| [makeMatch](../../../packages/data/src/match/queue.mutations.ts#L95)<br>`input: { sessionId: string; selection: string[]; }` | `Promise<SaveOutcome & { data: Match; }>` | [useMakeMatch](../../../packages/data/src/match/useMakeMatch.ts) |
| [moveMatch](../../../packages/data/src/match/queue.mutations.ts#L183)<br>`input: { sessionId: string; matchId: string; toIndex: number; method?: "arrow" \| "drop"; }` | `Promise<SaveOutcome & { data: null; }>` | [useMoveMatch](../../../packages/data/src/match/useMoveMatch.ts) |
| [regenerateQueue](../../../packages/data/src/match/queue.mutations.ts#L156)<br>`sessionId: string` | `Promise<SaveOutcome & { data: Match[]; }>` | [useRegenerateQueue](../../../packages/data/src/match/useRegenerateQueue.ts) |
| [removeWaitingMatch](../../../packages/data/src/match/queue.mutations.ts#L211)<br>`input: { sessionId: string; matchId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useRemoveWaitingMatch](../../../packages/data/src/match/useRemoveWaitingMatch.ts) |
| [getSessionMatches](../../../packages/data/src/match/fetchers.ts#L5)<br>`sessionId: string` | `Promise<Match[]>` | [useSessionMatches](../../../packages/data/src/match/useSessionMatches.ts) |
| [startMatch](../../../packages/data/src/match/control.ts#L44)<br>`input: { matchId: string; courtIds: string[]; operationId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useStartMatch](../../../packages/data/src/match/useStartMatch.ts) |
| [substitutePlayer](../../../packages/data/src/match/control.ts#L96)<br>`input: { matchId: string; outId: string; inId: string; operationId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useSubstitutePlayer](../../../packages/data/src/match/useSubstitutePlayer.ts) |
| [swapPlayers](../../../packages/data/src/match/queue.mutations.ts#L218)<br>`input: { sessionId: string; matchId: string; a: string; b: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useSwapPlayers](../../../packages/data/src/match/useSwapPlayers.ts) |
| [updateMatchLineup](../../../packages/data/src/match/queue.mutations.ts#L114)<br>`input: { sessionId: string; matchId: string; lineup: MatchLineup; }` | `Promise<SaveOutcome & { data: Match; }>` | [useUpdateMatchLineup](../../../packages/data/src/match/useUpdateMatchLineup.ts) |

## player

[Query keys](../../../packages/data/src/player/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [findPlayerByRtrId](../../../packages/data/src/player/fetchers.ts#L25)<br>`rtrId: string, signal?: AbortSignal \| undefined` | `Promise<{ playerId: string; } \| null>` | [useFindPlayerByRtrId](../../../packages/data/src/player/useFindPlayerByRtrId.ts) |
| [getPlayerGames](../../../packages/data/src/player/fetchers.ts#L18)<br>`playerId: string, signal?: AbortSignal \| undefined` | `Promise<PlayerSessionRecord[]>` | [usePlayerGames](../../../packages/data/src/player/usePlayerGames.ts) |
| [getPlayerProfile](../../../packages/data/src/player/fetchers.ts#L34)<br>`playerId: string, signal?: AbortSignal \| undefined` | `Promise<PlayerProfile \| null>` | [usePlayerProfile](../../../packages/data/src/player/usePlayerProfile.ts) |
| [getPlayerRank](../../../packages/data/src/player/fetchers.ts#L11)<br>`playerId: string, signal?: AbortSignal \| undefined` | `Promise<PlayerRank \| null>` | [usePlayerRank](../../../packages/data/src/player/usePlayerRank.ts) |
| [updateMyProfile](../../../packages/data/src/player/fetchers.ts#L59)<br>`input: { facebook: string; instagram: string; youtube: string; linkedin: string; fullName: string; nickname: string; playingStyle: string; experienceYears: string; experienceMonths: string; }` | `Promise<PlayerProfile>` | [useUpdateMyProfile](../../../packages/data/src/player/useUpdateMyProfile.ts) |

## player-account

[Query keys](../../../packages/data/src/player-account/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [checkClaimStatus](../../../packages/data/src/player-account/fetchers.ts#L171)<br>`token: string` | `Promise<{ status: "processing"; } \| { session: MockSession; playerId: string; rtrId: string; firstName: string; status: "done"; }>` | [useCheckClaimStatus](../../../packages/data/src/player-account/useCheckClaimStatus.ts) |
| [getClaimLink](../../../packages/data/src/player-account/fetchers.ts#L74)<br>`token: string, signal?: AbortSignal \| undefined` | `Promise<ClaimLink \| null>` | [useClaimLink](../../../packages/data/src/player-account/useClaimLink.ts) |
| [completeClaim](../../../packages/data/src/player-account/fetchers.ts#L139)<br>`{ token, values }: CompleteClaimInput` | `Promise<{ session: MockSession; playerId: string; rtrId: string; firstName: string; }>` | [useCompleteClaim](../../../packages/data/src/player-account/useCompleteClaim.ts) |
| [getMyAccount](../../../packages/data/src/player-account/fetchers.ts#L16)<br>`signal?: AbortSignal \| undefined` | `Promise<MyAccount \| null>` | [useMyAccount](../../../packages/data/src/player-account/useMyAccount.ts) |
| [requestPasswordReset](../../../packages/data/src/player-account/fetchers.ts#L33)<br>`email: string` | `Promise<{ acknowledged: boolean; }>` | [useRequestPasswordReset](../../../packages/data/src/player-account/useRequestPasswordReset.ts) |
| [getResetLink](../../../packages/data/src/player-account/fetchers.ts#L43)<br>`token: string, signal?: AbortSignal \| undefined` | `Promise<{ token: string; status: "invalid" \| "valid"; }>` | [useResetLink](../../../packages/data/src/player-account/useResetLink.ts) |
| [resetPassword](../../../packages/data/src/player-account/fetchers.ts#L51)<br>`{ token, password }: { token: string; password: string; }` | `Promise<{ saved: boolean; }>` | [useResetPassword](../../../packages/data/src/player-account/useResetPassword.ts) |
| [setPhonePrivacy](../../../packages/data/src/player-account/fetchers.ts#L210)<br>`input: { phoneHidden: boolean; }` | `Promise<MyAccount>` | [useSetPhonePrivacy](../../../packages/data/src/player-account/useSetPhonePrivacy.ts) |

## public-session

[Query keys](../../../packages/data/src/public-session/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getMyJoinRequest](../../../packages/data/src/public-session/fetchers.ts#L172)<br>`slug: string` | `Promise<MyJoinRequest \| null>` | [useMyJoinRequest](../../../packages/data/src/public-session/useMyJoinRequest.ts) |
| [getPublicSession](../../../packages/data/src/public-session/fetchers.ts#L140)<br>`slug: string, options?: { visitor?: boolean; } \| undefined` | `Promise<PublicSessionPage>` | [usePublicSession](../../../packages/data/src/public-session/usePublicSession.ts) |
| [sendJoinRequest](../../../packages/data/src/public-session/fetchers.ts#L155)<br>`slug: string, input: SendJoinRequestInput` | `Promise<SaveOutcome & { data: { requestId: string; }; }>` | [useSendJoinRequest](../../../packages/data/src/public-session/useSendJoinRequest.ts) |

## queue-session

[Query keys](../../../packages/data/src/queue-session/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [addCourt](../../../packages/data/src/queue-session/courts.ts#L7)<br>`input: { sessionId: string; label: string; openUntil: number \| null; }` | `Promise<SaveOutcome & { data: { id: \`${string}-${string}-${string}-${string}-${string}\`; sessionId: string; label: string; openUntil: number \| null; removedAt: null; }; }>` | [useAddCourt](../../../packages/data/src/queue-session/useAddCourt.ts) |
| [createQueueSession](../../../packages/data/src/queue-session/mutations.ts#L84)<br>`input: QueueSessionInput` | `Promise<SaveOutcome & { data: { firstSessionId: string; created: number; skipped: number; }; }>` | [useCreateQueueSession](../../../packages/data/src/queue-session/useCreateQueueSession.ts) |
| [deleteSession](../../../packages/data/src/queue-session/mutations.ts#L301)<br>`sessionId: string` | `Promise<SaveOutcome & { data: { id: string; }; }>` | [useDeleteSession](../../../packages/data/src/queue-session/useDeleteSession.ts) |
| [downloadSession](../../../packages/data/src/queue-session/mutations.ts#L234)<br>`sessionId: string` | `Promise<{ message: string; }>` | [useDownloadSession](../../../packages/data/src/queue-session/useDownloadSession.ts) |
| [extendSession](../../../packages/data/src/queue-session/courts.ts#L43)<br>`input: { sessionId: string; minutes: 30 \| 60; }` | `Promise<SaveOutcome & { data: null; }>` | [useExtendSession](../../../packages/data/src/queue-session/useExtendSession.ts) |
| [getFinalizationStatus](../../../packages/data/src/queue-session/fetchers.ts#L93)<br>`id: string` | `Promise<SessionFinalization \| null>` | [useFinalizationStatus](../../../packages/data/src/queue-session/useFinalizationStatus.ts) |
| [finalizeSession](../../../packages/data/src/queue-session/finalization.ts#L72)<br>`input: FinalizeSessionInput` | `Promise<SaveOutcome & { data: SessionFinalization; }>` | [useFinalizeSession](../../../packages/data/src/queue-session/useFinalizeSession.ts) |
| [invalidateSession](../../../packages/data/src/queue-session/finalization.ts#L178)<br>`input: { sessionId: string; reason: string; }` | `Promise<SaveOutcome & { data: QueueSession; }>` | [useInvalidateSession](../../../packages/data/src/queue-session/useInvalidateSession.ts) |
| [getNowCard](../../../packages/data/src/queue-session/fetchers.ts#L39)<br>`clubId?: string` | `Promise<{ live: QueueSessionSummary \| undefined; upcoming: QueueSessionSummary \| undefined; upNext: QueueSessionSummary \| undefined; }>` | [useNowCard](../../../packages/data/src/queue-session/useNowCard.ts) |
| [getQueueSession](../../../packages/data/src/queue-session/fetchers.ts#L51)<br>`id: string` | `Promise<{ courts, downloadState, downloadedAt, downloadError, id, clubId, title, notes, scheduledStartAt, scheduledEndAt, venueId, venueName, venueAddress, state, invalidReason, sessionMode, allowSingles, allowDoubles, minimumGames, minimumIsCalculated, playersPerCourt, expectedPlayers, startedAt, finalizedAt, playerRecordsUpdatedAt, seriesId, publicSlug, acceptJoinRequests, courtsInUse, gamesPlayed, presentCount, rosterCount, capacity, waitlistCount, queuedCount, downloadedHere } (fields)>` | [useQueueSession](../../../packages/data/src/queue-session/useQueueSession.ts) |
| [getQueueSessions](../../../packages/data/src/queue-session/fetchers.ts#L34)<br>`clubId?: string` | `Promise<QueueSessionSummary[]>` | [useQueueSessions](../../../packages/data/src/queue-session/useQueueSessions.ts) |
| [removeCourt](../../../packages/data/src/queue-session/courts.ts#L32)<br>`input: { sessionId: string; courtId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useRemoveCourt](../../../packages/data/src/queue-session/useRemoveCourt.ts) |
| [getSessionDoneReview](../../../packages/data/src/queue-session/fetchers.ts#L64)<br>`id: string` | `Promise<SessionDoneReview>` | [useSessionDoneReview](../../../packages/data/src/queue-session/useSessionDoneReview.ts) |
| [getSessionRecord](../../../packages/data/src/queue-session/fetchers.ts#L100)<br>`id: string` | `Promise<SessionRecordSummary>` | [useSessionRecord](../../../packages/data/src/queue-session/useSessionRecord.ts) |
| [getSessionRecordHistory](../../../packages/data/src/queue-session/fetchers.ts#L152)<br>`id: string` | `Promise<SessionRecordHistory>` | [useSessionRecordHistory](../../../packages/data/src/queue-session/useSessionRecordHistory.ts) |
| [startSession](../../../packages/data/src/queue-session/mutations.ts#L276)<br>`sessionId: string` | `Promise<SaveOutcome & { data: QueueSession; }>` | [useStartSession](../../../packages/data/src/queue-session/useStartSession.ts) |
| [updateQueueSession](../../../packages/data/src/queue-session/mutations.ts#L155)<br>`{ sessionId, values, }: { sessionId: string; values: QueueSessionInput; }` | `Promise<SaveOutcome & { data: QueueSession; }>` | [useUpdateQueueSession](../../../packages/data/src/queue-session/useUpdateQueueSession.ts) |

## ranking-settings

[Query keys](../../../packages/data/src/ranking-settings/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getRankingSettings](../../../packages/data/src/ranking-settings/fetchers.ts#L5)<br>`signal?: AbortSignal \| undefined` | `Promise<RankingSettings>` | [useRankingSettings, useSetRankingSettings](../../../packages/data/src/ranking-settings/useRankingSettings.ts) |
| [setRankingSettings](../../../packages/data/src/ranking-settings/fetchers.ts#L11)<br>`settings: RankingSettings` | `Promise<RankingSettings>` | [useRankingSettings, useSetRankingSettings](../../../packages/data/src/ranking-settings/useRankingSettings.ts) |

## session-cost

[Query keys](../../../packages/data/src/session-cost/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [getSessionCostEstimate](../../../packages/data/src/session-cost/fetchers.ts#L31)<br>`id: string` | `Promise<{ saved, estimate, courts, durationMinutes, shuttleLines } (fields) \| null>` | [useSessionCostEstimate](../../../packages/data/src/session-cost/useSessionCostEstimate.ts) |

## session-payment

[Query keys](../../../packages/data/src/session-payment/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [markAllPaid](../../../packages/data/src/session-payment/fetchers.ts#L93)<br>`sessionId: string` | `Promise<SaveOutcome & { data: { count: number; }; }>` | [useMarkAllPaid](../../../packages/data/src/session-payment/useMarkAllPaid.ts) |
| [getSessionPayments](../../../packages/data/src/session-payment/fetchers.ts#L15)<br>`sessionId: string` | `Promise<{ players, amountDue, dueBasis, entranceFeeIncluded, totals } (fields) \| null>` | [useSessionPayments](../../../packages/data/src/session-payment/useSessionPayments.ts) |
| [togglePaid](../../../packages/data/src/session-payment/fetchers.ts#L62)<br>`{ sessionId, clubPlayerId, }: { sessionId: string; clubPlayerId: string; }` | `Promise<SaveOutcome & { data: { paid: boolean; }; }>` | [useTogglePaid](../../../packages/data/src/session-payment/useTogglePaid.ts) |

## session-result

[Query keys](../../../packages/data/src/session-result/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [publishResults](../../../packages/data/src/session-result/fetchers.ts#L30)<br>`input: PublishResultsInput` | `Promise<SaveOutcome & { data: SessionPublication; }>` | [usePublishResults](../../../packages/data/src/session-result/usePublishResults.ts) |
| [getSessionPublication](../../../packages/data/src/session-result/fetchers.ts#L19)<br>`id: string` | `Promise<SessionPublication \| null>` | [useSessionPublication](../../../packages/data/src/session-result/useSessionPublication.ts) |
| [getSessionResults](../../../packages/data/src/session-result/fetchers.ts#L12)<br>`id: string` | `Promise<SessionResultSnapshot \| null>` | [useSessionResults](../../../packages/data/src/session-result/useSessionResults.ts) |

## session-roster

[Query keys](../../../packages/data/src/session-roster/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [addDirectoryPlayerToSession](../../../packages/data/src/session-roster/mutations.ts#L116)<br>`input: { sessionId: string; playerId: string; level: PlayingLevel; identityCheck?: IdentityCheck; }` | `Promise<SaveOutcome & { data: { waitlistPosition: number; locked: boolean; clubPlayerId: string; }; }>` | [useAddDirectoryPlayerToSession](../../../packages/data/src/session-roster/useAddDirectoryPlayerToSession.ts) |
| [addNewPlayerToSession](../../../packages/data/src/session-roster/mutations.ts#L166)<br>`input: { sessionId: string; name: string; nickname?: string; phone?: string; level: PlayingLevel; }` | `Promise<SaveOutcome & { data: { waitlistPosition: number; locked: boolean; clubPlayerId: string; }; }>` | [useAddNewPlayerToSession](../../../packages/data/src/session-roster/useAddNewPlayerToSession.ts) |
| [addSampleJoinRequest](../../../packages/data/src/session-roster/mutations.ts#L372)<br>`sessionId: string` | `Promise<SaveOutcome & { data: { requestId: string; }; }>` | [useAddSampleJoinRequest](../../../packages/data/src/session-roster/useAddSampleJoinRequest.ts) |
| [addSavedPlayerToSession](../../../packages/data/src/session-roster/mutations.ts#L75)<br>`input: { sessionId: string; clubPlayerId: string; level: PlayingLevel; identityCheck?: IdentityCheck; }` | `Promise<SaveOutcome & { data: { waitlistPosition: number; locked: boolean; clubPlayerId: string; }; }>` | [useAddSavedPlayerToSession](../../../packages/data/src/session-roster/useAddSavedPlayerToSession.ts) |
| [confirmJoinRequest](../../../packages/data/src/session-roster/mutations.ts#L332)<br>`input: { requestId: string; level: PlayingLevel; }` | `Promise<SaveOutcome & { data: { waitlistPosition: number; locked: boolean; clubPlayerId: string; }; }>` | [useConfirmJoinRequest](../../../packages/data/src/session-roster/useConfirmJoinRequest.ts) |
| [declineJoinRequest](../../../packages/data/src/session-roster/mutations.ts#L351)<br>`requestId: string` | `Promise<SaveOutcome & { data: null; }>` | [useDeclineJoinRequest](../../../packages/data/src/session-roster/useDeclineJoinRequest.ts) |
| [fillOpenSlots](../../../packages/data/src/session-roster/mutations.ts#L262)<br>`sessionId: string` | `Promise<SaveOutcome & { data: null; }>` | [useFillOpenSlots](../../../packages/data/src/session-roster/useFillOpenSlots.ts) |
| [giveSlot](../../../packages/data/src/session-roster/mutations.ts#L249)<br>`input: { sessionId: string; waitlistId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useGiveSlot](../../../packages/data/src/session-roster/useGiveSlot.ts) |
| [playerDirectorySearch](../../../packages/data/src/session-roster/mutations.ts#L95)<br>`q: string` | `Promise<{ identity, suggestion, rankLabel, id, fullName, nickname, rtrId } (fields)[]>` | [usePlayerDirectorySearch](../../../packages/data/src/session-roster/usePlayerDirectorySearch.ts) |
| [removeFromWaitlist](../../../packages/data/src/session-roster/mutations.ts#L276)<br>`input: { sessionId: string; waitlistId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useRemoveFromWaitlist](../../../packages/data/src/session-roster/useRemoveFromWaitlist.ts) |
| [removeRosterPlayer](../../../packages/data/src/session-roster/mutations.ts#L205)<br>`input: { sessionId: string; rosterId: string; }` | `Promise<SaveOutcome & { data: null; }>` | [useRemoveRosterPlayer](../../../packages/data/src/session-roster/useRemoveRosterPlayer.ts) |
| [getSessionRoster](../../../packages/data/src/session-roster/fetchers.ts#L5)<br>`sessionId: string` | `Promise<{ roster: SessionPlayer[]; waitlist: SessionWaitlistEntry[]; joinRequests: SessionJoinRequest[]; }>` | [useSessionRoster](../../../packages/data/src/session-roster/useSessionRoster.ts) |
| [setAcceptJoinRequests](../../../packages/data/src/session-roster/mutations.ts#L360)<br>`input: { sessionId: string; accept: boolean; }` | `Promise<SaveOutcome & { data: null; }>` | [useSetAcceptJoinRequests](../../../packages/data/src/session-roster/useSetAcceptJoinRequests.ts) |
| [setAllPresence](../../../packages/data/src/session-roster/mutations.ts#L233)<br>`input: { sessionId: string; present: boolean; }` | `Promise<SaveOutcome & { data: null; }>` | [useSetAllPresence](../../../packages/data/src/session-roster/useSetAllPresence.ts) |
| [setPresence](../../../packages/data/src/session-roster/mutations.ts#L214)<br>`input: { sessionId: string; rosterId: string; present: boolean; }` | `Promise<SaveOutcome & { data: null; }>` | [useSetPresence](../../../packages/data/src/session-roster/useSetPresence.ts) |
| [setRosterLevel](../../../packages/data/src/session-roster/mutations.ts#L191)<br>`input: { sessionId: string; rosterId: string; level: PlayingLevel; }` | `Promise<SaveOutcome & { data: null; }>` | [useSetRosterLevel](../../../packages/data/src/session-roster/useSetRosterLevel.ts) |
| [submitJoinRequest](../../../packages/data/src/session-roster/mutations.ts#L321)<br>`input: JoinRequestInput` | `Promise<SaveOutcome & { data: { requestId: string; }; }>` | [useSubmitJoinRequest](../../../packages/data/src/session-roster/useSubmitJoinRequest.ts) |

## sync

[Query keys](../../../packages/data/src/sync/queryKeys.ts). See each hook for `setQueryData`, removal, subscriptions and invalidation, including the broad non-auth invalidation used by `useMockMutation`.

| Callable / current input | Output | Hook module exports |
|---|---|---|
| [answerInterruption](../../../packages/data/src/sync/fetchers.ts#L161)<br>`{ sessionId, answer, }: { sessionId: string; answer: "yes" \| "no"; }` | `Promise<SessionIntegrity>` | [useAnswerInterruption](../../../packages/data/src/sync/useAnswerInterruption.ts) |
| [retrySync](../../../packages/data/src/sync/fetchers.ts#L146)<br>`(no arguments)` | `Promise<{ message: string; }>` | [useRetrySync](../../../packages/data/src/sync/useRetrySync.ts) |
| [getSessionIntegrity](../../../packages/data/src/sync/fetchers.ts#L156)<br>`sessionId: string` | `Promise<SessionIntegrity>` | [useSessionIntegrity](../../../packages/data/src/sync/useSessionIntegrity.ts) |
| [getSyncLog](../../../packages/data/src/sync/fetchers.ts#L139)<br>`(no arguments)` | `Promise<{ pendingChanges: SyncChange[]; syncedChanges: SyncChange[]; }>` | [useSyncLog](../../../packages/data/src/sync/useSyncLog.ts) |
| [getSyncState](../../../packages/data/src/sync/fetchers.ts#L110)<br>`(no arguments)` | `Promise<SyncState>` | [useSyncState](../../../packages/data/src/sync/useSyncState.ts) |
| [getSyncStatus](../../../packages/data/src/sync/fetchers.ts#L113)<br>`(no arguments)` | `Promise<SyncStatus>` | [useSyncStatus](../../../packages/data/src/sync/useSyncStatus.ts) |

## Local-only and missing surfaces

- `useAdminConnectivity` subscribes to browser connectivity, with no database command. `parseAdminSession` and `readAdminSessionMarker` are local cookie helpers, not authenticated server reads.
- `addSampleJoinRequest` / `useAddSampleJoinRequest` and `advanceContactChangeRequest` / `useAdvanceContactChangeRequest` drive DevMenu scenarios. Their inclusion records existing code; they must not become unrestricted product endpoints.
- `approveClubNameChange` is a mock approval action exposed beside club settings; real review requires Owner authority. `setRankingSettings` also lacks real Owner authorization/versioning.
- `sessionSummary`, `clubPlayerView`, `registeredCity`, `venuePrefill`, `licensePaymentsCsv`, `applyPersonalProfile`, `sessionCostIn`, `recomputeMinimum`, `promoteWaiter`, `recordChange`, `saveToastText`, `connectMockSync`, projections and pure rules are internal/local helpers. The public operations that use them are cataloged above.
- Admin clubs/licenses, privileged player review and flags are documented target work, not missing entries accidentally treated as implemented; see the [missing command boundaries](command-contracts.md#documented-actions-with-no-production-command-implementation).

Inventory: 116 hook source files across 21 domains; 116 callable-to-hook import entries after excluding local cookie parsing/marker helpers. This count includes the explicitly identified DevMenu operations and the two callables imported by the ranking-settings hook module.
