import type { ClubApplicationCreateBody } from "@/types/club-application";
import {
	type ClubApplicationCreateFormValues,
	clubApplicationEmptyFormValues,
} from "./schema";

export function emptyClubApplicationForm(): ClubApplicationCreateFormValues {
	return { ...clubApplicationEmptyFormValues };
}

export function clubApplicationToFormValues(
	row: Pick<
		ClubApplicationCreateBody,
		| "clubName"
		| "description"
		| "intent"
		| "locationCity"
		| "locationVenue"
		| "venueAddress"
		| "expectedPlayerCount"
	> & {
		facebookPageUrl?: string | null;
		facebookProfileUrl?: string | null;
		contactNumber?: string | null;
		additionalNotes?: string | null;
	},
): ClubApplicationCreateFormValues {
	return {
		clubName: row.clubName,
		description: row.description,
		intent: row.intent,
		locationCity: row.locationCity,
		locationVenue: row.locationVenue,
		venueAddress: row.venueAddress,
		facebookPageUrl: row.facebookPageUrl ?? "",
		facebookProfileUrl: row.facebookProfileUrl ?? "",
		contactNumber: row.contactNumber ?? "",
		expectedPlayerCount: row.expectedPlayerCount,
		additionalNotes: row.additionalNotes ?? "",
	};
}
