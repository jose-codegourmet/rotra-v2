import type { ListNotificationsForInboxResult } from "@rotra/db";

import type {
	Notification,
	NotificationKind,
} from "@/constants/mock-notifications";

import type { NotificationsQueryFilters } from "./queryKey";

export type NotificationRowSerialized = {
	id: string;
	type: string;
	severity: string;
	title: string;
	body: string;
	isRead: boolean;
	readAt: string | null;
	createdAt: string;
};

export type NotificationsListResponse = {
	rows: NotificationRowSerialized[];
	page: number;
	limit: number;
	total: number;
	unreadCount: number;
	hasMore: boolean;
};

export function serializeNotificationsListResult(
	result: ListNotificationsForInboxResult,
): NotificationsListResponse {
	return {
		rows: result.rows.map((row) => ({
			id: row.id,
			type: row.type,
			severity: row.severity,
			title: row.title,
			body: row.body,
			isRead: row.isRead,
			readAt: row.readAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
		})),
		page: result.page,
		limit: result.limit,
		total: result.total,
		unreadCount: result.unreadCount,
		hasMore: result.hasMore,
	};
}

const NOTIFICATION_TYPE_TO_KIND: Record<string, NotificationKind> = {
	session_reminder_2h: "session",
	session_reminder_1h: "session",
	session_reminder_30m: "session",
	session_reminder_5m: "session",
	session_started: "session",
	session_ended: "session",
	match_assigned: "match",
	umpire_assigned: "match",
	score_near_limit: "match",
	match_completed: "match",
	waitlist_promoted: "session",
	payment_reminder: "session",
	review_window_closing: "review",
	leaderboard_published: "exp",
	join_request_result: "club",
	direct_invite_received: "club",
	club_owner_application_result: "club",
	club_application_submitted: "club",
	club_application_approved: "club",
	club_application_rejected: "club",
	platform_announcement: "system",
};

function formatRelativeTime(iso: string): string {
	const date = new Date(iso);
	const now = Date.now();
	const diffMs = now - date.getTime();
	if (diffMs < 0) return "Just now";

	const minutes = Math.floor(diffMs / 60_000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hr ago`;

	const days = Math.floor(hours / 24);
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;

	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year:
			date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
	});
}

export function adaptNotificationToUiItem(
	row: NotificationRowSerialized,
): Notification {
	const severity =
		row.severity === "urgent" ||
		row.severity === "warning" ||
		row.severity === "info"
			? row.severity
			: "info";

	return {
		id: row.id,
		kind: NOTIFICATION_TYPE_TO_KIND[row.type] ?? "system",
		severity,
		title: row.title,
		message: row.body,
		time: formatRelativeTime(row.createdAt),
		unread: !row.isRead,
	};
}

function parseApiErrorMessage(payload: unknown, fallback: string): string {
	if (
		typeof payload === "object" &&
		payload &&
		"error" in payload &&
		typeof payload.error === "string"
	) {
		return payload.error;
	}
	return fallback;
}

function buildListSearchParams(filters: NotificationsQueryFilters): string {
	const p = new URLSearchParams();
	if (filters.page > 1) p.set("page", String(filters.page));
	if (filters.limit !== 20) p.set("limit", String(filters.limit));
	const s = p.toString();
	return s ? `?${s}` : "";
}

export async function fetchNotifications(
	filters: NotificationsQueryFilters,
): Promise<NotificationsListResponse> {
	const qs = buildListSearchParams(filters);
	const response = await fetch(`/api/notifications/me${qs}`, {
		method: "GET",
	});
	const raw = (await response.json().catch(() => null)) as unknown;

	if (!response.ok) {
		throw new Error(parseApiErrorMessage(raw, "Failed to load notifications."));
	}

	if (
		typeof raw !== "object" ||
		!raw ||
		!("rows" in raw) ||
		!("unreadCount" in raw)
	) {
		throw new Error("Invalid notifications response.");
	}

	return raw as NotificationsListResponse;
}

export async function postMarkAllNotificationsRead(): Promise<{
	ok: true;
	count: number;
}> {
	const response = await fetch("/api/notifications/me/read-all", {
		method: "POST",
	});
	const raw = (await response.json().catch(() => null)) as unknown;

	if (!response.ok) {
		throw new Error(
			parseApiErrorMessage(raw, "Failed to mark notifications as read."),
		);
	}

	if (
		typeof raw !== "object" ||
		!raw ||
		!("ok" in raw) ||
		raw.ok !== true ||
		!("count" in raw)
	) {
		throw new Error("Invalid mark-all-read response.");
	}

	return raw as { ok: true; count: number };
}
