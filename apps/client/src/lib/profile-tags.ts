export function profileHasTag(
	tags: { slug: string }[] | undefined,
	slug: string,
): boolean {
	return tags?.some((t) => t.slug === slug) ?? false;
}

export const TESTER_LOGIN_TAG_SLUG = "tester-login-as-guest";
