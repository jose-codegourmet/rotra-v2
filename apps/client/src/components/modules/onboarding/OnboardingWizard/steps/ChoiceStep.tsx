"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";

import { ChipRow } from "@/components/modules/onboarding/ChipRow/ChipRow";
import { StepBlock } from "@/components/modules/onboarding/StepBlock/StepBlock";
import { FieldError } from "@/components/ui/field/Field";
import type { OnboardingFormValues } from "@/lib/onboarding/onboarding-form-schema";

type ChoiceField =
	| "format_preference"
	| "court_position"
	| "play_mode"
	| "tournament_wins_last_year";

type ChoiceStepProps<F extends ChoiceField> = {
	field: F;
	kicker: string;
	title: string;
	subtitle: string;
	options: {
		v: Exclude<OnboardingFormValues[F], "">;
		label: string;
		icon?: LucideIcon;
	}[];
	helperText?: ReactNode;
};

export function ChoiceStep<F extends ChoiceField>({
	field,
	kicker,
	title,
	subtitle,
	options,
	helperText,
}: ChoiceStepProps<F>) {
	const {
		setValue,
		watch,
		formState: { errors },
	} = useFormContext<OnboardingFormValues>();

	const value = watch(field);
	const fieldError = errors[field];

	return (
		<StepBlock align="center" kicker={kicker} title={title} subtitle={subtitle}>
			<ChipRow
				value={value === "" ? "" : String(value)}
				onChange={(v) =>
					setValue(field, v as never, {
						shouldValidate: true,
						shouldDirty: true,
					})
				}
				options={options}
			/>
			{helperText ? (
				<p className="mt-3 text-center text-small text-text-secondary">
					{helperText}
				</p>
			) : null}
			<FieldError errors={[fieldError]} />
		</StepBlock>
	);
}
