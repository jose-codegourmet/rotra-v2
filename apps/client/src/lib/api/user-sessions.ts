import { db } from "@rotra/db";

import type {
	UserSessionItem,
	UserSessionStatus,
	UserSessionsResponse,
} from "@/types/user-sessions";

export async function getUserSessions(
	profileId: string,
): Promise<UserSessionsResponse> {
	const registrations = await db.sessionRegistration.findMany({
		where: { playerId: profileId },
		include: {
			session: {
				include: {
					club: { select: { id: true, name: true } },
					registrations: {
						where: { admissionStatus: "accepted" },
						select: { id: true },
					},
				},
			},
		},
		orderBy: { session: { dateTime: "desc" } },
	});

	const sessions: UserSessionItem[] = registrations.map((reg) => {
		const session = reg.session;
		const coordinates =
			session.venueLat != null && session.venueLng != null
				? { lat: session.venueLat, lng: session.venueLng }
				: null;

		return {
			id: session.id,
			title: session.title,
			isOwner: session.hostId === profileId,
			clubId: session.clubId,
			clubName: session.club?.name ?? null,
			location: session.location,
			venueAddress: session.venueAddress,
			coordinates,
			dateTime: session.dateTime.toISOString(),
			endTime: session.endTime?.toISOString() ?? null,
			status: session.status as UserSessionStatus,
			totalSlots: session.totalSlots,
			acceptedCount: session.registrations.length,
			playersPerCourt: session.playersPerCourt,
			admissionStatus: reg.admissionStatus,
			playerStatus: reg.playerStatus,
			href: `/sessions/${session.id}`,
		};
	});

	return { sessions };
}
