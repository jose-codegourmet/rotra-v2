/**
 * Client-safe exports for Next.js "use client" modules.
 * Do not import the main `@rotra/db` entry from client components — it pulls server-only code (Prisma, node:crypto).
 */

export { slugifyTag, slugifyTagDefinitionSlug } from "./slugify";
export { RESERVED_TAG_SLUGS } from "./shared-constants";
export type { TesterDirectoryStatus } from "./shared-types";
