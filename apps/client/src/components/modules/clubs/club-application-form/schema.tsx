import { z } from "zod";

import type { ExpectedPlayerBucketDto } from "@/types/club-application";

/**
 * Club application form schema (view spec: club_application.md).
 * Also used by API route handlers via {@link parseClubApplicationCreateBody} for matching validation.
 */

/** View spec: docs/views/client_app/player/club_application.md */
export const CLUB_APPLICATION_FIELD_LIMITS = {
	clubName: 60,
	description: 300,
	intent: 500,
	locationCity: 200,
	locationVenue: 200,
	venueAddress: 500,
	additionalNotes: 500,
	optionalUrl: 2048,
	contactNumber: 40,
} as const;

const L = CLUB_APPLICATION_FIELD_LIMITS;

export const EXPECTED_PLAYER_BUCKETS = [
	"one_to_ten",
	"eleven_to_twentyfive",
	"twentysix_to_fifty",
	"fiftyone_to_hundred",
	"hundred_plus",
] as const satisfies readonly ExpectedPlayerBucketDto[];

export const expectedPlayerBucketSchema = z.enum(EXPECTED_PLAYER_BUCKETS);

function isValidHttpUrl(s: string): boolean {
	try {
		const u = new URL(s);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}

function requiredText(fieldLabel: string, max: number) {
	return z
		.string()
		.trim()
		.min(1, { message: `${fieldLabel} is required.` })
		.max(max, {
			message: `${fieldLabel} must be at most ${max} characters.`,
		});
}

function optionalHttpUrl(fieldLabel: string, max: number) {
	return z
		.string()
		.trim()
		.max(max, {
			message: `${fieldLabel} must be at most ${max} characters.`,
		})
		.refine((s) => s.length === 0 || isValidHttpUrl(s), {
			message: `${fieldLabel} must be a valid http(s) URL.`,
		});
}

function optionalText(max: number, fieldLabel: string) {
	return z
		.string()
		.trim()
		.max(max, {
			message: `${fieldLabel} must be at most ${max} characters.`,
		});
}

export const clubApplicationCreateBodySchema = z.object({
	clubName: requiredText("Club name", L.clubName),
	description: requiredText("Club description", L.description),
	intent: requiredText("Intent", L.intent),
	locationCity: requiredText("City", L.locationCity),
	locationVenue: requiredText("Venue name", L.locationVenue),
	venueAddress: requiredText("Venue address", L.venueAddress),
	facebookPageUrl: optionalHttpUrl("Club Facebook page URL", L.optionalUrl),
	facebookProfileUrl: optionalHttpUrl(
		"Your Facebook profile URL",
		L.optionalUrl,
	),
	contactNumber: optionalText(L.contactNumber, "Contact number"),
	expectedPlayerCount: expectedPlayerBucketSchema,
	additionalNotes: optionalText(L.additionalNotes, "Additional notes"),
});

export type ClubApplicationCreateFormValues = z.infer<
	typeof clubApplicationCreateBodySchema
>;

export const clubApplicationEmptyFormValues: ClubApplicationCreateFormValues = {
	clubName: "",
	description: "",
	intent: "",
	locationCity: "",
	locationVenue: "",
	venueAddress: "",
	facebookPageUrl: "",
	facebookProfileUrl: "",
	contactNumber: "",
	expectedPlayerCount: "one_to_ten",
	additionalNotes: "",
};
