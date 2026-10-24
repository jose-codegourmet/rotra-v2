export interface SessionRosterPlayer {
	id: string;
	playerId: string;
	displayName: string;
	avatarUrl: string | null;
	admissionStatus: string;
	playerStatus: string;
	paymentStatus: string;
	waitlistPosition: number | null;
}

export interface SessionRosterResponse {
	accepted: SessionRosterPlayer[];
	waitlisted: SessionRosterPlayer[];
}
