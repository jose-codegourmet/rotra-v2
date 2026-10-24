export type DemoClubRole = "owner" | "que_master" | "member" | "not-member";

const VALID = new Set<string>(["owner", "que_master", "member", "not-member"]);

export type MockMembershipStatus = "owner" | "member" | "not-member";

export function resolveDemoRole(
	asParam: string | undefined | null,
	fallback: DemoClubRole,
): DemoClubRole {
	if (asParam && VALID.has(asParam)) {
		return asParam as DemoClubRole;
	}
	return fallback;
}

export function mockMembershipToDemoRole(
	status: MockMembershipStatus,
): DemoClubRole {
	return status;
}

/** Preserve demo query string (e.g. `?as=member`) for redirects. */
export function clubDemoQueryString(
	searchParams: Record<string, string | string[] | undefined>,
): string {
	const as = searchParams.as;
	if (typeof as === "string" && as.length > 0) {
		return `?as=${encodeURIComponent(as)}`;
	}
	return "";
}
