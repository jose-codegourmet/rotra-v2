import type { AdminRole } from "@prisma/client";
import { db, Prisma } from "@rotra/db";
import type { User } from "@supabase/supabase-js";

import {
	avatarUrlFromAuthUser,
	displayNameFromAuthUser,
	facebookIdFromAuthUser,
} from "@/lib/auth/supabase-user-display";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfileTag = {
	id: string;
	slug: string;
	label: string;
	assignedAt: Date;
};

export type ClientRole = "user" | "tester" | AdminRole;

export type CurrentProfile = {
	id: string;
	name: string;
	avatarUrl: string | null;
	phone: string | null;
	onboardingCompleted: boolean;
	isTesterAccount: boolean;
	createdAt: Date;
	adminRole: AdminRole | null;
	adminIsActive: boolean;
	roles: ClientRole[];
	tags: CurrentProfileTag[];
};

/** Subset passed to the client shell (sidebar / drawer) for display name and avatar. */
export type CurrentProfileDisplay = Pick<CurrentProfile, "name" | "avatarUrl">;

const profileSelect = {
	id: true,
	name: true,
	avatarUrl: true,
	phone: true,
	onboardingCompleted: true,
	isTesterAccount: true,
	createdAt: true,
	adminRole: true,
	adminIsActive: true,
	tagsAssigned: {
		orderBy: { assignedAt: "desc" as const },
		select: {
			id: true,
			slug: true,
			label: true,
			assignedAt: true,
		},
	},
} as const;

type ProfileSelectRow = {
	id: string;
	name: string;
	avatarUrl: string | null;
	phone: string | null;
	onboardingCompleted: boolean;
	isTesterAccount: boolean;
	createdAt: Date;
	adminRole: AdminRole | null;
	adminIsActive: boolean;
	tagsAssigned: CurrentProfileTag[];
};

function mapProfileRowToCurrent(row: ProfileSelectRow): CurrentProfile {
	const { tagsAssigned, ...rest } = row;
	const roles: ClientRole[] = ["user"];
	if (row.isTesterAccount) roles.push("tester");
	if (row.adminRole) roles.push(row.adminRole);
	return {
		...rest,
		roles,
		tags: tagsAssigned,
	};
}

/**
 * Create a `profiles` row for a Supabase user when the DB trigger did not run.
 * Email/password users intentionally have no Facebook identity.
 */
export async function ensureProfileRow(user: User): Promise<CurrentProfile> {
	const existing = await db.profile.findUnique({
		where: { id: user.id },
		select: profileSelect,
	});
	if (existing) return mapProfileRowToCurrent(existing);

	const facebookId = facebookIdFromAuthUser(user);

	const name = displayNameFromAuthUser({ user });
	const avatarUrl = avatarUrlFromAuthUser(user);

	try {
		await db.profile.create({
			data: {
				id: user.id,
				facebookId,
				name,
				avatarUrl,
				email: user.email ?? null,
			},
		});
	} catch (e) {
		if (
			e instanceof Prisma.PrismaClientKnownRequestError &&
			e.code === "P2002"
		) {
			const byId = await db.profile.findUnique({
				where: { id: user.id },
				select: profileSelect,
			});
			if (byId) return mapProfileRowToCurrent(byId);
			if (facebookId) {
				const byFb = await db.profile.findUnique({
					where: { facebookId },
					select: profileSelect,
				});
				if (byFb) return mapProfileRowToCurrent(byFb);
			}
		}
		throw e;
	}

	const row = await db.profile.findUnique({
		where: { id: user.id },
		select: profileSelect,
	});
	if (!row) {
		throw new Error("Profile insert succeeded but row was not found.");
	}
	return mapProfileRowToCurrent(row);
}

/**
 * Resolves the signed-in player profile for server layouts and API routes.
 * Returns null when auth is not wired (no redirects) or when there is no session.
 *
 * Optional dev override: set `ROTRA_DEV_PROFILE_ID` to a profiles.id UUID to
 * load that row from the database (requires DATABASE_URL).
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
	const devId = process.env.ROTRA_DEV_PROFILE_ID?.trim();
	if (devId) {
		const p = await db.profile.findUnique({
			where: { id: devId },
			select: profileSelect,
		});
		return p ? mapProfileRowToCurrent(p) : null;
	}

	let supabase: Awaited<ReturnType<typeof createClient>>;
	try {
		supabase = await createClient();
	} catch {
		return null;
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	const existing = await db.profile.findUnique({
		where: { id: user.id },
		select: profileSelect,
	});
	if (existing) return mapProfileRowToCurrent(existing);

	try {
		return await ensureProfileRow(user);
	} catch (err) {
		console.error("[getCurrentProfile] ensureProfileRow:", err);
		return null;
	}
}
