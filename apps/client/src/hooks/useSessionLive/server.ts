import type { SessionLiveContext } from "@/types/session-live";

export async function fetchSessionLive(
	sessionId: string,
): Promise<SessionLiveContext> {
	const res = await fetch(`/api/sessions/${sessionId}/live`);
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<SessionLiveContext>;
}
