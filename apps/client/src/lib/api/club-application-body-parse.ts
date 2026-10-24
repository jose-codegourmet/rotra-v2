import type { ClubApplicationCreatePayload } from "@rotra/db";

import {
	type ClubApplicationCreateFormValues,
	clubApplicationCreateBodySchema,
} from "@/components/modules/clubs/club-application-form/schema";
import type { ClubApplicationCreateBody } from "@/types/club-application";

function toPayload(
	data: ClubApplicationCreateFormValues,
): ClubApplicationCreatePayload {
	const emptyToNull = (s: string) => (s.trim() === "" ? null : s.trim());
	return {
		clubName: data.clubName,
		description: data.description,
		intent: data.intent,
		locationCity: data.locationCity,
		locationVenue: data.locationVenue,
		venueAddress: data.venueAddress,
		facebookPageUrl: emptyToNull(data.facebookPageUrl),
		facebookProfileUrl: emptyToNull(data.facebookProfileUrl),
		contactNumber: emptyToNull(data.contactNumber),
		expectedPlayerCount: data.expectedPlayerCount,
		additionalNotes: emptyToNull(data.additionalNotes),
	};
}

export function parseClubApplicationCreateBody(
	body: ClubApplicationCreateBody,
):
	| { ok: true; data: ClubApplicationCreatePayload }
	| { ok: false; message: string } {
	const parsed = clubApplicationCreateBodySchema.safeParse(body);
	if (!parsed.success) {
		const first = parsed.error.issues[0];
		return {
			ok: false,
			message: first?.message ?? "Invalid application data.",
		};
	}
	return { ok: true, data: toPayload(parsed.data) };
}
