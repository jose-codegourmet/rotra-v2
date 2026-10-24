import { db } from "@rotra/db";

import type {
	SessionRosterPlayer,
	SessionRosterResponse,
} from "@/types/session-roster";

function mapRegistration(reg: {
	id: string;
	playerId: string;
	admissionStatus: string;
	playerStatus: string;
	paymentStatus: string;
	waitlistPosition: number | null;
	player: { name: string; avatarUrl: string | null };
}): SessionRosterPlayer {
	return {
		id: reg.id,
		playerId: reg.playerId,
		displayName: reg.player.name,
		avatarUrl: reg.player.avatarUrl,
		admissionStatus: reg.admissionStatus,
		playerStatus: reg.playerStatus,
		paymentStatus: reg.paymentStatus,
		waitlistPosition: reg.waitlistPosition,
	};
}

export async function getSessionRoster(
	sessionId: string,
): Promise<SessionRosterResponse | null> {
	const session = await db.queueSession.findUnique({
		where: { id: sessionId },
		select: { id: true },
	});

	if (!session) {
		return null;
	}

	const registrations = await db.sessionRegistration.findMany({
		where: {
			sessionId,
			admissionStatus: { in: ["accepted", "waitlisted", "reserved"] },
			playerStatus: { not: "exited" },
		},
		include: {
			player: { select: { name: true, avatarUrl: true } },
		},
		orderBy: [{ admissionStatus: "asc" }, { waitlistPosition: "asc" }],
	});

	const accepted: SessionRosterPlayer[] = [];
	const waitlisted: SessionRosterPlayer[] = [];

	for (const reg of registrations) {
		const mapped = mapRegistration(reg);
		if (reg.admissionStatus === "waitlisted") {
			waitlisted.push(mapped);
		} else {
			accepted.push(mapped);
		}
	}

	return { accepted, waitlisted };
}
