/** JSON shape returned by `/api/club-applications/*` (dates as ISO strings). */

export type ClubApplicationStatusDto =
	| "pending"
	| "in_review"
	| "approved"
	| "rejected"
	| "cancelled";

export type ExpectedPlayerBucketDto =
	| "one_to_ten"
	| "eleven_to_twentyfive"
	| "twentysix_to_fifty"
	| "fiftyone_to_hundred"
	| "hundred_plus";

export type ClubApplicationDto = {
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
	expectedPlayerCount: ExpectedPlayerBucketDto;
	additionalNotes: string | null;
	status: ClubApplicationStatusDto;
	rejectionReason: string | null;
	reviewNote: string | null;
	reviewedById: string | null;
	reviewedAt: string | null;
	resultingClubId: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ClubApplicationCreateBody = {
	clubName: string;
	description: string;
	intent: string;
	locationCity: string;
	locationVenue: string;
	venueAddress: string;
	facebookPageUrl?: string | null;
	facebookProfileUrl?: string | null;
	contactNumber?: string | null;
	expectedPlayerCount: ExpectedPlayerBucketDto;
	additionalNotes?: string | null;
};
