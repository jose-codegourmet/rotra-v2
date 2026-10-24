"use client";

import { useFormContext } from "react-hook-form";

import { StepBlock } from "@/components/modules/onboarding/StepBlock/StepBlock";
import { Field, FieldError, FieldLabel } from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";
import type { OnboardingFormValues } from "@/lib/onboarding/onboarding-form-schema";

export function NameStep() {
	const {
		register,
		formState: { errors },
	} = useFormContext<OnboardingFormValues>();

	const invalid = Boolean(errors.name);

	return (
		<StepBlock
			kicker="Step 1 of 8"
			title="Your name"
			subtitle="Shown in queue, leaderboard, and your profile."
		>
			<Field data-invalid={invalid}>
				<FieldLabel htmlFor="onboarding-name">Display name</FieldLabel>
				<Input
					id="onboarding-name"
					maxLength={40}
					aria-invalid={invalid}
					className="h-12 rounded-lg border-border bg-bg-elevated px-3 text-body text-text-primary"
					placeholder="Your display name"
					{...register("name")}
				/>
				<FieldError errors={[errors.name]} />
			</Field>
		</StepBlock>
	);
}
