import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

const CLOSABLE_STATUSES = new Set(["draft", "open", "active"]);

export async function POST(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id: sessionId } = await context.params;

	try {
		const session = await db.queueSession.findUnique({
			where: { id: sessionId },
			select: { id: true, hostId: true, status: true },
		});

		if (!session) {
			return NextResponse.json(
				{ error: "Session not found." },
				{ status: 404 },
			);
		}

		if (session.hostId !== profile.id) {
			return NextResponse.json(
				{ error: "Only the session host can close this session." },
				{ status: 403 },
			);
		}

		if (!CLOSABLE_STATUSES.has(session.status)) {
			return NextResponse.json(
				{ error: "This session cannot be closed." },
				{ status: 409 },
			);
		}

		await db.queueSession.update({
			where: { id: sessionId },
			data: { status: "closed" },
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[sessions/close POST]", e);
		return NextResponse.json(
			{ error: "Failed to close session." },
			{ status: 500 },
		);
	}
}
