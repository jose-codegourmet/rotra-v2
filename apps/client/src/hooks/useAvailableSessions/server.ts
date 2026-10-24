import type { SessionDiscoveryItem } from "@/types/session-discovery";

export interface AvailableSessionsResponse {
	sessions: SessionDiscoveryItem[];
}

export async function fetchAvailableSessions(): Promise<AvailableSessionsResponse> {
	const res = await fetch("/api/sessions/available");
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<AvailableSessionsResponse>;
}
