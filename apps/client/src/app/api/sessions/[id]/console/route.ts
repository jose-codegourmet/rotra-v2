import { NextResponse } from "next/server";

import { getSessionConsoleData } from "@/lib/api/session-console";
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
		const data = await getSessionConsoleData(sessionId);
		if (!data) {
			return NextResponse.json(
				{ error: "Session not found." },
				{ status: 404 },
			);
		}
		return NextResponse.json(data);
	} catch (e) {
		console.error("[sessions/console GET]", e);
		return NextResponse.json(
			{ error: "Failed to fetch session console." },
			{ status: 500 },
		);
	}
}
