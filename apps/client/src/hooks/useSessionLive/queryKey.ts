export const sessionLiveQueryKey = (sessionId: string) =>
	["sessions", "live", sessionId] as const;
