import { NextResponse } from "next/server";

import { getUserSessions } from "@/lib/api/user-sessions";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function GET() {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const data = await getUserSessions(profile.id);
		return NextResponse.json(data);
	} catch (e) {
		console.error("[sessions/my GET]", e);
		return NextResponse.json(
			{ error: "Failed to fetch sessions." },
			{ status: 500 },
		);
	}
}
