import type { PrismaClient } from "@prisma/client";

export class PlayerProfileError extends Error {
	constructor(
		public readonly code: "not_found" | "forbidden" | "bad_input" | "bad_state",
		message: string,
	) {
		super(message);
		this.name = "PlayerProfileError";
	}
}

export type OwnPlayerProfile = {
	id: string;
	name: string;
	email: string | null;
	isTesterAccount: boolean;
};

export async function getOwnPlayerProfile(
	db: PrismaClient,
	profileId: string,
): Promise<OwnPlayerProfile> {
	const profile = await db.profile.findUnique({
		where: { id: profileId },
		select: {
			id: true,
			name: true,
			email: true,
			isTesterAccount: true,
		},
	});
	if (!profile) {
		throw new PlayerProfileError("not_found", "Profile not found.");
	}
	return profile;
}

export async function updateOwnPlayerName(
	db: PrismaClient,
	input: { profileId: string; name: string },
): Promise<{ name: string }> {
	const trimmed = input.name.trim();
	if (!trimmed) {
		throw new PlayerProfileError("bad_input", "Name is required.");
	}

	const existing = await db.profile.findUnique({
		where: { id: input.profileId },
		select: { id: true },
	});
	if (!existing) {
		throw new PlayerProfileError("not_found", "Profile not found.");
	}

	const updated = await db.profile.update({
		where: { id: input.profileId },
		data: { name: trimmed },
		select: { name: true },
	});
	return { name: updated.name };
}

export async function deleteOwnPlayerProfile(
	db: PrismaClient,
	input: { profileId: string },
): Promise<void> {
	const profile = await db.profile.findUnique({
		where: { id: input.profileId },
		select: {
			id: true,
			adminRole: true,
			adminIsActive: true,
		},
	});
	if (!profile) {
		throw new PlayerProfileError("not_found", "Profile not found.");
	}
	if (profile.adminRole && profile.adminIsActive) {
		throw new PlayerProfileError(
			"forbidden",
			"Active admin accounts cannot be deleted from the player app. Use the admin app instead.",
		);
	}

	try {
		await db.profile.delete({ where: { id: input.profileId } });
	} catch {
		throw new PlayerProfileError(
			"bad_state",
			"Unable to delete account because it is still linked to active clubs or sessions. Contact support.",
		);
	}
}
