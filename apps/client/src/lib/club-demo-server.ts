import {
	mockMembershipToDemoRole,
	resolveDemoRole,
} from "@/constants/club-demo-role";
import { MOCK_CLUB } from "@/constants/mock-club";

export function resolveServerDemoRole(
	asParam: string | undefined | null,
): ReturnType<typeof resolveDemoRole> {
	return resolveDemoRole(
		asParam ?? null,
		mockMembershipToDemoRole(MOCK_CLUB.membershipStatus),
	);
}
