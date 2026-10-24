"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { activeSessionQueryKey } from "@/hooks/useActiveSession/queryKey";
import { sessionLiveQueryKey } from "@/hooks/useSessionLive/queryKey";

async function leaveSession(sessionId: string): Promise<{ ok: true }> {
	const res = await fetch(`/api/sessions/${sessionId}/leave`, {
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

export function useLeaveSessionMutation() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: leaveSession,
		onSuccess: (_data, sessionId) => {
			toast.success("You've left the session.");
			void queryClient.invalidateQueries({
				queryKey: activeSessionQueryKey,
			});
			void queryClient.invalidateQueries({
				queryKey: sessionLiveQueryKey(sessionId),
			});
			router.push("/dashboard");
		},
		onError: () => {
			toast.error("Could not leave session. Try again.");
		},
	});
}
