export type SessionLiveStatus =
	| "draft"
	| "open"
	| "active"
	| "closed"
	| "completed"
	| "cancelled";

export interface SessionViewerRegistration {
	admissionStatus: string;
	playerStatus: string;
	waitlistPosition: number | null;
}

export interface SessionLiveContext {
	sessionId: string;
	title: string | null;
	location: string;
	isOwner: boolean;
	sessionLabel: string;
	sessionTitle: string;
	status: SessionLiveStatus;
	dateTime: string;
	endTime: string | null;
	numCourts: number;
	totalSlots: number;
	acceptedCount: number;
	viewerRegistration: SessionViewerRegistration | null;
}
