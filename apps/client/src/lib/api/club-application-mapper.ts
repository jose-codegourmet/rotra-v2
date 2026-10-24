import type { ClubApplicationDto } from "@/types/club-application";

type ClubApplicationRow = {
	id: string;
	playerId: string;
	clubName: string;
	description: string;
	intent: string;
	locationCity: string;
	locationVenue: string;
	venueAddress: string;
	facebookPageUrl: string | null;
	facebookProfileUrl: string | null;
	contactNumber: string | null;
	expectedPlayerCount: ClubApplicationDto["expectedPlayerCount"];
	additionalNotes: string | null;
	status: ClubApplicationDto["status"];
	rejectionReason: string | null;
	reviewNote: string | null;
	reviewedById: string | null;
	reviewedAt: Date | null;
	resultingClubId: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export function toClubApplicationDto(
	row: ClubApplicationRow,
): ClubApplicationDto {
	return {
		id: row.id,
		playerId: row.playerId,
		clubName: row.clubName,
		description: row.description,
		intent: row.intent,
		locationCity: row.locationCity,
		locationVenue: row.locationVenue,
		venueAddress: row.venueAddress,
		facebookPageUrl: row.facebookPageUrl,
		facebookProfileUrl: row.facebookProfileUrl,
		contactNumber: row.contactNumber,
		expectedPlayerCount: row.expectedPlayerCount,
		additionalNotes: row.additionalNotes,
		status: row.status,
		rejectionReason: row.rejectionReason,
		reviewNote: row.reviewNote,
		reviewedById: row.reviewedById,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		resultingClubId: row.resultingClubId,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}
