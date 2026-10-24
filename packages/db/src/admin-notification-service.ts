import type {
	AdminNotificationType,
	NotificationSeverity,
	PrismaClient,
} from "@prisma/client";

export type AdminNotificationInboxRow = {
	id: string;
	type: AdminNotificationType;
	severity: NotificationSeverity;
	targetUrl: string;
	title: string;
	body: string | null;
	readAt: Date | null;
	createdAt: Date;
};

export type ListAdminNotificationsForInboxInput = {
	adminId: string;
	page: number;
	limit: number;
};

export type ListAdminNotificationsForInboxResult = {
	rows: AdminNotificationInboxRow[];
	page: number;
	limit: number;
	total: number;
	unreadCount: number;
	hasMore: boolean;
};

export class AdminNotificationError extends Error {
	constructor(
		public readonly code: "not_found",
		message: string,
	) {
		super(message);
		this.name = "AdminNotificationError";
	}
}

export async function listAdminNotificationsForInbox(
	db: PrismaClient,
	input: ListAdminNotificationsForInboxInput,
): Promise<ListAdminNotificationsForInboxResult> {
	const page = Math.max(1, Math.floor(input.page));
	const limit = Math.min(50, Math.max(1, Math.floor(input.limit)));
	const skip = (page - 1) * limit;

	const [rows, total, unreadCount] = await Promise.all([
		db.adminNotification.findMany({
			where: { adminId: input.adminId },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			select: {
				id: true,
				type: true,
				severity: true,
				targetUrl: true,
				title: true,
				body: true,
				readAt: true,
				createdAt: true,
			},
		}),
		db.adminNotification.count({
			where: { adminId: input.adminId },
		}),
		db.adminNotification.count({
			where: { adminId: input.adminId, readAt: null },
		}),
	]);

	return {
		rows,
		page,
		limit,
		total,
		unreadCount,
		hasMore: skip + rows.length < total,
	};
}

export async function markAdminNotificationRead(
	db: PrismaClient,
	input: { id: string; adminId: string },
): Promise<void> {
	const existing = await db.adminNotification.findFirst({
		where: { id: input.id, adminId: input.adminId },
		select: { id: true, readAt: true },
	});

	if (!existing) {
		throw new AdminNotificationError("not_found", "Notification not found.");
	}

	if (existing.readAt != null) {
		return;
	}

	await db.adminNotification.update({
		where: { id: input.id },
		data: { readAt: new Date() },
	});
}

export async function markAllAdminNotificationsRead(
	db: PrismaClient,
	input: { adminId: string },
): Promise<{ count: number }> {
	const result = await db.adminNotification.updateMany({
		where: { adminId: input.adminId, readAt: null },
		data: { readAt: new Date() },
	});

	return { count: result.count };
}
