import { db } from "@rotra/db";

import type { SessionLiveContext } from "@/types/session-live";

function toSessionLiveContext(
	session: {
		id: string;
		hostId: string;
		title: string | null;
		location: string;
		status: string;
		dateTime: Date;
		endTime: Date | null;
		numCourts: number;
		totalSlots: number;
		_count: { registrations: number };
	},
	profileId: string,
	viewerRegistration: SessionLiveContext["viewerRegistration"],
): SessionLiveContext {
	const sessionLabel =
		session.title?.trim() || session.location.trim() || "Live session";

	return {
		sessionId: session.id,
		title: session.title,
		location: session.location,
		isOwner: session.hostId === profileId,
		sessionLabel,
		sessionTitle: session.title ?? session.location,
		status: session.status as SessionLiveContext["status"],
		dateTime: session.dateTime.toISOString(),
		endTime: session.endTime?.toISOString() ?? null,
		numCourts: session.numCourts,
		totalSlots: session.totalSlots,
		acceptedCount: session._count.registrations,
		viewerRegistration,
	};
}

export async function getSessionLiveContext(
	sessionId: string,
	profileId: string,
): Promise<SessionLiveContext | null> {
	const [session, viewerReg] = await Promise.all([
		db.queueSession.findUnique({
			where: { id: sessionId },
			select: {
				id: true,
				hostId: true,
				title: true,
				location: true,
				status: true,
				dateTime: true,
				endTime: true,
				numCourts: true,
				totalSlots: true,
				_count: {
					select: {
						registrations: {
							where: { admissionStatus: "accepted" },
						},
					},
				},
			},
		}),
		db.sessionRegistration.findUnique({
			where: {
				sessionId_playerId: { sessionId, playerId: profileId },
			},
			select: {
				admissionStatus: true,
				playerStatus: true,
				waitlistPosition: true,
			},
		}),
	]);

	if (!session) {
		return null;
	}

	const viewerRegistration =
		viewerReg && viewerReg.playerStatus !== "exited"
			? {
					admissionStatus: viewerReg.admissionStatus,
					playerStatus: viewerReg.playerStatus,
					waitlistPosition: viewerReg.waitlistPosition,
				}
			: null;

	return toSessionLiveContext(session, profileId, viewerRegistration);
}
