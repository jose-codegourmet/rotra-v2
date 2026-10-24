"use client";

import { Button } from "@/components/ui/button/Button";
import {
	useMarkAllNotificationsRead,
	useNotificationsQuery,
} from "@/hooks/useNotifications/client";
import { adaptNotificationToUiItem } from "@/hooks/useNotifications/server";

import { NotificationsView } from "./NotificationsView";

const NOTIFICATIONS_PAGE_LIMIT = 20;

export function NotificationsViewClient() {
	const { data, isLoading, isError } = useNotificationsQuery(
		{ page: 1, limit: NOTIFICATIONS_PAGE_LIMIT },
		{ refetchInterval: 30_000 },
	);
	const markAllRead = useMarkAllNotificationsRead();

	const notifications =
		data?.rows.map((row) => adaptNotificationToUiItem(row)) ?? [];
	const unreadCount = data?.unreadCount ?? 0;

	return (
		<div className="space-y-4">
			{unreadCount > 0 ? (
				<div className="mx-auto flex max-w-3xl justify-end px-4 md:px-0">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={markAllRead.isPending}
						onClick={() => markAllRead.mutate()}
					>
						{markAllRead.isPending ? "Marking…" : "Mark all as read"}
					</Button>
				</div>
			) : null}
			{isLoading && !data ? (
				<p className="mx-auto max-w-3xl px-4 text-body text-text-secondary md:px-0">
					Loading notifications…
				</p>
			) : isError ? (
				<p className="mx-auto max-w-3xl px-4 text-body text-destructive md:px-0">
					Unable to load notifications. Please refresh the page.
				</p>
			) : (
				<NotificationsView notifications={notifications} />
			)}
		</div>
	);
}

NotificationsViewClient.displayName = "NotificationsViewClient";
