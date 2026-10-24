import type { ActiveSessionResponse } from "@/types/session-discovery";

export async function fetchActiveSession(): Promise<ActiveSessionResponse> {
	const res = await fetch("/api/sessions/active");
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<ActiveSessionResponse>;
}

export async function prefetchActiveSession(
	queryClient: import("@tanstack/react-query").QueryClient,
) {
	const { activeSessionQueryKey } = await import("./queryKey");
	await queryClient.prefetchQuery({
		queryKey: activeSessionQueryKey,
		queryFn: fetchActiveSession,
	});
}
