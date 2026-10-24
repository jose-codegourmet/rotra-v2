import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/server/current-profile";
import type {
	ActiveSessionResponse,
	ActiveSessionSummary,
} from "@/types/session-discovery";

export const runtime = "nodejs";

const PLAYER_STATUS_PRIORITY: Record<string, number> = {
	playing: 0,
	waiting: 1,
	i_am_in: 2,
	i_am_prepared: 3,
	resting: 4,
	eating: 5,
	not_arrived: 6,
	suspended: 7,
};

function sessionStatusPriority(status: string): number {
	return status === "active" ? 0 : 1;
}

function buildCourtHint(playerStatus: string): string | null {
	if (playerStatus === "playing") return "On court";
	if (playerStatus === "waiting") return "Up next";
	return null;
}

function isCurrentSession(
	session: { status: string; dateTime: Date },
	now = new Date(),
): boolean {
	if (session.status === "active") return true;
	if (
		session.status === "open" &&
		session.dateTime.getTime() <= now.getTime()
	) {
		return true;
	}
	return false;
}

function emptyResponse(): ActiveSessionResponse {
	return { current: null, scheduled: null };
}

function toActiveSessionSummary(
	reg: {
		sessionId: string;
		playerStatus: string;
		admissionStatus: string;
		session: {
			id: string;
			status: string;
			title: string | null;
			hostId: string;
			location: string;
			dateTime: Date;
			club: { name: string } | null;
		};
	},
	profileId: string,
): ActiveSessionSummary {
	const sessionStatus =
		reg.session.status === "active" ? "active" : ("open" as const);

	return {
		sessionId: reg.session.id,
		title: reg.session.title,
		isOwner: reg.session.hostId === profileId,
		clubName: reg.session.club?.name ?? null,
		location: reg.session.location,
		dateTime: reg.session.dateTime.toISOString(),
		status: sessionStatus,
		playerStatus: reg.playerStatus,
		admissionStatus: reg.admissionStatus,
		courtHint: buildCourtHint(reg.playerStatus),
		href: `/find-sessions/${reg.session.id}`,
	};
}

export async function GET() {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const registrations = await db.sessionRegistration.findMany({
			where: {
				playerId: profile.id,
				admissionStatus: { in: ["accepted", "waitlisted", "reserved"] },
				playerStatus: { not: "exited" },
				session: { status: { in: ["open", "active"] } },
			},
			include: {
				session: {
					include: {
						club: { select: { name: true } },
					},
				},
			},
		});

		if (registrations.length === 0) {
			return NextResponse.json(emptyResponse());
		}

		registrations.sort((a, b) => {
			const statusDiff =
				sessionStatusPriority(a.session.status) -
				sessionStatusPriority(b.session.status);
			if (statusDiff !== 0) return statusDiff;

			const playerDiff =
				(PLAYER_STATUS_PRIORITY[a.playerStatus] ?? 99) -
				(PLAYER_STATUS_PRIORITY[b.playerStatus] ?? 99);
			if (playerDiff !== 0) return playerDiff;

			return b.session.dateTime.getTime() - a.session.dateTime.getTime();
		});

		const best = registrations[0];
		if (!best) {
			return NextResponse.json(emptyResponse());
		}

		const summary = toActiveSessionSummary(best, profile.id);
		const response: ActiveSessionResponse = isCurrentSession(best.session)
			? { current: summary, scheduled: null }
			: { current: null, scheduled: summary };
		return NextResponse.json(response);
	} catch (e) {
		console.error("[sessions/active GET]", e);
		return NextResponse.json(
			{ error: "Failed to fetch active session." },
			{ status: 500 },
		);
	}
}
