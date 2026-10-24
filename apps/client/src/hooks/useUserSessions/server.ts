import type { UserSessionsResponse } from "@/types/user-sessions";

export async function fetchUserSessions(): Promise<UserSessionsResponse> {
	const res = await fetch("/api/sessions/my");
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<UserSessionsResponse>;
}
