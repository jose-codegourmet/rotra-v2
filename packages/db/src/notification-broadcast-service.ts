import type {
	AdminNotificationType,
	AdminRole,
	NotificationType,
	Prisma,
	PrismaClient,
} from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type BroadcastAppScope = "client" | "admin" | "super_admin";
export type BroadcastSeverity = "urgent" | "warning" | "info";

export type BroadcastAudience = {
	tagSlugs?: string[];
	adminRoles?: AdminRole[];
	excludeProfileIds?: string[];
};

export type BroadcastNotificationInput = {
	audience: BroadcastAudience;
	/** Row type for `notifications` fan-out */
	notificationType?: NotificationType;
	/** Row type for `admin_notifications` fan-out */
	adminNotificationType?: AdminNotificationType;
	severity?: BroadcastSeverity;
	title: string;
	body: string;
	appScopes: BroadcastAppScope[];
	scheduledAt?: Date | null;
	relatedEntityType?: string | null;
	relatedEntityId?: string | null;
	/** Required when `appScopes` includes `admin` */
	targetUrl?: string | null;
	createdById?: string | null;
};

export type BroadcastNotificationResult = {
	broadcastId: string;
	recipientCount: number;
	clientCount: number;
	adminCount: number;
};

export class BroadcastNotificationError extends Error {
	constructor(
		public readonly code: "bad_input",
		message: string,
	) {
		super(message);
		this.name = "BroadcastNotificationError";
	}
}

const DEFAULT_NOTIFICATION_TYPE = "platform_announcement" as const;
const DEFAULT_ADMIN_NOTIFICATION_TYPE = "platform_announcement" as const;

function assertNonEmptyAudience(audience: BroadcastAudience): void {
	const hasTags = Boolean(audience.tagSlugs?.length);
	const hasRoles = Boolean(audience.adminRoles?.length);
	if (!hasTags && !hasRoles) {
		throw new BroadcastNotificationError(
			"bad_input",
			"Audience must include at least one tag slug or admin role.",
		);
	}
}

/**
 * Fan-out notifications inside an existing transaction (e.g. admin-user mutations).
 */
export async function broadcastNotificationInTx(
	tx: DbClient,
	input: BroadcastNotificationInput,
): Promise<BroadcastNotificationResult> {
	const title = input.title.trim();
	const body = input.body.trim();
	if (!title || !body) {
		throw new BroadcastNotificationError(
			"bad_input",
			"Title and body are required.",
		);
	}
	if (!input.appScopes.length) {
		throw new BroadcastNotificationError(
			"bad_input",
			"At least one app scope (`client` or `admin`) is required.",
		);
	}

	const scopes = new Set(input.appScopes);
	for (const s of input.appScopes) {
		if (s !== "client" && s !== "admin") {
			throw new BroadcastNotificationError(
				"bad_input",
				`Invalid app scope: ${s}`,
			);
		}
	}
	if (scopes.has("admin") && !input.targetUrl?.trim()) {
		throw new BroadcastNotificationError(
			"bad_input",
			"targetUrl is required when broadcasting to the admin app.",
		);
	}

	assertNonEmptyAudience(input.audience);

	const notificationType = input.notificationType ?? DEFAULT_NOTIFICATION_TYPE;
	const adminNotificationType =
		input.adminNotificationType ?? DEFAULT_ADMIN_NOTIFICATION_TYPE;
	const severity = input.severity ?? "info";

	const exclude = new Set(input.audience.excludeProfileIds ?? []);

	const tagIds: string[] = [];
	if (input.audience.tagSlugs?.length) {
		const rows = await tx.profileTag.findMany({
			where: { slug: { in: input.audience.tagSlugs } },
			distinct: ["profileId"],
			select: { profileId: true },
		});
		tagIds.push(...rows.map((r) => r.profileId));
	}

	const roleIds: string[] = [];
	if (input.audience.adminRoles?.length) {
		const rows = await tx.profile.findMany({
			where: {
				adminRole: { in: input.audience.adminRoles },
				adminIsActive: true,
			},
			select: { id: true },
		});
		roleIds.push(...rows.map((r) => r.id));
	}

	const unified = [...new Set([...tagIds, ...roleIds])].filter(
		(id) => !exclude.has(id),
	);

	const adminRecipients = await tx.profile.findMany({
		where: {
			id: { in: unified },
			adminRole: { not: null },
			adminIsActive: true,
		},
		select: { id: true },
	});
	const adminRecipientIds = adminRecipients.map((r) => r.id);

	const now = new Date();
	const scheduledAt = input.scheduledAt ?? null;
	const sentAt = scheduledAt ? null : now;

	const broadcast = await tx.notificationBroadcast.create({
		data: {
			notificationType,
			adminNotificationType,
			severity,
			title,
			body,
			appScopes: [...input.appScopes],
			tagSlugs: input.audience.tagSlugs ?? [],
			recipientCount: unified.length,
			...(input.relatedEntityType != null && input.relatedEntityType !== ""
				? { relatedEntityType: input.relatedEntityType }
				: {}),
			...(input.relatedEntityId != null && input.relatedEntityId !== ""
				? { relatedEntityId: input.relatedEntityId }
				: {}),
			...(input.targetUrl != null && input.targetUrl.trim() !== ""
				? { targetUrl: input.targetUrl.trim() }
				: {}),
			...(scheduledAt ? { scheduledAt } : {}),
			...(input.createdById != null && input.createdById !== ""
				? { createdById: input.createdById }
				: {}),
		},
		select: { id: true },
	});

	let clientCount = 0;
	let adminCount = 0;

	if (scopes.has("client") && unified.length > 0) {
		await tx.notification.createMany({
			data: unified.map((recipientId) => ({
				recipientId,
				type: notificationType,
				severity,
				title,
				body,
				broadcastId: broadcast.id,
				scheduledAt,
				sentAt,
				relatedEntityType:
					input.relatedEntityType != null && input.relatedEntityType !== ""
						? input.relatedEntityType
						: null,
				relatedEntityId:
					input.relatedEntityId != null && input.relatedEntityId !== ""
						? input.relatedEntityId
						: null,
			})),
		});
		clientCount = unified.length;
	}

	if (scopes.has("admin") && adminRecipientIds.length > 0) {
		const url = input.targetUrl?.trim();
		if (!url) {
			throw new BroadcastNotificationError(
				"bad_input",
				"targetUrl is required when broadcasting to the admin app.",
			);
		}
		await tx.adminNotification.createMany({
			data: adminRecipientIds.map((adminId) => ({
				adminId,
				type: adminNotificationType,
				severity,
				targetUrl: url,
				title,
				body,
				broadcastId: broadcast.id,
			})),
		});
		adminCount = adminRecipientIds.length;
	}

	return {
		broadcastId: broadcast.id,
		recipientCount: unified.length,
		clientCount,
		adminCount,
	};
}

export async function broadcastNotification(
	db: PrismaClient,
	input: BroadcastNotificationInput,
): Promise<BroadcastNotificationResult> {
	return db.$transaction((tx) => broadcastNotificationInTx(tx, input));
}

export async function broadcastNotificationByTags(
	db: PrismaClient,
	tagSlugs: string[],
	rest: Omit<BroadcastNotificationInput, "audience">,
): Promise<BroadcastNotificationResult> {
	return broadcastNotification(db, {
		...rest,
		audience: { tagSlugs },
	});
}
