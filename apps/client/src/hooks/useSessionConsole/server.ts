import type { SessionConsoleData } from "@/lib/api/session-console";

export async function fetchSessionConsole(
	sessionId: string,
): Promise<SessionConsoleData> {
	const res = await fetch(`/api/sessions/${sessionId}/console`);
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<SessionConsoleData>;
}
