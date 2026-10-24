import { NextResponse } from "next/server";

import { getSessionRoster } from "@/lib/api/session-roster";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id: sessionId } = await context.params;

	try {
		const roster = await getSessionRoster(sessionId);
		if (!roster) {
			return NextResponse.json(
				{ error: "Session not found." },
				{ status: 404 },
			);
		}
		return NextResponse.json(roster);
	} catch (e) {
		console.error("[sessions/roster GET]", e);
		return NextResponse.json(
			{ error: "Failed to fetch roster." },
			{ status: 500 },
		);
	}
}
