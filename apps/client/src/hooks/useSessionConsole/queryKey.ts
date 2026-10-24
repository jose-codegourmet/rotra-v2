export const sessionConsoleQueryKey = (sessionId: string) =>
	["sessions", "console", sessionId] as const;
