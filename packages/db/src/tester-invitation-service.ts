import { randomBytes } from "node:crypto";

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
import { addProfileTag } from "./profile-tag-service";
import type { TesterDirectoryStatus } from "./shared-types";

export type { TesterDirectoryStatus };

const DEFAULT_INVITE_EXPIRY_DAYS = 7;
const DEFAULT_TAG_SLUGS = ["tester-login-as-guest"] as const;

const ADMIN_BROADCAST_NOTIFICATION_TYPE =
	"platform_announcement" as NotificationType;
const TESTER_INVITE_NOTIFICATION_TYPE =
	"tester_invite_sent" as AdminNotificationType;

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TesterDirectoryRow = {
	id: string;
	name: string;
	email: string | null;
	status: TesterDirectoryStatus;
	invitedAt: Date;
	invitedByName: string | null;
	latestInvitationId: string | null;
};

export type TesterInvitationDto = {
	id: string;
	status: InvitationStatus;
	expiresAt: Date;
	revokedAt: Date | null;
	createdAt: Date;
	invitedByName: string | null;
};

export type TesterProfileDetail = {
	id: string;
	name: string;
	email: string | null;
	isTesterAccount: boolean;
	tags: { id: string; slug: string; label: string; assignedAt: Date }[];
	invitations: TesterInvitationDto[];
};

export class TesterInvitationError extends Error {
	constructor(
		public readonly code:
			| "not_found"
			| "conflict"
			| "forbidden"
			| "bad_input"
			| "bad_state",
		message: string,
	) {
		super(message);
		this.name = "TesterInvitationError";
	}
}

export type TesterAuthAdmin = {
	inviteUserByEmail: (
		email: string,
		options: {
			data: Record<string, unknown>;
			redirectTo: string;
		},
	) => Promise<{ userId: string }>;
	deleteUser: (userId: string) => Promise<void>;
};

const PASSWORD_CHARSET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateTesterPassword(): string {
	const bytes = randomBytes(12);
	let password = "";
	for (let i = 0; i < 12; i++) {
		password += PASSWORD_CHARSET[bytes[i]! % PASSWORD_CHARSET.length]!;
	}
	return password;
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function deriveTesterStatus(
	invitation: {
		status: InvitationStatus;
		expiresAt: Date;
	} | null,
): TesterDirectoryStatus {
	if (!invitation) return "pending";
	if (invitation.status === "revoked") return "revoked";
	if (invitation.status === "accepted") return "active";
	if (invitation.status === "expired") return "expired";
	if (
		invitation.status === "pending" &&
		invitation.expiresAt.getTime() < Date.now()
	) {
		return "expired";
	}
	return "pending";
}

async function loadActorAdminRole(
	tx: DbClient,
	actorProfileId: string,
): Promise<AdminRole | null> {
	const actor = await tx.profile.findUnique({
		where: { id: actorProfileId },
		select: { adminRole: true },
	});
	return actor?.adminRole ?? null;
}

async function assertEmailAvailableForTesterInvite(
	tx: DbClient,
	email: string,
): Promise<void> {
	const existing = await tx.profile.findFirst({
		where: { email },
		select: {
			id: true,
			adminRole: true,
			facebookId: true,
			isTesterAccount: true,
		},
	});

	if (!existing) return;

	if (existing.adminRole != null) {
		throw new TesterInvitationError(
			"conflict",
			"An admin account already exists for this email.",
		);
	}

	if (
		existing.facebookId != null &&
		!existing.isTesterAccount
	) {
		throw new TesterInvitationError(
			"conflict",
			"Email already registered as a player.",
		);
	}

	if (existing.isTesterAccount) {
		const pendingInvite = await tx.testerInvitation.findFirst({
			where: {
				profileId: existing.id,
				status: "pending",
				expiresAt: { gt: new Date() },
			},
			select: { id: true },
		});
		if (pendingInvite) {
			throw new TesterInvitationError(
				"conflict",
				"This tester already has a pending invitation.",
			);
		}
	}
}

export async function createTesterProfile(
	db: PrismaClient,
	authAdmin: TesterAuthAdmin,
	input: {
		actorProfileId: string;
		email: string;
		name: string;
		clientAppOrigin: string;
		inviteExpiresInDays?: number;
		tagSlugsToAssign?: string[];
	},
): Promise<{ profileId: string; invitationId: string }> {
	const email = normalizeEmail(input.email);
	const name = input.name.trim();
	if (!email) {
		throw new TesterInvitationError("bad_input", "Email is required.");
	}
	if (!name) {
		throw new TesterInvitationError("bad_input", "Name is required.");
	}

	const expiryDays = input.inviteExpiresInDays ?? DEFAULT_INVITE_EXPIRY_DAYS;
	const tagSlugs = input.tagSlugsToAssign ?? [...DEFAULT_TAG_SLUGS];
	const redirectTo = `${input.clientAppOrigin.replace(/\/$/, "")}/login-tester`;

	await assertEmailAvailableForTesterInvite(db, email);

	const testerPassword = generateTesterPassword();
	const { userId } = await authAdmin.inviteUserByEmail(email, {
		data: {
			name,
			tester_password: testerPassword,
			is_tester: true,
		},
		redirectTo,
	});

	return db.$transaction(async (tx) => {
		const expiresAt = addDays(new Date(), expiryDays);
		const callerRole = await loadActorAdminRole(tx, input.actorProfileId);

		await tx.profile.upsert({
			where: { id: userId },
			create: {
				id: userId,
				facebookId: null,
				name,
				email,
				isTesterAccount: true,
				emailVerified: false,
			},
			update: {
				name,
				email,
				isTesterAccount: true,
			},
		});

		const invitation = await tx.testerInvitation.create({
			data: {
				profileId: userId,
				invitedById: input.actorProfileId,
				status: "pending",
				expiresAt,
			},
			select: { id: true },
		});

		for (const slug of tagSlugs) {
			await addProfileTag(tx, {
				profileId: userId,
				slug,
				assignedBy: input.actorProfileId,
				callerRole,
			});
		}

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "tester_invited" as AdminAction,
				entityType: "tester_invitation",
				entityId: invitation.id,
				afterValue: { email, name } as object,
			},
		});

		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin", "admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: TESTER_INVITE_NOTIFICATION_TYPE,
			severity: "info",
			title: "Tester invited",
			body: `A tester invite was sent to ${email}.`,
			appScopes: ["admin"],
			targetUrl: `/testers/${userId}`,
			relatedEntityType: "tester_invitation",
			relatedEntityId: userId,
			createdById: input.actorProfileId,
		});

		return {
			profileId: userId,
			invitationId: invitation.id,
		};
	});
}

export type ListTesterProfilesInput = {
	page: number;
	limit: number;
	status?: TesterDirectoryStatus;
};

export type ListTesterProfilesResult = {
	rows: TesterDirectoryRow[];
	page: number;
	pageSize: number;
	total: number;
	hasMore: boolean;
};

const MAX_PAGE_SIZE = 50;

export async function listTesterProfiles(
	db: PrismaClient,
	input: ListTesterProfilesInput,
): Promise<ListTesterProfilesResult> {
	const page = Number.isFinite(input.page) && input.page >= 1 ? input.page : 1;
	const pageSize = Math.min(
		Number.isFinite(input.limit) && input.limit >= 1 ? input.limit : 25,
		MAX_PAGE_SIZE,
	);
	const skip = (page - 1) * pageSize;

	const profiles = await db.profile.findMany({
		where: {
			isTesterAccount: true,
			adminRole: null,
		},
		select: {
			id: true,
			name: true,
			email: true,
			testerInvitationsReceived: {
				orderBy: { createdAt: "desc" },
				take: 1,
				select: {
					id: true,
					status: true,
					expiresAt: true,
					createdAt: true,
					invitedBy: { select: { name: true } },
				},
			},
		},
		orderBy: [{ name: "asc" }, { id: "asc" }],
	});

	const rowsWithStatus = profiles.map((p) => {
		const latest = p.testerInvitationsReceived[0] ?? null;
		const status = deriveTesterStatus(
			latest
				? { status: latest.status, expiresAt: latest.expiresAt }
				: null,
		);
		return {
			id: p.id,
			name: p.name,
			email: p.email,
			status,
			invitedAt: latest?.createdAt ?? new Date(0),
			invitedByName: latest?.invitedBy?.name ?? null,
			latestInvitationId: latest?.id ?? null,
		};
	});

	const filtered = input.status
		? rowsWithStatus.filter((r) => r.status === input.status)
		: rowsWithStatus;

	const total = filtered.length;
	const pageRows = filtered.slice(skip, skip + pageSize);

	return {
		rows: pageRows,
		page,
		pageSize,
		total,
		hasMore: skip + pageRows.length < total,
	};
}

export async function getTesterProfileDetail(
	db: PrismaClient,
	profileId: string,
): Promise<TesterProfileDetail> {
	const profile = await db.profile.findFirst({
		where: {
			id: profileId,
			isTesterAccount: true,
			adminRole: null,
		},
		select: {
			id: true,
			name: true,
			email: true,
			isTesterAccount: true,
			tagsAssigned: {
				select: {
					id: true,
					slug: true,
					label: true,
					assignedAt: true,
				},
				orderBy: { assignedAt: "desc" },
			},
			testerInvitationsReceived: {
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					status: true,
					expiresAt: true,
					revokedAt: true,
					createdAt: true,
					invitedBy: { select: { name: true } },
				},
			},
		},
	});

	if (!profile) {
		throw new TesterInvitationError("not_found", "Tester profile not found.");
	}

	return {
		id: profile.id,
		name: profile.name,
		email: profile.email,
		isTesterAccount: profile.isTesterAccount,
		tags: profile.tagsAssigned,
		invitations: profile.testerInvitationsReceived.map((inv) => ({
			id: inv.id,
			status: inv.status,
			expiresAt: inv.expiresAt,
			revokedAt: inv.revokedAt,
			createdAt: inv.createdAt,
			invitedByName: inv.invitedBy?.name ?? null,
		})),
	};
}

export async function resendTesterInvite(
	db: PrismaClient,
	authAdmin: TesterAuthAdmin,
	input: {
		actorProfileId: string;
		profileId: string;
		clientAppOrigin: string;
		inviteExpiresInDays?: number;
	},
): Promise<{ invitationId: string }> {
	const profile = await db.profile.findFirst({
		where: {
			id: input.profileId,
			isTesterAccount: true,
			adminRole: null,
		},
		select: { id: true, name: true, email: true },
	});
	if (!profile?.email) {
		throw new TesterInvitationError("not_found", "Tester profile not found.");
	}

	const email = normalizeEmail(profile.email);
	const name = profile.name.trim();
	const expiryDays = input.inviteExpiresInDays ?? DEFAULT_INVITE_EXPIRY_DAYS;
	const redirectTo = `${input.clientAppOrigin.replace(/\/$/, "")}/login-tester`;

	await db.$transaction(async (tx) => {
		await tx.testerInvitation.updateMany({
			where: {
				profileId: profile.id,
				status: "pending",
			},
			data: {
				status: "revoked",
				revokedAt: new Date(),
			},
		});
	});

	const testerPassword = generateTesterPassword();
	await authAdmin.inviteUserByEmail(email, {
		data: {
			name,
			tester_password: testerPassword,
			is_tester: true,
		},
		redirectTo,
	});

	return db.$transaction(async (tx) => {
		const expiresAt = addDays(new Date(), expiryDays);
		const invitation = await tx.testerInvitation.create({
			data: {
				profileId: profile.id,
				invitedById: input.actorProfileId,
				status: "pending",
				expiresAt,
			},
			select: { id: true },
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "tester_invite_resent" as AdminAction,
				entityType: "tester_invitation",
				entityId: invitation.id,
				afterValue: { email } as object,
			},
		});

		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin", "admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: TESTER_INVITE_NOTIFICATION_TYPE,
			severity: "info",
			title: "Tester invite resent",
			body: `A tester invite was resent to ${email}.`,
			appScopes: ["admin"],
			targetUrl: `/testers/${profile.id}`,
			relatedEntityType: "tester_invitation",
			relatedEntityId: profile.id,
			createdById: input.actorProfileId,
		});

		return { invitationId: invitation.id };
	});
}

export async function revokeTesterInvitation(
	db: PrismaClient,
	authAdmin: TesterAuthAdmin,
	input: {
		actorProfileId: string;
		profileId: string;
	},
): Promise<void> {
	const profile = await db.profile.findFirst({
		where: {
			id: input.profileId,
			isTesterAccount: true,
			adminRole: null,
		},
		select: { id: true, email: true, facebookId: true },
	});

	if (!profile) {
		throw new TesterInvitationError("not_found", "Tester profile not found.");
	}

	const pending = await db.testerInvitation.findFirst({
		where: {
			profileId: profile.id,
			status: "pending",
		},
		orderBy: { createdAt: "desc" },
		select: { id: true },
	});

	if (!pending) {
		throw new TesterInvitationError(
			"bad_state",
			"No pending tester invitation to revoke.",
		);
	}

	await db.$transaction(async (tx) => {
		await tx.testerInvitation.update({
			where: { id: pending.id },
			data: {
				status: "revoked",
				revokedAt: new Date(),
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: input.actorProfileId,
				action: "tester_invite_revoked" as AdminAction,
				entityType: "tester_invitation",
				entityId: pending.id,
				afterValue: { email: profile.email } as object,
			},
		});

		await broadcastNotificationInTx(tx, {
			audience: {
				adminRoles: ["super_admin", "admin"],
				excludeProfileIds: [input.actorProfileId],
			},
			notificationType: ADMIN_BROADCAST_NOTIFICATION_TYPE,
			adminNotificationType: TESTER_INVITE_NOTIFICATION_TYPE,
			severity: "warning",
			title: "Tester invite revoked",
			body: `Tester invite for ${profile.email ?? profile.id} was revoked.`,
			appScopes: ["admin"],
			targetUrl: `/testers/${profile.id}`,
			relatedEntityType: "tester_invitation",
			relatedEntityId: profile.id,
			createdById: input.actorProfileId,
		});
	});

	if (profile.facebookId == null) {
		await authAdmin.deleteUser(profile.id);
	}
}

export async function markTesterInvitationAccepted(
	db: PrismaClient,
	profileId: string,
): Promise<void> {
	const pending = await db.testerInvitation.findFirst({
		where: {
			profileId,
			status: "pending",
			expiresAt: { gt: new Date() },
		},
		orderBy: { createdAt: "desc" },
		select: { id: true },
	});
	if (!pending) return;

	await db.testerInvitation.update({
		where: { id: pending.id },
		data: { status: "accepted" },
	});
}

export async function validateTesterSession(
	db: PrismaClient,
	input: { profileId: string },
): Promise<boolean> {
	const profile = await db.profile.findFirst({
		where: {
			id: input.profileId,
			isTesterAccount: true,
		},
		select: { id: true },
	});
	if (!profile) return false;

	const tag = await db.profileTag.findFirst({
		where: {
			profileId: input.profileId,
			slug: "tester-login-as-guest",
		},
		select: { id: true },
	});
	return Boolean(tag);
}
