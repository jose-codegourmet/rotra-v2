import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { availableSessionsQueryKey } from "@/hooks/useAvailableSessions/queryKey";
import { userSessionsQueryKey } from "@/hooks/useUserSessions/queryKey";
import { getAllOpenSessions } from "@/lib/api/session-discovery";
import { getUserSessions } from "@/lib/api/user-sessions";
import { getCurrentProfile } from "@/lib/server/current-profile";

import { SessionsClient } from "./SessionsClient";

export const metadata: Metadata = {
	title: "Find Sessions — ROTRA",
	description:
		"Browse available badminton sessions and view your upcoming bookings.",
};

export default async function FindSessionsPage() {
	const profile = await getCurrentProfile();
	if (!profile) {
		redirect("/login");
	}

	const [availableSessions, userSessions] = await Promise.all([
		getAllOpenSessions(profile.id),
		getUserSessions(profile.id),
	]);

	const queryClient = new QueryClient();
	queryClient.setQueryData(availableSessionsQueryKey, {
		sessions: availableSessions,
	});
	queryClient.setQueryData(userSessionsQueryKey, userSessions);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SessionsClient />
		</HydrationBoundary>
	);
}
