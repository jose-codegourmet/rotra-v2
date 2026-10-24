"use client";

import { useFormContext } from "react-hook-form";

import { StepBlock } from "@/components/modules/onboarding/StepBlock/StepBlock";
import { Field, FieldError, FieldLabel } from "@/components/ui/field/Field";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select/NativeSelect";
import type { OnboardingFormValues } from "@/lib/onboarding/onboarding-form-schema";
import { cn } from "@/lib/utils";

type ExperienceStepProps = {
	years: number[];
};

export function ExperienceStep({ years }: ExperienceStepProps) {
	const { register, watch, setValue, formState } =
		useFormContext<OnboardingFormValues>();

	const playingLessThanOneYear = watch("playing_since_less_than_one_year");
	const errors = formState.errors;
	const ageInvalid = Boolean(errors.age);
	const playingSinceInvalid = Boolean(errors.playing_since_year);

	return (
		<StepBlock
			kicker="Step 3 of 8"
			title="Your experience"
			subtitle="Age stays private. Playing history can appear on your profile."
		>
			<Field data-invalid={ageInvalid}>
				<FieldLabel htmlFor="onboarding-age">Age</FieldLabel>
				<NativeSelect
					id="onboarding-age"
					className={cn("mb-4 w-full", ageInvalid && "aria-invalid")}
					aria-invalid={ageInvalid}
					{...register("age", {
						setValueAs: (v) => {
							if (v === "" || v === undefined) {
								return "" as const;
							}
							const n = Number(v);
							return Number.isNaN(n) ? ("" as const) : n;
						},
					})}
				>
					<NativeSelectOption value="">Select age</NativeSelectOption>
					{Array.from({ length: 99 - 13 + 1 }, (_, i) => i + 13).map(
						(value) => (
							<NativeSelectOption key={value} value={String(value)}>
								{value}
							</NativeSelectOption>
						),
					)}
				</NativeSelect>
				<FieldError errors={[errors.age]} />
			</Field>
			<FieldLabel
				htmlFor="onboarding-playing-since-toggle"
				className="text-small font-medium text-text-secondary"
			>
				Playing since
			</FieldLabel>
			<button
				id="onboarding-playing-since-toggle"
				type="button"
				onClick={() => {
					setValue(
						"playing_since_less_than_one_year",
						!playingLessThanOneYear,
						{
							shouldDirty: true,
							shouldValidate: true,
						},
					);
					if (!playingLessThanOneYear) {
						setValue("playing_since_year", "", {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}}
				className={cn(
					"mb-3 min-h-[44px] w-full rounded-lg border text-body transition-colors",
					playingLessThanOneYear
						? "border-accent bg-accent/15 text-accent"
						: "border-border bg-bg-elevated text-text-secondary",
				)}
			>
				Less than 1 year
			</button>
			<Field data-invalid={playingSinceInvalid}>
				<FieldLabel htmlFor="onboarding-playing-since" className="sr-only">
					Year started
				</FieldLabel>
				<NativeSelect
					id="onboarding-playing-since"
					disabled={playingLessThanOneYear}
					className={cn(
						"w-full",
						playingLessThanOneYear && "pointer-events-none opacity-40",
						playingSinceInvalid && "aria-invalid",
					)}
					aria-invalid={playingSinceInvalid}
					{...register("playing_since_year", {
						setValueAs: (v) => {
							if (v === "" || v === undefined) {
								return "" as const;
							}
							const n = Number(v);
							return Number.isNaN(n) ? ("" as const) : n;
						},
					})}
				>
					<NativeSelectOption value="">Select year</NativeSelectOption>
					{years.map((year) => (
						<NativeSelectOption key={year} value={String(year)}>
							{year}
						</NativeSelectOption>
					))}
				</NativeSelect>
				<FieldError errors={[errors.playing_since_year]} />
			</Field>
		</StepBlock>
	);
}
