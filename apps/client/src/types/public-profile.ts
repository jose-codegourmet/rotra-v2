/** JSON returned by `GET /api/profile/[userId]` (serializable). */
export type PublicProfileTagDto = {
	id: string;
	slug: string;
	label: string;
	assignedAt: string;
};

/** JSON returned by `GET /api/profile/[userId]` (serializable). */
export type PublicProfileDto = {
	id: string;
	name: string;
	avatarUrl: string | null;
	playingLevel: string | null;
	formatPreference: string | null;
	courtPosition: string | null;
	playMode: string | null;
	mmr: number;
	expTotal: number;
	onboardingCompleted: boolean;
	tags: PublicProfileTagDto[];
	createdAt: string;
	updatedAt: string;
};
