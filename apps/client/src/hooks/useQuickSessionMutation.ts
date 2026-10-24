"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuickSessionFormValues } from "@/components/modules/dashboard/quick-session-sheet/schema";
import { activeSessionQueryKey } from "@/hooks/useActiveSession/queryKey";
import { sessionDiscoveryRootKey } from "@/hooks/useSessionDiscovery/queryKey";

export type QuickSessionResponse = {
	sessionId: string;
	href: string;
};

async function createQuickSession(
	body: QuickSessionFormValues,
): Promise<QuickSessionResponse> {
	const res = await fetch("/api/sessions/quick", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const data = (await res.json().catch(() => null)) as {
		error?: string;
		sessionId?: string;
		href?: string;
	} | null;

	if (!res.ok) {
		throw new Error(data?.error ?? `Request failed (${res.status})`);
	}

	if (!data?.sessionId || !data?.href) {
		throw new Error("Invalid response from server.");
	}

	return { sessionId: data.sessionId, href: data.href };
}

export function useQuickSessionMutation() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createQuickSession,
		onSuccess: (data, variables) => {
			toast.success("Session opened. Share the link with your club.");
			void queryClient.invalidateQueries({
				queryKey: sessionDiscoveryRootKey,
			});
			void queryClient.invalidateQueries({
				queryKey: activeSessionQueryKey,
			});
			router.push(data.href);

			if (variables.venue.isNewSubmission) {
				void fetch("/api/places/submit", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: variables.venue.name,
						address: variables.venue.address ?? "",
						latitude: variables.venue.latitude,
						longitude: variables.venue.longitude,
					}),
				});
			}
		},
		onError: () => {
			toast.error("Could not create session. Try again.");
		},
	});
}
