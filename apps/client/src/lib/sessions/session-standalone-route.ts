export const SESSION_STANDALONE_ROUTES = [
	"/sessions/join",
	"/sessions/joined",
	"/sessions/attendance",
	"/sessions/court",
	"/sessions/queue",
	"/sessions/add-match",
	"/sessions/play",
	"/sessions/play/courts",
	"/sessions/play/queue",
	"/sessions/play/standings",
] as const;

export function isSessionStandaloneRoute(pathname: string | null): boolean {
	if (!pathname) return false;
	if (pathname === "/sessions/play" || pathname.startsWith("/sessions/play/")) {
		return true;
	}
	return (SESSION_STANDALONE_ROUTES as readonly string[]).includes(pathname);
}
