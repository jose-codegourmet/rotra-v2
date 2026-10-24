import { NextResponse } from "next/server";

import { getSessionLiveContext } from "@/lib/api/session-live";
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
		const sessionLive = await getSessionLiveContext(sessionId, profile.id);

		if (!sessionLive) {
			return NextResponse.json(
				{ error: "Session not found." },
				{ status: 404 },
			);
		}

		return NextResponse.json(sessionLive);
	} catch (e) {
		console.error("[sessions/live GET]", e);
		return NextResponse.json(
			{ error: "Failed to fetch session." },
			{ status: 500 },
		);
	}
}
