import type {
	AdminAction,
	AdminNotificationType,
	AdminRole,
	InvitationStatus,
	NotificationType,
	Prisma,
	PrismaClient,
} from "@prisma/client";

import { broadcastNotificationInTx } from "./notification-broadcast-service";

/** Client-side enum stored on broadcast audit rows / optional `notifications` fan-out */
const ADMIN_BROADCAST_NOTIFICATION_TYPE =
	"platform_announcement" as NotificationType;
/** Admin inbox rows for lifecycle alerts between Super Admins */
const ADMIN_LIFECYCLE_NOTIFICATION_TYPE =
	"admin_profile_changed" as AdminNotificationType;

type DbClient = PrismaClient | Prisma.TransactionClient;

export class AdminUserError extends Error {
	constructor(
		public readonly code:
			| "not_found"
			| "forbidden"
			| "conflict"
			| "bad_input"
			| "bad_state",
		message: string,
	) {
		super(message);
		this.name = "AdminUserError";
	}
}

export type AdminDirectoryStatus = "invited" | "active" | "inactive";

export type AdminDirectoryUser = {
	id: string;
	name: string;
	email: string;
	adminRole: AdminRole;
	adminIsActive: boolean;
	adminInvitedAt: Date | null;
	adminActivatedAt: Date | null;
	adminDeactivatedAt: Date | null;
	lastActiveAt: Date | null;
	status: AdminDirectoryStatus;
	openInvitationStatus: InvitationStatus | null;
};

export type AdminActionTimelineEntry = {
	id: string;
	action: AdminAction;
	entityType: string;
	entityId: string;
	beforeValue: Prisma.JsonValue | null;
	afterValue: Prisma.JsonValue | null;
	note: string | null;
	createdAt: Date;
	admin: {
		id: string;
		name: string;
		email: string | null;
	} | null;
};

export type AdminUserDetail = {
	user: AdminDirectoryUser;
	activityByThisAdmin: AdminActionTimelineEntry[];
	activityOnThisAdmin: AdminActionTimelineEntry[];
};

export type InviteAdminUserInput = {
	actorProfileId: string;
	authUserId: string;
	name: string;
	email: string;
	role: AdminRole;
};

export type InviteAdminUserResult = {
	profileId: string;
	invitationId: string;
};

type MutateGuards = {
	actorProfileId: string;
	targetProfileId: string;
	foundingSuperAdminId?: string | null | undefined;
	requireTargetActive?: boolean;
};

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

async function profileDisplayName(tx: DbClient, profileId: string): Promise<string> {
	const row = await tx.profile.findUnique({
		where: { id: profileId },
		select: { name: true },
	});
	return row?.name?.trim() || "Admin";
}

function profileSnapshot(profile: {
	id: string;
	email: string | null;
	adminRole: AdminRole | null;
	adminIsActive: boolean;
	adminInvitedAt: Date | null;
	adminActivatedAt: Date | null;
	adminDeactivatedAt: Date | null;
}) {
	return {
		id: profile.id,
		email: profile.email,
		adminRole: profile.adminRole,
		adminIsActive: profile.adminIsActive,
		adminInvitedAt: profile.adminInvitedAt,
		adminActivatedAt: profile.adminActivatedAt,
		adminDeactivatedAt: profile.adminDeactivatedAt,
	};
}

async function assertActiveSuperAdmin(tx: DbClient, actorProfileId: string) {
	const actor = await tx.profile.findUnique({
		where: { id: actorProfileId },
		select: {
			id: true,
			adminRole: true,
			adminIsActive: true,
		},
	});
	if (!actor || actor.adminRole !== "super_admin" || !actor.adminIsActive) {
		throw new AdminUserError(
			"forbidden",
			"Only active Super Admins can perform this action.",
		);
	}
}

async function assertTargetMutationAllowed(
	tx: DbClient,
	input: MutateGuards,
): Promise<{
	target: {
		id: string;
		email: string | null;
		adminRole: AdminRole | null;
		adminIsActive: boolean;
		adminInvitedAt: Date | null;
		adminActivatedAt: Date | null;
		adminDeactivatedAt: Date | null;
	};
}> {
	await assertActiveSuperAdmin(tx, input.actorProfileId);

	const target = await tx.profile.findUnique({
		where: { id: input.targetProfileId },
		select: {
			id: true,
			email: true,
			adminRole: true,
			adminIsActive: true,
			adminInvitedAt: true,
			adminActivatedAt: true,
			adminDeactivatedAt: true,
		},
	});
	if (!target?.adminRole) {
		throw new AdminUserError("not_found", "Admin user not found.");
	}

	if (input.requireTargetActive && !target.adminIsActive) {
		throw new AdminUserError("bad_state", "Admin user is not active.");
	}

	if (input.foundingSuperAdminId && target.id === input.foundingSuperAdminId) {
		throw new AdminUserError(
			"forbidden",
			"Founding Super Admin cannot be modified.",
		);
	}

	return { target };
}

async function assertLastActiveSuperAdminGuard(
	tx: DbClient,
	targetProfileId: string,
): Promise<void> {
	const activeSuperAdmins = await tx.profile.count({
		where: {
			adminRole: "super_admin",
			adminIsActive: true,
		},
	});
	const isTargetActiveSuperAdmin = await tx.profile.findFirst({
		where: {
			id: targetProfileId,
			adminRole: "super_admin",
			adminIsActive: true,
		},
		select: { id: true },
	});
	if (isTargetActiveSuperAdmin && activeSuperAdmins <= 1) {
		throw new AdminUserError(
			"forbidden",
			"Cannot leave the platform without an active Super Admin.",
		);
	}
}

type AdminProfileJoinRow = {
	id: string;
	name: string;
	email: string | null;
	adminRole: AdminRole;
	adminIsActive: boolean;
	adminInvitedAt: Date | null;
	adminActivatedAt: Date | null;
	adminDeactivatedAt: Date | null;
};

export async function listAdminUsers(db: PrismaClient): Promise<AdminDirectoryUser[]> {
	const admins = await db.$queryRaw<AdminProfileJoinRow[]>`
		SELECT
			p.id::text AS "id",
			p.name AS "name",
			p.email AS "email",
			p.admin_role AS "adminRole",
			p.admin_is_active AS "adminIsActive",
			p.admin_invited_at AS "adminInvitedAt",
			p.admin_activated_at AS "adminActivatedAt",
			p.admin_deactivated_at AS "adminDeactivatedAt"
		FROM public.profiles p
		INNER JOIN auth.users u ON u.id = p.id
		WHERE p.admin_role IS NOT NULL
		ORDER BY p.admin_role ASC, p.name ASC
	`;

	const adminIds = admins.map((admin) => admin.id);
	const emails = admins
		.map((admin) => admin.email)
		.filter((email): email is string => Boolean(email));

	const [activityRows, openInvites] = await Promise.all([
		adminIds.length === 0
			? Promise.resolve([])
			: db.adminActionLog.groupBy({
					by: ["adminId"],
					where: { adminId: { in: adminIds } },
					_max: { createdAt: true },
				}),
		emails.length === 0
			? Promise.resolve([])
			: db.adminInvitation.findMany({
					where: {
						email: { in: emails },
						status: { in: ["pending", "expired"] },
					},
					orderBy: { createdAt: "desc" },
					distinct: ["email"],
					select: { email: true, status: true },
				}),
	]);

	const lastActiveMap = new Map<string, Date>();
	for (const row of activityRows) {
		if (row.adminId && row._max.createdAt) {
			lastActiveMap.set(row.adminId, row._max.createdAt);
		}
	}
	const inviteMap = new Map<string, InvitationStatus>();
	for (const row of openInvites) {
		inviteMap.set(normalizeEmail(row.email), row.status);
	}

	const rows: AdminDirectoryUser[] = [];
	for (const admin of admins) {
		if (!admin.adminRole || !admin.email) continue;
		const openInvitationStatus = inviteMap.get(normalizeEmail(admin.email)) ?? null;
		const status: AdminDirectoryStatus = admin.adminIsActive
			? "active"
			: openInvitationStatus
				? "invited"
				: "inactive";
		rows.push({
			id: admin.id,
			name: admin.name,
			email: admin.email,
			adminRole: admin.adminRole,
			adminIsActive: admin.adminIsActive,
			adminInvitedAt: admin.adminInvitedAt,
			adminActivatedAt: admin.adminActivatedAt,
			adminDeactivatedAt: admin.adminDeactivatedAt,
			lastActiveAt: lastActiveMap.get(admin.id) ?? null,
			status,
			openInvitationStatus,
		});
	}
	return rows;
}

export async function getAdminUserDetail(
	db: PrismaClient,
	id: string,
): Promise<AdminUserDetail> {
	const users = await listAdminUsers(db);
	const user = users.find((row) => row.id === id);
	if (!user) throw new AdminUserError("not_found", "Admin user not found.");

	const [activityByThisAdmin, activityOnThisAdmin] = await Promise.all([
		db.adminActionLog.findMany({
			where: { adminId: id },
			orderBy: { createdAt: "desc" },
			take: 100,
			select: {
				id: true,
				action: true,
				entityType: true,
				entityId: true,
				beforeValue: true,
				afterValue: true,
				note: true,
				createdAt: true,
				admin: {
					select: { id: true, name: true, email: true },
				},
			},
		}),
		db.adminActionLog.findMany({
			where: { entityType: "admin_user", entityId: id },
			orderBy: { createdAt: "desc" },
			take: 100,
			select: {
				id: true,
				action: true,
				entityType: true,
				entityId: true,
				beforeValue: true,
				afterValue: true,
				note: true,
				createdAt: true,
				admin: {
					select: { id: true, name: true, email: true },
				},
			},
		}),
	]);

	return {
		user,
		activityByThisAdmin,
		activityOnThisAdmin,
	};
}

export async function inviteAdminUser(
	db: PrismaClient,
	input: InviteAdminUserInput,
): Promise<InviteAdminUserResult> {
	const email = normalizeEmail(input.email);
	if (!email) {
		throw new AdminUserError("bad_input", "Email is required.");
	}
	if (!input.name.trim()) {
		throw new AdminUserError("bad_input", "Name is required.");
	}
	return db.$transaction(async (tx) => {
		await assertActiveSuperAdmin(tx, input.actorProfileId);

		const existingAdmin = await tx.profile.findFirst({
			where: {
				email,
				adminRole: { not: null },
			},
			select: { id: true },
		});
		if (existingAdmin) {
			throw new AdminUserError(
				"conflict",
				"An admin account already exists for this email.",
			);
		}

		const existingPendingInvite = await tx.adminInvitation.findFirst({
			where: { email, status: "pending" },
			select: { id: true },
		});
		if (existingPendingInvite) {
			throw new AdminUserError(
				"conflict",
				"This email already has a pending admin invitation.",
			);
		}

		const now = new Date();
		const profile = await tx.profile.create({
			data: {
				id: input.authUserId,
				facebookId: `fallback_${input.authUserId}`,
				name: input.name.trim(),
				email,
				adminRole: input.role,
				adminIsActive: false,
				adminInvitedById: input.actorProfileId,
				adminInvitedAt: now,
			},
			select: { id: true, email: true, adminRole: true, adminIsActive: true },
		});

		const invite = await tx.adminInvitation.create({
			data: {
				email,
				role: input.role,
				invitedById: input.actorProfileId,
				status: "pending",
			},
			select: { id: true },
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_invited",
				entityType: "admin_user",
				entityId: profile.id,
				afterValue: {
					email: profile.email,
					role: profile.adminRole,
					adminIsActive: profile.adminIsActive,
				} as object,
			},
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "info",
			title: "Admin invitation sent",
			body: `${actorName} invited ${email} as ${input.role}.`,
			appScopes: ["admin"],
			targetUrl: `/admins/${profile.id}`,
			relatedEntityType: "admin_user",
			relatedEntityId: profile.id,
			createdById: input.actorProfileId,
		});

		return {
			profileId: profile.id,
			invitationId: invite.id,
		};
	});
}

export async function activateAdminIfNeeded(
	db: PrismaClient,
	input: {
		userId: string;
		email?: string | null | undefined;
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		const profile = await tx.profile.findUnique({
			where: { id: input.userId },
			select: {
				id: true,
				email: true,
				adminRole: true,
				adminIsActive: true,
			},
		});
		if (!profile?.adminRole) return;

		const inviteEmail = input.email?.trim().toLowerCase() || profile.email || "";
		let activated = false;
		const now = new Date();

		if (!profile.adminIsActive) {
			await tx.profile.update({
				where: { id: profile.id },
				data: {
					adminIsActive: true,
					adminActivatedAt: now,
					adminDeactivatedAt: null,
					adminDeactivatedById: null,
				},
			});
			activated = true;
		}

		const inviteUpdate = inviteEmail
			? await tx.adminInvitation.updateMany({
					where: {
						email: inviteEmail,
						status: "pending",
					},
					data: {
						status: "accepted",
						acceptedById: profile.id,
						acceptedAt: now,
					},
				})
			: { count: 0 };

		if (activated || inviteUpdate.count > 0) {
			await tx.adminActionLog.create({
				data: {
					adminId: profile.id,
					action: "admin_activated",
					entityType: "admin_user",
					entityId: profile.id,
				},
			});
		}
	});
}

export async function resendAdminInvite(
	db: PrismaClient,
	input: {
		actorProfileId: string;
		targetProfileId: string;
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		await assertActiveSuperAdmin(tx, input.actorProfileId);
		const target = await tx.profile.findUnique({
			where: { id: input.targetProfileId },
			select: {
				id: true,
				email: true,
				adminRole: true,
				adminIsActive: true,
			},
		});
		if (!target?.adminRole || !target.email) {
			throw new AdminUserError("not_found", "Admin user not found.");
		}
		if (target.adminIsActive) {
			throw new AdminUserError(
				"bad_state",
				"Cannot resend an invite to an active admin.",
			);
		}

		await tx.adminInvitation.updateMany({
			where: {
				email: target.email,
				status: "pending",
			},
			data: { status: "revoked" },
		});

		await tx.adminInvitation.create({
			data: {
				email: target.email,
				role: target.adminRole,
				invitedById: input.actorProfileId,
				status: "pending",
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_invite_resent",
				entityType: "admin_user",
				entityId: target.id,
			},
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "info",
			title: "Admin invite resent",
			body: `${actorName} resent an invite to ${target.email}.`,
			appScopes: ["admin"],
			targetUrl: `/admins/${target.id}`,
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.actorProfileId,
		});
	});
}

export async function deactivateAdminUser(
	db: PrismaClient,
	input: {
		actorProfileId: string;
		targetProfileId: string;
		foundingSuperAdminId?: string | null;
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		const { target } = await assertTargetMutationAllowed(tx, {
			actorProfileId: input.actorProfileId,
			targetProfileId: input.targetProfileId,
			foundingSuperAdminId: input.foundingSuperAdminId,
			requireTargetActive: true,
		});
		await assertLastActiveSuperAdminGuard(tx, target.id);

		const before = profileSnapshot(target);
		const now = new Date();
		const updated = await tx.profile.update({
			where: { id: target.id },
			data: {
				adminIsActive: false,
				adminDeactivatedAt: now,
				adminDeactivatedById: input.actorProfileId,
			},
			select: {
				id: true,
				email: true,
				adminRole: true,
				adminIsActive: true,
				adminInvitedAt: true,
				adminActivatedAt: true,
				adminDeactivatedAt: true,
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_deactivated",
				entityType: "admin_user",
				entityId: target.id,
				beforeValue: before as object,
				afterValue: profileSnapshot(updated) as object,
			},
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		const targetName = await profileDisplayName(tx, target.id);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "warning",
			title: "Admin deactivated",
			body: `${actorName} deactivated ${targetName}.`,
			appScopes: ["admin"],
			targetUrl: `/admins/${target.id}`,
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.actorProfileId,
		});
	});
}

export async function reactivateAdminUser(
	db: PrismaClient,
	input: {
		actorProfileId: string;
		targetProfileId: string;
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		const { target } = await assertTargetMutationAllowed(tx, {
			actorProfileId: input.actorProfileId,
			targetProfileId: input.targetProfileId,
		});
		if (target.adminIsActive) {
			throw new AdminUserError("bad_state", "Admin user is already active.");
		}
		if (!target.email) {
			throw new AdminUserError("bad_state", "Admin email is missing.");
		}

		const openInvite = await tx.adminInvitation.findFirst({
			where: {
				email: target.email,
				status: "pending",
			},
			select: { id: true },
		});
		if (openInvite) {
			throw new AdminUserError(
				"bad_state",
				"Cannot reactivate while an invitation is still pending.",
			);
		}

		const before = profileSnapshot(target);
		const now = new Date();
		const updated = await tx.profile.update({
			where: { id: target.id },
			data: {
				adminIsActive: true,
				adminActivatedAt: now,
				adminDeactivatedAt: null,
				adminDeactivatedById: null,
			},
			select: {
				id: true,
				email: true,
				adminRole: true,
				adminIsActive: true,
				adminInvitedAt: true,
				adminActivatedAt: true,
				adminDeactivatedAt: true,
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_reactivated",
				entityType: "admin_user",
				entityId: target.id,
				beforeValue: before as object,
				afterValue: profileSnapshot(updated) as object,
			},
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		const targetName = await profileDisplayName(tx, target.id);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "info",
			title: "Admin reactivated",
			body: `${actorName} reactivated ${targetName}.`,
			appScopes: ["admin"],
			targetUrl: `/admins/${target.id}`,
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.actorProfileId,
		});
	});
}

export async function changeAdminRole(
	db: PrismaClient,
	input: {
		actorProfileId: string;
		targetProfileId: string;
		nextRole: AdminRole;
		foundingSuperAdminId?: string | null;
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		const { target } = await assertTargetMutationAllowed(tx, {
			actorProfileId: input.actorProfileId,
			targetProfileId: input.targetProfileId,
			foundingSuperAdminId: input.foundingSuperAdminId,
		});
		if (target.adminRole === input.nextRole) {
			throw new AdminUserError("bad_state", "Admin already has this role.");
		}
		if (target.adminRole === "super_admin" && input.nextRole === "admin") {
			await assertLastActiveSuperAdminGuard(tx, target.id);
		}

		const before = profileSnapshot(target);
		const updated = await tx.profile.update({
			where: { id: target.id },
			data: { adminRole: input.nextRole },
			select: {
				id: true,
				email: true,
				adminRole: true,
				adminIsActive: true,
				adminInvitedAt: true,
				adminActivatedAt: true,
				adminDeactivatedAt: true,
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_role_changed",
				entityType: "admin_user",
				entityId: target.id,
				beforeValue: { adminRole: before.adminRole } as object,
				afterValue: { adminRole: updated.adminRole } as object,
			},
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		const targetName = await profileDisplayName(tx, target.id);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "warning",
			title: "Admin role changed",
			body: `${actorName} changed ${targetName}'s role from ${before.adminRole} to ${updated.adminRole}.`,
			appScopes: ["admin"],
			targetUrl: `/admins/${target.id}`,
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.actorProfileId,
		});
	});
}

/** Deletes Supabase Auth sessions for the user (profile.id === auth.users.id). Revokes refresh tokens via FK cascade. */
export async function deleteAuthSessionsForUser(
	client: DbClient,
	userId: string,
): Promise<void> {
	await client.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${userId}::uuid`;
}

export async function forceSignOutAdminUser(
	db: PrismaClient,
	input: {
		actorProfileId: string;
		targetProfileId: string;
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		const { target } = await assertTargetMutationAllowed(tx, {
			actorProfileId: input.actorProfileId,
			targetProfileId: input.targetProfileId,
			requireTargetActive: true,
		});
		await deleteAuthSessionsForUser(tx, target.id);
		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_force_signed_out",
				entityType: "admin_user",
				entityId: target.id,
			},
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		const targetName = await profileDisplayName(tx, target.id);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "warning",
			title: "Admin force signed out",
			body: `${actorName} force signed out ${targetName}.`,
			appScopes: ["admin"],
			targetUrl: `/admins/${target.id}`,
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.actorProfileId,
		});
	});
}

export async function deleteAdminUser(
	db: PrismaClient,
	input: {
		actorProfileId: string;
		targetProfileId: string;
		foundingSuperAdminId?: string | null;
	},
): Promise<{ auditLogId: string }> {
	return db.$transaction(async (tx) => {
		const { target } = await assertTargetMutationAllowed(tx, {
			actorProfileId: input.actorProfileId,
			targetProfileId: input.targetProfileId,
			foundingSuperAdminId: input.foundingSuperAdminId,
		});
		if (target.id === input.actorProfileId) {
			throw new AdminUserError("forbidden", "You cannot delete your own account.");
		}
		if (target.adminRole !== "admin") {
			throw new AdminUserError(
				"forbidden",
				"Only admin users can be deleted.",
			);
		}

		const before = profileSnapshot(target);
		if (target.email) {
			await tx.adminInvitation.updateMany({
				where: {
					email: target.email,
					status: "pending",
				},
				data: { status: "revoked" },
			});
		}

		const log = await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "admin_deleted" as AdminAction,
				entityType: "admin_user",
				entityId: target.id,
				beforeValue: before as object,
			},
			select: { id: true },
		});

		const actorName = await profileDisplayName(tx, input.actorProfileId);
		const targetName = await profileDisplayName(tx, target.id);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "urgent",
			title: "Admin user deleted",
			body: `${actorName} deleted admin ${targetName}.`,
			appScopes: ["admin"],
			targetUrl: "/admins",
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.actorProfileId,
		});

		return { auditLogId: log.id };
	});
}

export type OwnAdminProfile = {
	id: string;
	name: string;
	email: string;
	adminRole: AdminRole;
};

export async function getOwnAdminProfile(
	db: PrismaClient,
	profileId: string,
): Promise<OwnAdminProfile> {
	const profile = await db.profile.findUnique({
		where: { id: profileId },
		select: {
			id: true,
			name: true,
			email: true,
			adminRole: true,
			adminIsActive: true,
		},
	});
	if (!profile?.adminRole || !profile.adminIsActive || !profile.email) {
		throw new AdminUserError("not_found", "Admin profile not found.");
	}
	return {
		id: profile.id,
		name: profile.name,
		email: profile.email,
		adminRole: profile.adminRole,
	};
}

export async function updateOwnAdminName(
	db: PrismaClient,
	input: { profileId: string; name: string },
): Promise<{ name: string }> {
	const trimmed = input.name.trim();
	if (!trimmed) {
		throw new AdminUserError("bad_input", "Name is required.");
	}

	const existing = await db.profile.findUnique({
		where: { id: input.profileId },
		select: { id: true, adminRole: true, adminIsActive: true },
	});
	if (!existing?.adminRole || !existing.adminIsActive) {
		throw new AdminUserError("not_found", "Admin profile not found.");
	}

	const updated = await db.profile.update({
		where: { id: input.profileId },
		data: { name: trimmed },
		select: { name: true },
	});
	return { name: updated.name };
}

export async function deleteOwnAdminProfile(
	db: PrismaClient,
	input: {
		profileId: string;
		foundingSuperAdminId?: string | null;
	},
): Promise<{ auditLogId: string }> {
	return db.$transaction(async (tx) => {
		const target = await tx.profile.findUnique({
			where: { id: input.profileId },
			select: {
				id: true,
				email: true,
				adminRole: true,
				adminIsActive: true,
				adminInvitedAt: true,
				adminActivatedAt: true,
				adminDeactivatedAt: true,
			},
		});
		if (!target?.adminRole || !target.adminIsActive) {
			throw new AdminUserError("not_found", "Admin profile not found.");
		}
		if (input.foundingSuperAdminId && target.id === input.foundingSuperAdminId) {
			throw new AdminUserError(
				"forbidden",
				"Founding Super Admin cannot delete their account.",
			);
		}
		await assertLastActiveSuperAdminGuard(tx, target.id);

		const before = profileSnapshot(target);
		if (target.email) {
			await tx.adminInvitation.updateMany({
				where: {
					email: target.email,
					status: "pending",
				},
				data: { status: "revoked" },
			});
		}

		const log = await tx.adminActionLog.create({
			data: {
				adminId: input.profileId,
				action: "admin_deleted" as AdminAction,
				entityType: "admin_user",
				entityId: target.id,
				beforeValue: before as object,
				note: "Self-deleted",
			},
			select: { id: true },
		});

		const targetName = await profileDisplayName(tx, target.id);
		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin"],
				excludeProfileIds: [input.profileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: ADMIN_LIFECYCLE_NOTIFICATION_TYPE,
			severity: "urgent",
			title: "Admin account deleted",
			body: `${targetName} deleted their admin account.`,
			appScopes: ["admin"],
			targetUrl: "/admins",
			relatedEntityType: "admin_user",
			relatedEntityId: target.id,
			createdById: input.profileId,
		});

		return { auditLogId: log.id };
	});
}
