export type WelcomeKind = "first" | "return_no_phone" | "return_has_phone";

export type OnboardingWizardProps = {
	welcomeKind: WelcomeKind;
	displayName: string;
	initialName: string;
	initialPhoneE164: string;
};
