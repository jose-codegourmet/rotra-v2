import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

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
		const registration = await db.sessionRegistration.findUnique({
			where: {
				sessionId_playerId: {
					sessionId,
					playerId: profile.id,
				},
			},
		});

		if (!registration) {
			return NextResponse.json(
				{ error: "You are not registered for this session." },
				{ status: 404 },
			);
		}

		if (registration.admissionStatus === "exited") {
			return NextResponse.json(
				{ error: "You have already left this session." },
				{ status: 409 },
			);
		}

		await db.sessionRegistration.update({
			where: {
				sessionId_playerId: {
					sessionId,
					playerId: profile.id,
				},
			},
			data: {
				playerStatus: "exited",
				admissionStatus: "exited",
			},
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[sessions/leave POST]", e);
		return NextResponse.json(
			{ error: "Failed to leave session." },
			{ status: 500 },
		);
	}
}
