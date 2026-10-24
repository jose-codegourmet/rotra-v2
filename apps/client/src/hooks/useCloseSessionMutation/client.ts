"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { activeSessionQueryKey } from "@/hooks/useActiveSession/queryKey";
import { sessionLiveQueryKey } from "@/hooks/useSessionLive/queryKey";
import { userSessionsQueryKey } from "@/hooks/useUserSessions/queryKey";

async function closeSession(sessionId: string): Promise<{ ok: true }> {
	const res = await fetch(`/api/sessions/${sessionId}/close`, {
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

export function useCloseSessionMutation() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: closeSession,
		onSuccess: (_data, sessionId) => {
			toast.success("Session closed.");
			void queryClient.invalidateQueries({
				queryKey: activeSessionQueryKey,
			});
			void queryClient.invalidateQueries({
				queryKey: userSessionsQueryKey,
			});
			void queryClient.invalidateQueries({
				queryKey: sessionLiveQueryKey(sessionId),
			});
			router.push("/find-sessions");
		},
		onError: () => {
			toast.error("Could not close session. Try again.");
		},
	});
}
