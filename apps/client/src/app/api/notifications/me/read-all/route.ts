import { db, markAllNotificationsRead } from "@rotra/db";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function POST() {
	try {
		const profile = await getCurrentProfile();
		if (!profile) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { count } = await markAllNotificationsRead(db, {
			recipientId: profile.id,
		});

		return NextResponse.json({ ok: true, count });
	} catch (error) {
		console.error("[notifications me read-all POST]", error);
		return NextResponse.json(
			{ error: "Failed to mark notifications as read." },
			{ status: 500 },
		);
	}
}
