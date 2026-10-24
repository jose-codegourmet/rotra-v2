import { NextResponse } from "next/server";

import { getAllOpenSessions } from "@/lib/api/session-discovery";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function GET() {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const sessions = await getAllOpenSessions(profile.id);
		return NextResponse.json({ sessions });
	} catch (e) {
		console.error("[sessions/available GET]", e);
		return NextResponse.json(
			{ error: "Failed to fetch available sessions." },
			{ status: 500 },
		);
	}
}
