export const sessionRosterQueryKey = (sessionId: string) =>
	["sessions", "roster", sessionId] as const;
