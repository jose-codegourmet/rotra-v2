import type { SessionRosterResponse } from "@/types/session-roster";

export async function fetchSessionRoster(
	sessionId: string,
): Promise<SessionRosterResponse> {
	const res = await fetch(`/api/sessions/${sessionId}/roster`);
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<SessionRosterResponse>;
}
