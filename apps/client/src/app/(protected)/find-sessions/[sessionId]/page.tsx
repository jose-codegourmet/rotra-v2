import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { sessionLiveQueryKey } from "@/hooks/useSessionLive/queryKey";
import { getSessionLiveContext } from "@/lib/api/session-live";
import { getCurrentProfile } from "@/lib/server/current-profile";

import { SessionLiveClient } from "./SessionLiveClient";

export const metadata: Metadata = {
	title: "Session — ROTRA",
	description: "Session lobby, queue management, and live dashboard.",
};

export default async function SessionLivePage({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = await params;
	const profile = await getCurrentProfile();

	if (!profile) {
		redirect("/login");
	}

	const sessionLive = await getSessionLiveContext(sessionId, profile.id);

	if (!sessionLive) {
		notFound();
	}

	const queryClient = new QueryClient();
	queryClient.setQueryData(sessionLiveQueryKey(sessionId), sessionLive);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SessionLiveClient sessionId={sessionId} />
		</HydrationBoundary>
	);
}
