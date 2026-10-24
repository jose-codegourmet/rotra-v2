import { z } from "zod";

import type { OnboardingPayload } from "@/lib/onboarding/validate-payload";
import {
	COUNTRY_CALLING_CODES,
	type IsoCountry,
	splitE164,
	toE164,
} from "@/lib/phone/country-dial";

const ISO_LIST = Object.keys(COUNTRY_CALLING_CODES) as IsoCountry[];
const isoCountrySchema = z.enum(ISO_LIST as [IsoCountry, ...IsoCountry[]]);

const NAME_RE = /^[\p{L}\s'-]{2,40}$/u;

export type OnboardingFormValues = {
	name: string;
	phoneIso: IsoCountry;
	phoneNational: string;
	age: number | "";
	playing_since_less_than_one_year: boolean;
	playing_since_year: number | "";
	playing_level: OnboardingPayload["playing_level"] | "";
	format_preference: OnboardingPayload["format_preference"] | "";
	court_position: OnboardingPayload["court_position"] | "";
	play_mode: OnboardingPayload["play_mode"] | "";
	tournament_wins_last_year:
		| OnboardingPayload["tournament_wins_last_year"]
		| "";
};

export function getOnboardingFormDefaults(
	initialName: string,
	initialPhoneE164: string,
): OnboardingFormValues {
	const parsed = initialPhoneE164 ? splitE164(initialPhoneE164) : null;
	return {
		name: initialName,
		phoneIso: parsed?.iso ?? "PH",
		phoneNational: parsed?.nationalDigits ?? "",
		age: "",
		playing_since_less_than_one_year: false,
		playing_since_year: "",
		playing_level: "",
		format_preference: "",
		court_position: "",
		play_mode: "",
		tournament_wins_last_year: "",
	};
}

const nameField = z
	.string()
	.trim()
	.min(2, "Name must be at least 2 characters.")
	.max(40)
	.regex(NAME_RE, "Name contains invalid characters.");

export const nameStepSchema = z.object({
	name: nameField,
});

export const phoneStepSchema = z
	.object({
		phoneIso: isoCountrySchema,
		phoneNational: z.string(),
	})
	.superRefine((data, ctx) => {
		if (!toE164(data.phoneIso, data.phoneNational)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Please enter a valid phone number.",
				path: ["phoneNational"],
			});
		}
	});

export const experienceStepSchema = z
	.object({
		age: z.union([z.number().int().min(13).max(99), z.literal("")]),
		playing_since_less_than_one_year: z.boolean(),
		playing_since_year: z.union([z.number().int(), z.literal("")]),
	})
	.superRefine((data, ctx) => {
		const currentYear = new Date().getFullYear();
		if (data.age === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Please select your age.",
				path: ["age"],
			});
		}
		if (!data.playing_since_less_than_one_year) {
			if (data.playing_since_year === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Please tell us when you started playing.",
					path: ["playing_since_year"],
				});
			} else if (
				typeof data.playing_since_year === "number" &&
				(data.playing_since_year < 1960 ||
					data.playing_since_year > currentYear)
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Please tell us when you started playing.",
					path: ["playing_since_year"],
				});
			}
		}
	});

const PLAYING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const playingLevelStepSchema = z.object({
	playing_level: z.enum(PLAYING_LEVELS, {
		errorMap: () => ({
			message: "Please select your playing level.",
		}),
	}),
});

const FORMAT_PREFS = ["singles", "doubles", "both"] as const;
export const formatPreferenceStepSchema = z.object({
	format_preference: z.enum(FORMAT_PREFS, {
		errorMap: () => ({
			message: "Please select your format preference.",
		}),
	}),
});

const COURT = ["front", "back", "both"] as const;
export const courtPositionStepSchema = z.object({
	court_position: z.enum(COURT, {
		errorMap: () => ({
			message: "Please select your court position.",
		}),
	}),
});

const PLAY_MODE = ["competitive", "social", "both"] as const;
export const playModeStepSchema = z.object({
	play_mode: z.enum(PLAY_MODE, {
		errorMap: () => ({
			message: "Please select your play style.",
		}),
	}),
});

const WINS = ["none", "1_to_3", "4_plus"] as const;
export const tournamentWinsStepSchema = z.object({
	tournament_wins_last_year: z.enum(WINS, {
		errorMap: () => ({
			message: "Please select your recent tournament wins.",
		}),
	}),
});

/** Full wizard object for final submit — same rules as `validate-payload.ts`. */
export const onboardingFormFullSchema = z
	.object({
		name: nameField,
		phoneIso: isoCountrySchema,
		phoneNational: z.string(),
		age: z
			.number()
			.int("Please select your age.")
			.min(13, "Please select your age.")
			.max(99, "Please select your age."),
		playing_since_less_than_one_year: z.boolean(),
		playing_since_year: z.union([
			z.number().int().min(1960).max(new Date().getFullYear()),
			z.literal(""),
		]),
		playing_level: z.enum(PLAYING_LEVELS),
		format_preference: z.enum(FORMAT_PREFS),
		court_position: z.enum(COURT),
		play_mode: z.enum(PLAY_MODE),
		tournament_wins_last_year: z.enum(WINS),
	})
	.superRefine((data, ctx) => {
		if (!toE164(data.phoneIso, data.phoneNational)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Please enter a valid phone number.",
				path: ["phoneNational"],
			});
		}
		const cy = new Date().getFullYear();
		if (data.playing_since_less_than_one_year) {
			if (data.playing_since_year !== "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Invalid playing since combination.",
					path: ["playing_since_year"],
				});
			}
		} else {
			if (data.playing_since_year === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Please tell us when you started playing.",
					path: ["playing_since_year"],
				});
			} else if (
				typeof data.playing_since_year === "number" &&
				(data.playing_since_year < 1960 || data.playing_since_year > cy)
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Please tell us when you started playing.",
					path: ["playing_since_year"],
				});
			}
		}
	});

export function mapFormValuesToPayload(
	values: OnboardingFormValues,
): OnboardingPayload {
	const phone = toE164(values.phoneIso, values.phoneNational);
	if (!phone) {
		throw new Error("Invalid phone");
	}

	return {
		name: values.name.trim(),
		phone,
		age: Number(values.age),
		playing_since: values.playing_since_less_than_one_year
			? null
			: values.playing_since_year === ""
				? null
				: Number(values.playing_since_year),
		playing_since_less_than_one_year: values.playing_since_less_than_one_year,
		playing_level: values.playing_level as OnboardingPayload["playing_level"],
		format_preference:
			values.format_preference as OnboardingPayload["format_preference"],
		court_position:
			values.court_position as OnboardingPayload["court_position"],
		play_mode: values.play_mode as OnboardingPayload["play_mode"],
		tournament_wins_last_year:
			values.tournament_wins_last_year as OnboardingPayload["tournament_wins_last_year"],
	};
}

/**
 * Validates only the fields relevant to `step` (0 = welcome, no validation).
 */
export function validateOnboardingStep(
	step: number,
	values: OnboardingFormValues,
): { success: true } | { success: false; error: z.ZodError } {
	switch (step) {
		case 0: {
			return { success: true };
		}
		case 1: {
			const r = nameStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 2: {
			const r = phoneStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 3: {
			const r = experienceStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 4: {
			const r = playingLevelStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 5: {
			const r = formatPreferenceStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 6: {
			const r = courtPositionStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 7: {
			const r = playModeStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		case 8: {
			const r = tournamentWinsStepSchema.safeParse(values);
			return r.success ? { success: true } : { success: false, error: r.error };
		}
		default:
			return {
				success: false,
				error: new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "Invalid step.",
						path: [],
					},
				]),
			};
	}
}

/** Whether the current step passes validation (for CTA enabled state). */
export function isOnboardingStepValid(
	step: number,
	values: OnboardingFormValues,
): boolean {
	return validateOnboardingStep(step, values).success;
}
