import { OnboardingWizard } from "@/components/modules/onboarding/OnboardingWizard/OnboardingWizard";
import { getCurrentProfile } from "@/lib/server/current-profile";

type WelcomeKind = "first" | "return_no_phone" | "return_has_phone";

function welcomeKind(
	profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
): WelcomeKind {
	if (profile.phone) {
		return "return_has_phone";
	}
	const msSinceCreated = Date.now() - new Date(profile.createdAt).getTime();
	const isRecent = msSinceCreated < 24 * 60 * 60 * 1000;
	return isRecent ? "first" : "return_no_phone";
}

export default async function OnboardingPage() {
	const profile = await getCurrentProfile();
	const kind: WelcomeKind = profile ? welcomeKind(profile) : "first";
	const displayName = profile?.name?.trim().split(/\s+/)[0] ?? "there";

	return (
		<OnboardingWizard
			welcomeKind={kind}
			displayName={displayName}
			initialName={profile?.name ?? ""}
			initialPhoneE164={profile?.phone ?? ""}
		/>
	);
}
