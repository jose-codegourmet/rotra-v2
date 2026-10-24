import { Prisma, type PrismaClient, type TagAssignableBy } from "@prisma/client";

import { RESERVED_TAG_SLUGS } from "./shared-constants";
import { slugifyTagDefinitionSlug as slugifyTagDefinitionSlugCore } from "./slugify";

type DbClient = PrismaClient | Prisma.TransactionClient;

export { RESERVED_TAG_SLUGS };

export type TagDefinitionDto = {
	id: string;
	slug: string;
	label: string;
	description: string | null;
	isActive: boolean;
	assignableBy: TagAssignableBy;
	createdAt: Date;
	updatedAt: Date;
};

export class TagDefinitionError extends Error {
	constructor(
		public readonly code:
			| "not_found"
			| "conflict"
			| "invalid_slug"
			| "reserved",
		message: string,
	) {
		super(message);
		this.name = "TagDefinitionError";
	}
}

function toDto(row: {
	id: string;
	slug: string;
	label: string;
	description: string | null;
	isActive: boolean;
	assignableBy: TagAssignableBy;
	createdAt: Date;
	updatedAt: Date;
}): TagDefinitionDto {
	return {
		id: row.id,
		slug: row.slug,
		label: row.label,
		description: row.description,
		isActive: row.isActive,
		assignableBy: row.assignableBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/**
 * Derives a stable slug from a display label: trim, lowercase, spaces → hyphens.
 */
export function slugifyTagDefinitionSlug(label: string): string {
	try {
		return slugifyTagDefinitionSlugCore(label);
	} catch {
		throw new TagDefinitionError("invalid_slug", "Tag slug cannot be empty.");
	}
}

export async function createTagDefinition(
	db: PrismaClient,
	input: {
		slug: string;
		label: string;
		description?: string | null;
		assignableBy: TagAssignableBy;
		createdById: string;
	},
): Promise<TagDefinitionDto> {
	const slug = slugifyTagDefinitionSlug(input.slug);
	const label = input.label.trim();
	if (!label) {
		throw new TagDefinitionError("invalid_slug", "Tag label cannot be empty.");
	}

	try {
		const row = await db.tagDefinition.create({
			data: {
				slug,
				label,
				description: input.description?.trim() || null,
				assignableBy: input.assignableBy,
				createdById: input.createdById,
			},
		});
		return toDto(row);
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			throw new TagDefinitionError(
				"conflict",
				"A tag definition with this slug already exists.",
			);
		}
		throw e;
	}
}

export async function listTagDefinitions(
	db: PrismaClient,
	input: { includeInactive?: boolean } = {},
): Promise<TagDefinitionDto[]> {
	const rows = await db.tagDefinition.findMany({
		...(input.includeInactive ? {} : { where: { isActive: true } }),
		orderBy: [{ label: "asc" }, { slug: "asc" }],
	});
	return rows.map(toDto);
}

export async function getTagDefinitionBySlug(
	db: DbClient,
	slug: string,
): Promise<TagDefinitionDto | null> {
	const row = await db.tagDefinition.findUnique({
		where: { slug: slug.trim().toLowerCase() },
	});
	return row ? toDto(row) : null;
}

export async function getTagDefinitionById(
	db: PrismaClient,
	id: string,
): Promise<TagDefinitionDto | null> {
	const row = await db.tagDefinition.findUnique({ where: { id } });
	return row ? toDto(row) : null;
}

export async function updateTagDefinition(
	db: PrismaClient,
	input: {
		id: string;
		label?: string;
		description?: string | null;
		assignableBy?: TagAssignableBy;
		isActive?: boolean;
	},
): Promise<TagDefinitionDto> {
	const existing = await db.tagDefinition.findUnique({ where: { id: input.id } });
	if (!existing) {
		throw new TagDefinitionError("not_found", "Tag definition not found.");
	}

	if (
		input.isActive === false &&
		(RESERVED_TAG_SLUGS as readonly string[]).includes(existing.slug)
	) {
		throw new TagDefinitionError(
			"reserved",
			`Tag "${existing.slug}" is reserved and cannot be deactivated.`,
		);
	}

	const label =
		input.label !== undefined ? input.label.trim() : undefined;
	if (label !== undefined && label.length === 0) {
		throw new TagDefinitionError("invalid_slug", "Tag label cannot be empty.");
	}

	const row = await db.tagDefinition.update({
		where: { id: input.id },
		data: {
			...(label !== undefined ? { label } : {}),
			...(input.description !== undefined
				? { description: input.description?.trim() || null }
				: {}),
			...(input.assignableBy !== undefined
				? { assignableBy: input.assignableBy }
				: {}),
			...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
		},
	});
	return toDto(row);
}
