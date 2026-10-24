import { db } from "@rotra/db";
import type {
	CourtCardData,
	NextQueueItem,
	PlayerQueueCardData,
	StandingRow,
} from "@/constants/mock-session-ui";

import type { SessionRosterPlayer } from "@/types/session-roster";

export interface SessionConsoleData {
	courts: CourtCardData[];
	inactiveCourts: CourtCardData[];
	nextQueue: NextQueueItem[];
	roster: PlayerQueueCardData[];
	standingRows: StandingRow[];
	ledgerPlayers: SessionRosterPlayer[];
}

function formatTeamNames(players: { player: { name: string } }[]): string {
	return players.map((p) => p.player.name).join(" & ");
}

function mapPlayerStatus(status: string): PlayerQueueCardData["status"] {
	switch (status) {
		case "playing":
			return "playing";
		case "i_am_prepared":
			return "ready";
		case "resting":
		case "eating":
		case "suspended":
		case "exited":
			return "away";
		default:
			return "waiting";
	}
}

function playerStatusLabel(status: string): string {
	return status.replaceAll("_", " ");
}

export async function getSessionConsoleData(
	sessionId: string,
): Promise<SessionConsoleData | null> {
	const session = await db.queueSession.findUnique({
		where: { id: sessionId },
		select: {
			id: true,
			numCourts: true,
			matchDurationEstimateMinutes: true,
			matches: {
				include: {
					matchPlayers: {
						include: { player: { select: { name: true, id: true } } },
					},
				},
				orderBy: [{ status: "asc" }, { queuePosition: "asc" }],
			},
			registrations: {
				where: {
					admissionStatus: { in: ["accepted", "waitlisted", "reserved"] },
					playerStatus: { not: "exited" },
				},
				include: {
					player: { select: { name: true, avatarUrl: true, id: true } },
				},
			},
		},
	});

	if (!session) {
		return null;
	}

	const activeByCourt = new Map<number, (typeof session.matches)[number]>();
	for (const match of session.matches) {
		if (match.status === "active") {
			activeByCourt.set(match.courtNumber, match);
		}
	}

	const courts: CourtCardData[] = [];
	const inactiveCourts: CourtCardData[] = [];

	for (let n = 1; n <= session.numCourts; n++) {
		const match = activeByCourt.get(n);
		const label = `Court ${String(n).padStart(2, "0")}`;

		if (match) {
			const teamA = match.matchPlayers.filter((mp) => mp.team === "team_a");
			const teamB = match.matchPlayers.filter((mp) => mp.team === "team_b");
			courts.push({
				id: `court-${n}`,
				label,
				variant: "active",
				league: "Live",
				teamA: {
					names: formatTeamNames(teamA) || "Team A",
					score: match.teamAScore ?? 0,
				},
				teamB: {
					names: formatTeamNames(teamB) || "Team B",
					score: match.teamBScore ?? 0,
				},
				progress: 0.5,
			});
		} else {
			inactiveCourts.push({
				id: `court-${n}`,
				label,
				variant: "empty",
			});
		}
	}

	const queued = session.matches.filter((m) => m.status === "queued");
	const nextQueue: NextQueueItem[] = queued.map((match, index) => {
		const teamA = match.matchPlayers.filter((mp) => mp.team === "team_a");
		const teamB = match.matchPlayers.filter((mp) => mp.team === "team_b");
		const waitMinutes = (index + 1) * session.matchDurationEstimateMinutes;
		return {
			id: match.id,
			label: `Q-${String(index + 1).padStart(2, "0")}`,
			matchup: `${formatTeamNames(teamA) || "TBD"} vs ${formatTeamNames(teamB) || "TBD"}`,
			waitLabel: `WAIT: ${waitMinutes}M`,
		};
	});

	const roster: PlayerQueueCardData[] = session.registrations
		.filter((r) => r.admissionStatus === "accepted")
		.map((reg) => ({
			id: reg.playerId,
			name: reg.player.name,
			recordLabel: reg.admissionStatus,
			statusLabel: playerStatusLabel(reg.playerStatus),
			status: mapPlayerStatus(reg.playerStatus),
			disabled: reg.playerStatus === "exited",
		}));

	const winLoss = new Map<
		string,
		{ name: string; wins: number; losses: number }
	>();
	for (const match of session.matches) {
		if (match.status !== "completed" || !match.winningTeam) continue;
		for (const mp of match.matchPlayers) {
			const entry = winLoss.get(mp.playerId) ?? {
				name: mp.player.name,
				wins: 0,
				losses: 0,
			};
			const won =
				(match.winningTeam === "team_a" && mp.team === "team_a") ||
				(match.winningTeam === "team_b" && mp.team === "team_b");
			if (won) entry.wins += 1;
			else entry.losses += 1;
			winLoss.set(mp.playerId, entry);
		}
	}

	const standingRows: StandingRow[] = [...winLoss.values()]
		.map((stats) => ({
			rank: 0,
			name: stats.name,
			wins: stats.wins,
			losses: stats.losses,
			winPct:
				stats.wins + stats.losses > 0
					? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
					: 0,
		}))
		.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
		.map((row, index) => ({ ...row, rank: index + 1 }));

	const ledgerPlayers: SessionRosterPlayer[] = session.registrations.map(
		(reg) => ({
			id: reg.id,
			playerId: reg.playerId,
			displayName: reg.player.name,
			avatarUrl: reg.player.avatarUrl,
			admissionStatus: reg.admissionStatus,
			playerStatus: reg.playerStatus,
			paymentStatus: reg.paymentStatus,
			waitlistPosition: reg.waitlistPosition,
		}),
	);

	return {
		courts,
		inactiveCourts,
		nextQueue,
		roster,
		standingRows,
		ledgerPlayers,
	};
}
