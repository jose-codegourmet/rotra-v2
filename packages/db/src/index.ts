import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

/**
 * Supabase transaction pooler (PgBouncer / port 6543) does not support Prisma's
 * default prepared statements; without `pgbouncer=true` Postgres can return
 * 08P01 "bind message supplies N parameters, but prepared statement s1 requires M".
 *
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
 */
function prismaDatasourceUrl(raw: string | undefined): string | undefined {
	if (!raw) return raw;
	if (raw.includes("pgbouncer=true")) return raw;

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return raw;
	}

	const host = url.hostname.toLowerCase();
	const port = url.port;
	const looksLikeTxPooler =
		port === "6543" || host.includes("pooler.supabase.com");

	if (!looksLikeTxPooler) return raw;

	url.searchParams.set("pgbouncer", "true");
	return url.toString();
}

const databaseUrl = prismaDatasourceUrl(process.env.DATABASE_URL);

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({
		...(databaseUrl
			? {
					datasources: {
						db: {
							url: databaseUrl,
						},
					},
				}
			: {}),
		log:
			process.env.NODE_ENV === "development"
				? ["query", "error", "warn"]
				: ["error"],
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = db;
}

export type {
	ApplicationRejectionReason,
	PrismaClient,
} from "@prisma/client";
export { Prisma } from "@prisma/client";
export {
	approveClubApplication,
	bulkRejectClubApplications,
	type ClubApplicationCreatePayload,
	ClubApplicationError,
	cancelClubApplication,
	createClubApplication,
	expireStalePendingClubApplications,
	generateInviteToken,
	rejectClubApplication,
	updatePendingClubApplication,
} from "./club-application-service";
export {
	activateAdminIfNeeded,
	changeAdminRole,
	deleteAdminUser,
	deleteOwnAdminProfile,
	deactivateAdminUser,
	deleteAuthSessionsForUser,
	forceSignOutAdminUser,
	getAdminUserDetail,
	getOwnAdminProfile,
	inviteAdminUser,
	listAdminUsers,
	reactivateAdminUser,
	resendAdminInvite,
	updateOwnAdminName,
	AdminUserError,
	type AdminDirectoryStatus,
	type AdminDirectoryUser,
	type AdminUserDetail,
	type OwnAdminProfile,
} from "./admin-user-service";
export {
	CustomerProfileError,
	getCustomerProfileDetail,
	listCustomerProfiles,
	updateCustomerIdentity,
	updateCustomerSkills,
	type CustomerDirectoryRow,
	type CustomerProfileDetail,
	type ListCustomerProfilesInput,
	type ListCustomerProfilesResult,
} from "./customer-profile-service";
export {
	addProfileTag,
	removeProfileTag,
	ProfileTagError,
	slugifyTag,
	type ProfileTagDto,
} from "./profile-tag-service";
export {
	createTagDefinition,
	getTagDefinitionById,
	getTagDefinitionBySlug,
	listTagDefinitions,
	updateTagDefinition,
	RESERVED_TAG_SLUGS,
	TagDefinitionError,
	slugifyTagDefinitionSlug,
	type TagDefinitionDto,
} from "./tag-definition-service";
export {
	createTesterProfile,
	getTesterProfileDetail,
	listTesterProfiles,
	resendTesterInvite,
	revokeTesterInvitation,
	markTesterInvitationAccepted,
	validateTesterSession,
	TesterInvitationError,
	type TesterAuthAdmin,
	type TesterDirectoryRow,
	type TesterDirectoryStatus,
	type TesterProfileDetail,
	type ListTesterProfilesInput,
	type ListTesterProfilesResult,
} from "./tester-invitation-service";
export type { TagAssignableBy } from "@prisma/client";
export {
	broadcastNotification,
	broadcastNotificationByTags,
	broadcastNotificationInTx,
	BroadcastNotificationError,
	type BroadcastAppScope,
	type BroadcastAudience,
	type BroadcastNotificationInput,
	type BroadcastNotificationResult,
	type BroadcastSeverity,
} from "./notification-broadcast-service";
export {
	AdminNotificationError,
	listAdminNotificationsForInbox,
	markAdminNotificationRead,
	markAllAdminNotificationsRead,
	type AdminNotificationInboxRow,
	type ListAdminNotificationsForInboxInput,
	type ListAdminNotificationsForInboxResult,
} from "./admin-notification-service";
export {
	listNotificationsForInbox,
	markAllNotificationsRead,
	NotificationError,
	type ListNotificationsForInboxInput,
	type ListNotificationsForInboxResult,
	type NotificationInboxRow,
} from "./notification-service";
export {
	deleteOwnPlayerProfile,
	getOwnPlayerProfile,
	PlayerProfileError,
	updateOwnPlayerName,
	type OwnPlayerProfile,
} from "./player-profile-service";
export type { Database, Json } from "./supabase-database.types";
