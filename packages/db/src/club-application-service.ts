import type {
	ApplicationRejectionReason,
	ApplicationStatus,
	ExpectedPlayerBucket,
	Prisma,
	PrismaClient,
} from "@prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

const SLA_NOTE =
	"Automatic rejection: the 24-hour review window expired without a decision.";

export class ClubApplicationError extends Error {
	constructor(
		public readonly code: "not_found" | "conflict" | "bad_state" | "bad_input",
		message: string,
	) {
		super(message);
		this.name = "ClubApplicationError";
	}
}

export function generateInviteToken(): string {
	const bytes = new Uint8Array(16);
	globalThis.crypto.getRandomValues(bytes);
	return Buffer.from(bytes).toString("base64url");
}

export type ClubApplicationCreatePayload = {
	clubName: string;
	description: string;
	intent: string;
	locationCity: string;
	locationVenue: string;
	venueAddress: string;
	facebookPageUrl?: string | null;
	facebookProfileUrl?: string | null;
	contactNumber?: string | null;
	expectedPlayerCount: ExpectedPlayerBucket;
	additionalNotes?: string | null;
};

async function assertNoPendingApplication(
	db: DbClient,
	playerId: string,
	excludeApplicationId?: string,
) {
	const existing = await db.clubApplication.findFirst({
		where: {
			playerId,
			status: "pending",
			...(excludeApplicationId ? { NOT: { id: excludeApplicationId } } : {}),
		},
		select: { id: true },
	});
	if (existing) {
		throw new ClubApplicationError(
			"conflict",
			"You already have a pending club application.",
		);
	}
}

export async function createClubApplication(
	db: DbClient,
	playerId: string,
	payload: ClubApplicationCreatePayload,
) {
	await assertNoPendingApplication(db, playerId);
	const row = await db.clubApplication.create({
		data: {
			playerId,
			clubName: payload.clubName,
			description: payload.description,
			intent: payload.intent,
			locationCity: payload.locationCity,
			locationVenue: payload.locationVenue,
			venueAddress: payload.venueAddress,
			facebookPageUrl: payload.facebookPageUrl ?? null,
			facebookProfileUrl: payload.facebookProfileUrl ?? null,
			contactNumber: payload.contactNumber ?? null,
			expectedPlayerCount: payload.expectedPlayerCount,
			additionalNotes: payload.additionalNotes ?? null,
			status: "pending",
		},
	});
	await db.notification.create({
		data: {
			recipientId: playerId,
			type: "club_application_submitted",
			title: "Application received",
			body: `We received your application for “${payload.clubName}”. An admin will review it soon.`,
			relatedEntityType: "club_application",
			relatedEntityId: row.id,
		},
	});
	return row;
}

export async function updatePendingClubApplication(
	db: DbClient,
	applicationId: string,
	playerId: string,
	payload: ClubApplicationCreatePayload,
) {
	const app = await db.clubApplication.findFirst({
		where: { id: applicationId, playerId },
	});
	if (!app) {
		throw new ClubApplicationError("not_found", "Application not found.");
	}
	if (app.status !== "pending") {
		throw new ClubApplicationError(
			"bad_state",
			"Only pending applications can be edited.",
		);
	}
	await assertNoPendingApplication(db, playerId, applicationId);
	return db.clubApplication.update({
		where: { id: applicationId },
		data: {
			clubName: payload.clubName,
			description: payload.description,
			intent: payload.intent,
			locationCity: payload.locationCity,
			locationVenue: payload.locationVenue,
			venueAddress: payload.venueAddress,
			facebookPageUrl: payload.facebookPageUrl ?? null,
			facebookProfileUrl: payload.facebookProfileUrl ?? null,
			contactNumber: payload.contactNumber ?? null,
			expectedPlayerCount: payload.expectedPlayerCount,
			additionalNotes: payload.additionalNotes ?? null,
		},
	});
}

export async function cancelClubApplication(
	db: DbClient,
	applicationId: string,
	playerId: string,
) {
	const app = await db.clubApplication.findFirst({
		where: { id: applicationId, playerId },
	});
	if (!app) {
		throw new ClubApplicationError("not_found", "Application not found.");
	}
	if (app.status !== "pending") {
		throw new ClubApplicationError(
			"bad_state",
			"Only pending applications can be cancelled.",
		);
	}
	return db.clubApplication.update({
		where: { id: applicationId },
		data: { status: "cancelled" },
	});
}

export async function approveClubApplication(
	db: PrismaClient,
	params: { applicationId: string; adminProfileId: string },
) {
	const { applicationId, adminProfileId } = params;
	return db.$transaction(async (tx) => {
		const app = await tx.clubApplication.findUnique({
			where: { id: applicationId },
		});
		if (!app) {
			throw new ClubApplicationError("not_found", "Application not found.");
		}
		if (app.status !== "pending" && app.status !== "in_review") {
			throw new ClubApplicationError(
				"bad_state",
				"Application is not awaiting review.",
			);
		}

		const before = applicationSnapshot(app);
		const token = generateInviteToken();
		const now = new Date();

		const club = await tx.club.create({
			data: {
				ownerId: app.playerId,
				name: app.clubName,
				description: app.description,
				locationCity: app.locationCity,
				locationVenue: app.locationVenue,
				status: "active",
				autoApprove: true,
				inviteLinkEnabled: true,
				inviteToken: token,
				inviteTokenCreatedAt: now,
			},
		});

		const updated = await tx.clubApplication.update({
			where: { id: applicationId },
			data: {
				status: "approved",
				reviewedById: adminProfileId,
				reviewedAt: now,
				resultingClubId: club.id,
			},
		});

		await tx.notification.create({
			data: {
				recipientId: app.playerId,
				type: "club_application_approved",
				title: "Club approved",
				body: `Your club “${app.clubName}” was approved. You are now the owner.`,
				relatedEntityType: "club",
				relatedEntityId: club.id,
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: adminProfileId,
				action: "application_approved",
				entityType: "club_application",
				entityId: applicationId,
				beforeValue: before as object,
				afterValue: {
					application: applicationSnapshot(updated),
					clubId: club.id,
				} as object,
			},
		});

		return { clubId: club.id, application: updated };
	});
}

export async function rejectClubApplication(
	db: PrismaClient,
	params: {
		applicationId: string;
		adminProfileId: string;
		reason: ApplicationRejectionReason;
		reviewNote?: string | null;
	},
) {
	const { applicationId, adminProfileId, reason, reviewNote } = params;
	return db.$transaction(async (tx) => {
		const app = await tx.clubApplication.findUnique({
			where: { id: applicationId },
		});
		if (!app) {
			throw new ClubApplicationError("not_found", "Application not found.");
		}
		if (app.status !== "pending" && app.status !== "in_review") {
			throw new ClubApplicationError(
				"bad_state",
				"Application is not awaiting review.",
			);
		}

		const before = applicationSnapshot(app);
		const now = new Date();
		const updated = await tx.clubApplication.update({
			where: { id: applicationId },
			data: {
				status: "rejected",
				rejectionReason: reason,
				reviewNote: reviewNote ?? null,
				reviewedById: adminProfileId,
				reviewedAt: now,
			},
		});

		await tx.notification.create({
			data: {
				recipientId: app.playerId,
				type: "club_application_rejected",
				title: "Club application update",
				body: `Your application for “${app.clubName}” was not approved.`,
				relatedEntityType: "club_application",
				relatedEntityId: app.id,
			},
		});

		await tx.adminActionLog.create({
			data: {
				adminId: adminProfileId,
				action: "application_rejected",
				entityType: "club_application",
				entityId: applicationId,
				beforeValue: before as object,
				afterValue: applicationSnapshot(updated) as object,
				...(reviewNote != null && reviewNote !== ""
					? { note: reviewNote }
					: {}),
			},
		});

		return updated;
	});
}

export async function bulkRejectClubApplications(
	db: PrismaClient,
	params: {
		applicationIds: string[];
		adminProfileId: string;
		reason: ApplicationRejectionReason;
		reviewNote?: string | null;
	},
) {
	const results: { id: string; ok: boolean; error?: string }[] = [];
	for (const id of params.applicationIds) {
		try {
			await rejectClubApplication(db, {
				applicationId: id,
				adminProfileId: params.adminProfileId,
				reason: params.reason,
				...(params.reviewNote != null ? { reviewNote: params.reviewNote } : {}),
			});
			results.push({ id, ok: true });
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Unknown error";
			results.push({ id, ok: false, error: msg });
		}
	}
	return results;
}

function applicationSnapshot(app: {
	id: string;
	status: ApplicationStatus;
	clubName: string;
	playerId: string;
	reviewedById: string | null;
	reviewedAt: Date | null;
	resultingClubId: string | null;
	rejectionReason: ApplicationRejectionReason | null;
}) {
	return {
		id: app.id,
		status: app.status,
		clubName: app.clubName,
		playerId: app.playerId,
		reviewedById: app.reviewedById,
		reviewedAt: app.reviewedAt,
		resultingClubId: app.resultingClubId,
		rejectionReason: app.rejectionReason,
	};
}

export async function expireStalePendingClubApplications(
	db: PrismaClient,
	systemActor: string,
) {
	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const stale = await db.clubApplication.findMany({
		where: {
			status: "pending",
			updatedAt: { lt: cutoff },
		},
		select: { id: true, playerId: true, clubName: true },
	});

	if (stale.length === 0) {
		return { count: 0, ids: [] as string[] };
	}

	for (const row of stale) {
		await db.$transaction(async (tx) => {
			const app = await tx.clubApplication.findUnique({
				where: { id: row.id },
			});
			if (!app || app.status !== "pending") return;

			const before = applicationSnapshot(app);
			const now = new Date();
			const updated = await tx.clubApplication.update({
				where: { id: row.id },
				data: {
					status: "rejected",
					rejectionReason: "other",
					reviewNote: SLA_NOTE,
					reviewedById: systemActor,
					reviewedAt: now,
				},
			});

			await tx.notification.create({
				data: {
					recipientId: app.playerId,
					type: "club_application_rejected",
					title: "Club application update",
					body: `Your application for “${app.clubName}” timed out after 24 hours without a decision and was closed. You may submit again.`,
					relatedEntityType: "club_application",
					relatedEntityId: app.id,
				},
			});

			await tx.adminActionLog.create({
				data: {
					adminId: systemActor,
					action: "application_rejected",
					entityType: "club_application",
					entityId: app.id,
					beforeValue: before as object,
					afterValue: applicationSnapshot(updated) as object,
					note: "SLA auto-reject",
				},
			});
		});
	}

	return { count: stale.length, ids: stale.map((row) => row.id) };
}
