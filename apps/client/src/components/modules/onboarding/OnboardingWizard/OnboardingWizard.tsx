"use client";

import {
	Award,
	Ban,
	ChevronsDown,
	ChevronsUp,
	Heart,
	Layers,
	LayoutGrid,
	Medal,
	Trophy,
	User,
	Users,
	UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { OnboardingFooter } from "@/components/modules/onboarding/OnboardingFooter/OnboardingFooter";
import { OnboardingStepPanel } from "@/components/modules/onboarding/OnboardingStepPanel/OnboardingStepPanel";
import { ProgressDots } from "@/components/modules/onboarding/ProgressDots/ProgressDots";
import {
	getOnboardingFormDefaults,
	isOnboardingStepValid,
	mapFormValuesToPayload,
	type OnboardingFormValues,
	onboardingFormFullSchema,
	validateOnboardingStep,
} from "@/lib/onboarding/onboarding-form-schema";
import type { OnboardingPayload } from "@/lib/onboarding/validate-payload";
import { validateOnboardingPayload } from "@/lib/onboarding/validate-payload";
import {
	COUNTRY_LABELS,
	dialDigitsFor,
	type IsoCountry,
} from "@/lib/phone/country-dial";

import type { OnboardingWizardProps } from "./OnboardingWizard.types";
import { ChoiceStep } from "./steps/ChoiceStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { LevelStep } from "./steps/LevelStep";
import { NameStep } from "./steps/NameStep";
import { PhoneStep } from "./steps/PhoneStep";
import { WelcomeStep } from "./steps/WelcomeStep";

const HISTORY_KEY = "rotraOnboardingStep";

const COUNTRY_OPTIONS: { iso: IsoCountry; label: string }[] = (
	Object.keys(COUNTRY_LABELS) as IsoCountry[]
).map((iso) => ({ iso, label: COUNTRY_LABELS[iso] }));

const FORMAT_OPTIONS = [
	{ v: "singles" as const, label: "Singles", icon: User },
	{ v: "doubles" as const, label: "Doubles", icon: Users },
	{ v: "both" as const, label: "Both", icon: UsersRound },
];

const COURT_POSITION_OPTIONS = [
	{ v: "front" as const, label: "Front player", icon: ChevronsUp },
	{ v: "back" as const, label: "Back player", icon: ChevronsDown },
	{ v: "both" as const, label: "All-around", icon: LayoutGrid },
];

const PLAY_MODE_OPTIONS = [
	{ v: "competitive" as const, label: "Competitive", icon: Trophy },
	{ v: "social" as const, label: "Social (fun games)", icon: Heart },
	{ v: "both" as const, label: "Mix of both", icon: Layers },
];

const TOURNAMENT_WIN_OPTIONS = [
	{ v: "none" as const, label: "No wins this year", icon: Ban },
	{ v: "1_to_3" as const, label: "1–3 tournament wins", icon: Medal },
	{ v: "4_plus" as const, label: "4+ tournament wins", icon: Award },
];

function guessCountryCode(): IsoCountry {
	if (typeof navigator === "undefined") return "PH";
	const region = navigator.language?.split("-")[1]?.toUpperCase();
	if (!region) return "PH";
	const match = COUNTRY_OPTIONS.find((country) => country.iso === region);
	return match?.iso ?? "PH";
}

function dialPreview(iso: IsoCountry): string {
	const digits = dialDigitsFor(iso);
	return digits ? `+${digits}` : "+";
}

export function OnboardingWizard({
	welcomeKind,
	displayName,
	initialName,
	initialPhoneE164,
}: OnboardingWizardProps) {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [submitting, setSubmitting] = useState(false);

	const defaultValues = useMemo(
		() => getOnboardingFormDefaults(initialName, initialPhoneE164),
		[initialName, initialPhoneE164],
	);

	const form = useForm<OnboardingFormValues>({
		defaultValues,
	});

	const { setError, clearErrors, getValues, setValue, watch } = form;

	const values = watch();
	const isCurrentStepValid = useMemo(
		() => isOnboardingStepValid(step, values),
		[step, values],
	);

	useEffect(() => {
		if (initialPhoneE164) return;
		setValue("phoneIso", guessCountryCode());
	}, [initialPhoneE164, setValue]);

	useEffect(() => {
		window.history.replaceState({ [HISTORY_KEY]: 0 }, "", window.location.href);
		const onPop = (event: PopStateEvent) => {
			const stateStep = event.state?.[HISTORY_KEY];
			if (typeof stateStep === "number" && stateStep >= 0 && stateStep <= 8) {
				setStep(stateStep);
				return;
			}
			setStep((currentStep) => Math.max(0, currentStep - 1));
		};

		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	const pushStep = useCallback((nextStep: number) => {
		window.history.pushState(
			{ [HISTORY_KEY]: nextStep },
			"",
			window.location.href,
		);
		setStep(nextStep);
	}, []);

	const applyZodIssues = useCallback(
		(error: { issues: { path: (string | number)[]; message?: string }[] }) => {
			for (const issue of error.issues) {
				const key = issue.path[0];
				if (typeof key === "string") {
					setError(key as FieldPath<OnboardingFormValues>, {
						message: issue.message ?? "Invalid value",
					});
				}
			}
		},
		[setError],
	);

	const tryAdvance = () => {
		const currentValues = getValues();
		const result = validateOnboardingStep(step, currentValues);
		if (!result.success) {
			applyZodIssues(result.error);
			return;
		}
		clearErrors();
		if (step < 8) {
			pushStep(step + 1);
		}
	};

	const welcomeCopy = useMemo(() => {
		if (welcomeKind === "return_has_phone") {
			return {
				heading: `Hey ${displayName}, still here!`,
				subtitle: "Just a few more questions and you're ready to play.",
			};
		}
		if (welcomeKind === "return_no_phone") {
			return {
				heading: `Welcome back, ${displayName}!`,
				subtitle:
					"You still need to finish your profile. It only takes a minute.",
			};
		}
		return {
			heading: `You're almost in, ${displayName}!`,
			subtitle: "Set up your profile in under 2 minutes and start playing.",
		};
	}, [welcomeKind, displayName]);

	const currentYear = new Date().getFullYear();
	const years = useMemo(
		() =>
			Array.from({ length: currentYear - 1960 + 1 }, (_, i) => currentYear - i),
		[currentYear],
	);

	const finish = async () => {
		const currentValues = getValues();
		const parsed = onboardingFormFullSchema.safeParse(currentValues);
		if (!parsed.success) {
			applyZodIssues(parsed.error);
			return;
		}

		const payload: OnboardingPayload = mapFormValuesToPayload(getValues());
		const validationResult = validateOnboardingPayload(payload);
		if (!validationResult.ok) {
			toast.error(validationResult.message);
			return;
		}

		setSubmitting(true);
		try {
			const response = await fetch("/api/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validationResult.data),
			});
			if (!response.ok) {
				const err = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				toast.error(err?.error ?? "Something went wrong. Please try again.");
				return;
			}
			router.push("/home");
		} catch {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const goBackUi = () => {
		if (step <= 1) return;
		window.history.back();
	};

	return (
		<FormProvider {...form}>
			<div className="flex flex-1 flex-col">
				<ProgressDots currentStep={step} />

				<div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 md:max-w-2xl md:px-8">
					<OnboardingStepPanel>
						<div className="flex flex-1 flex-col justify-center gap-6">
							{step === 0 && (
								<WelcomeStep
									heading={welcomeCopy.heading}
									subtitle={welcomeCopy.subtitle}
								/>
							)}
							{step === 1 && <NameStep />}
							{step === 2 && (
								<PhoneStep
									countryOptions={COUNTRY_OPTIONS}
									getDialPreview={dialPreview}
								/>
							)}
							{step === 3 && <ExperienceStep years={years} />}
							{step === 4 && <LevelStep />}
							{step === 5 && (
								<ChoiceStep
									field="format_preference"
									kicker="Step 5 of 8"
									title="How you play"
									subtitle="Singles, doubles, or both."
									options={FORMAT_OPTIONS}
								/>
							)}
							{step === 6 && (
								<ChoiceStep
									field="court_position"
									kicker="Step 6 of 8"
									title="Your court position"
									subtitle="Helps Que Masters balance doubles teams."
									options={COURT_POSITION_OPTIONS}
								/>
							)}
							{step === 7 && (
								<ChoiceStep
									field="play_mode"
									kicker="Step 7 of 8"
									title="Your play style"
									subtitle="Competitive, social, or a mix."
									options={PLAY_MODE_OPTIONS}
								/>
							)}
							{step === 8 && (
								<ChoiceStep
									field="tournament_wins_last_year"
									kicker="Step 8 of 8"
									title="Your track record"
									subtitle="Tournament wins in the last 12 months (self-reported)."
									options={TOURNAMENT_WIN_OPTIONS}
									helperText="You can update this anytime from profile settings."
								/>
							)}
						</div>
					</OnboardingStepPanel>
				</div>

				<OnboardingFooter
					step={step}
					isCurrentStepValid={isCurrentStepValid}
					submitting={submitting}
					onBack={goBackUi}
					onStart={() => pushStep(1)}
					onNext={tryAdvance}
					onFinish={finish}
				/>
			</div>
		</FormProvider>
	);
}
