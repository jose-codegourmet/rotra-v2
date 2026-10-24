import { NextResponse } from "next/server";

import { MOCK_SESSION_DISCOVERY } from "@/constants/mock-session-discovery";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

const JOINABLE_STATUSES = new Set(["open", "active"]);

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;
	const session = MOCK_SESSION_DISCOVERY.find((item) => item.id === id);

	if (!session) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	if (!JOINABLE_STATUSES.has(session.status)) {
		return NextResponse.json(
			{ error: "Session unavailable", joinable: false, status: session.status },
			{ status: 410 },
		);
	}

	return NextResponse.json({
		id: session.id,
		status: session.status,
		joinable: true,
	});
}
