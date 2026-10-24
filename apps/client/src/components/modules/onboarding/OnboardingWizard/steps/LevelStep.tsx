"use client";

import { useFormContext } from "react-hook-form";

import { StepBlock } from "@/components/modules/onboarding/StepBlock/StepBlock";
import { FieldError } from "@/components/ui/field/Field";
import type { OnboardingFormValues } from "@/lib/onboarding/onboarding-form-schema";
import type { OnboardingPayload } from "@/lib/onboarding/validate-payload";
import { cn } from "@/lib/utils";

type LevelValue = OnboardingPayload["playing_level"];

const LEVEL_OPTIONS: { v: LevelValue; label: string }[] = [
	{ v: "beginner", label: "Beginner" },
	{ v: "intermediate", label: "Intermediate" },
	{ v: "advanced", label: "Advanced" },
];

export function LevelStep() {
	const {
		setValue,
		watch,
		formState: { errors },
	} = useFormContext<OnboardingFormValues>();

	const playingLevel = watch("playing_level");

	return (
		<StepBlock
			kicker="Step 4 of 8"
			title="Your level"
			subtitle="Self-declared — helps until ratings build up."
		>
			<div className="flex flex-col gap-3">
				{LEVEL_OPTIONS.map((opt) => (
					<button
						key={opt.v}
						type="button"
						onClick={() =>
							setValue("playing_level", opt.v, {
								shouldValidate: true,
								shouldDirty: true,
							})
						}
						className={cn(
							"min-h-[44px] w-full rounded-xl border p-4 text-left text-body transition-colors",
							playingLevel === opt.v
								? "border-accent bg-accent/10 text-accent"
								: "border-border bg-bg-surface text-text-primary",
						)}
					>
						{opt.label}
					</button>
				))}
			</div>
			<FieldError errors={[errors.playing_level]} />
		</StepBlock>
	);
}
