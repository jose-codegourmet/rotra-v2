import { Prisma, type AdminRole, type PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

import { slugifyTag as slugifyTagCore } from "./slugify";
import { getTagDefinitionBySlug } from "./tag-definition-service";

export class ProfileTagError extends Error {
	constructor(
		public readonly code:
			| "not_found"
			| "conflict"
			| "invalid_label"
			| "forbidden",
		message: string,
	) {
		super(message);
		this.name = "ProfileTagError";
	}
}

export type ProfileTagDto = {
	id: string;
	slug: string;
	label: string;
	assignedAt: Date;
};

/**
 * Derives a stable slug from a display label: trim, lowercase, spaces → hyphens.
 * Example: "beta tester - scheduling" → "beta-tester---scheduling"
 */
export function slugifyTag(label: string): string {
	try {
		return slugifyTagCore(label);
	} catch {
		throw new ProfileTagError("invalid_label", "Tag label cannot be empty.");
	}
}

async function resolveTagFromCatalog(
	db: DbClient,
	input: { slug?: string; label?: string },
): Promise<{ slug: string; label: string; assignableBy: "any_admin" | "super_admin_only" }> {
	let slug: string;
	if (input.slug?.trim()) {
		slug = input.slug.trim().toLowerCase();
	} else if (input.label?.trim()) {
		slug = slugifyTag(input.label);
	} else {
		throw new ProfileTagError(
			"invalid_label",
			"Either slug or label is required.",
		);
	}

	const definition = await getTagDefinitionBySlug(db, slug);
	if (!definition || !definition.isActive) {
		throw new ProfileTagError(
			"not_found",
			"Tag is not in the active catalog.",
		);
	}

	return {
		slug: definition.slug,
		label: definition.label,
		assignableBy: definition.assignableBy,
	};
}

export async function addProfileTag(
	db: DbClient,
	input: {
		profileId: string;
		label?: string;
		slug?: string;
		assignedBy: string | null;
		callerRole?: AdminRole | null;
	},
): Promise<ProfileTagDto> {
	const catalogInput: { slug?: string; label?: string } = {};
	if (input.slug !== undefined) catalogInput.slug = input.slug;
	if (input.label !== undefined) catalogInput.label = input.label;
	const { slug, label, assignableBy } = await resolveTagFromCatalog(
		db,
		catalogInput,
	);

	if (
		assignableBy === "super_admin_only" &&
		input.callerRole !== "super_admin"
	) {
		throw new ProfileTagError(
			"forbidden",
			"Only Super Admins may assign this tag.",
		);
	}

	const profile = await db.profile.findUnique({
		where: { id: input.profileId },
		select: { id: true, adminRole: true },
	});
	if (!profile || profile.adminRole != null) {
		throw new ProfileTagError("not_found", "Customer profile not found.");
	}

	try {
		const row = await db.profileTag.create({
			data: {
				profileId: input.profileId,
				slug,
				label,
				assignedBy: input.assignedBy,
			},
			select: {
				id: true,
				slug: true,
				label: true,
				assignedAt: true,
			},
		});
		return row;
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			throw new ProfileTagError(
				"conflict",
				"A tag with this slug already exists for this player.",
			);
		}
		throw e;
	}
}

export async function removeProfileTag(
	db: PrismaClient,
	input: { profileId: string; tagId: string },
): Promise<void> {
	const profile = await db.profile.findUnique({
		where: { id: input.profileId },
		select: { id: true, adminRole: true },
	});
	if (!profile || profile.adminRole != null) {
		throw new ProfileTagError("not_found", "Customer profile not found.");
	}

	const result = await db.profileTag.deleteMany({
		where: {
			id: input.tagId,
			profileId: input.profileId,
		},
	});
	if (result.count === 0) {
		throw new ProfileTagError("not_found", "Tag not found.");
	}
}
