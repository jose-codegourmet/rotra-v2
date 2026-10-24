import { db, listNotificationsForInbox } from "@rotra/db";
import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { NotificationsViewClient } from "@/components/modules/notifications/notifications-view/NotificationsViewClient";
import { notificationsQueryKey } from "@/hooks/useNotifications/queryKey";
import { serializeNotificationsListResult } from "@/hooks/useNotifications/server";
import { getCurrentProfile } from "@/lib/server/current-profile";

const NOTIFICATIONS_PAGE_FILTERS = { page: 1, limit: 20 } as const;

export default async function NotificationsPage() {
	const profile = await getCurrentProfile();
	if (!profile) {
		redirect("/login");
	}

	const inboxResult = await listNotificationsForInbox(db, {
		recipientId: profile.id,
		...NOTIFICATIONS_PAGE_FILTERS,
	});

	const queryClient = new QueryClient();
	queryClient.setQueryData(
		notificationsQueryKey(NOTIFICATIONS_PAGE_FILTERS),
		serializeNotificationsListResult(inboxResult),
	);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<NotificationsViewClient />
		</HydrationBoundary>
	);
}
