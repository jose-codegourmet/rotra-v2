/**
 * Pure slug helpers safe for browser / client bundles (no Prisma or node:crypto).
 */

export function slugifyTag(label: string): string {
	const slug = label.trim().toLowerCase().replace(/\s/g, "-");
	if (slug.length === 0) {
		throw new Error("Tag label cannot be empty.");
	}
	return slug;
}

export function slugifyTagDefinitionSlug(label: string): string {
	const slug = label.trim().toLowerCase().replace(/\s/g, "-");
	if (slug.length === 0) {
		throw new Error("Tag slug cannot be empty.");
	}
	return slug;
}
