import type {
	NotificationSeverity,
	NotificationType,
	PrismaClient,
} from "@prisma/client";

export type NotificationInboxRow = {
	id: string;
	type: NotificationType;
	severity: NotificationSeverity;
	title: string;
	body: string;
	isRead: boolean;
	readAt: Date | null;
	createdAt: Date;
};

export type ListNotificationsForInboxInput = {
	recipientId: string;
	page: number;
	limit: number;
};

export type ListNotificationsForInboxResult = {
	rows: NotificationInboxRow[];
	page: number;
	limit: number;
	total: number;
	unreadCount: number;
	hasMore: boolean;
};

export class NotificationError extends Error {
	constructor(
		public readonly code: "not_found",
		message: string,
	) {
		super(message);
		this.name = "NotificationError";
	}
}

export async function listNotificationsForInbox(
	db: PrismaClient,
	input: ListNotificationsForInboxInput,
): Promise<ListNotificationsForInboxResult> {
	const page = Math.max(1, Math.floor(input.page));
	const limit = Math.min(50, Math.max(1, Math.floor(input.limit)));
	const skip = (page - 1) * limit;

	const [rows, total, unreadCount] = await Promise.all([
		db.notification.findMany({
			where: { recipientId: input.recipientId },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			select: {
				id: true,
				type: true,
				severity: true,
				title: true,
				body: true,
				isRead: true,
				readAt: true,
				createdAt: true,
			},
		}),
		db.notification.count({
			where: { recipientId: input.recipientId },
		}),
		db.notification.count({
			where: { recipientId: input.recipientId, isRead: false },
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

export async function markAllNotificationsRead(
	db: PrismaClient,
	input: { recipientId: string },
): Promise<{ count: number }> {
	const result = await db.notification.updateMany({
		where: { recipientId: input.recipientId, isRead: false },
		data: { isRead: true, readAt: new Date() },
	});

	return { count: result.count };
}
