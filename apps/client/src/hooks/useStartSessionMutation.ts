"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { activeSessionQueryKey } from "@/hooks/useActiveSession/queryKey";
import { sessionConsoleQueryKey } from "@/hooks/useSessionConsole/queryKey";
import { sessionLiveQueryKey } from "@/hooks/useSessionLive/queryKey";

async function startSession(sessionId: string): Promise<{ ok: true }> {
	const res = await fetch(`/api/sessions/${sessionId}/start`, {
		method: "POST",
	});

	const data = (await res.json().catch(() => null)) as {
		error?: string;
		ok?: boolean;
	} | null;

	if (!res.ok) {
		throw new Error(data?.error ?? `Request failed (${res.status})`);
	}

	if (!data?.ok) {
		throw new Error("Invalid response from server.");
	}

	return { ok: true };
}

export function useStartSessionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: startSession,
		onSuccess: (_data, sessionId) => {
			toast.success("Session started.");
			void queryClient.invalidateQueries({
				queryKey: activeSessionQueryKey,
			});
			void queryClient.invalidateQueries({
				queryKey: sessionLiveQueryKey(sessionId),
			});
			void queryClient.invalidateQueries({
				queryKey: sessionConsoleQueryKey(sessionId),
			});
		},
		onError: (error: Error) => {
			toast.error(error.message || "Could not start session. Try again.");
		},
	});
}
