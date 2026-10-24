import { db, deleteOwnPlayerProfile } from "@rotra/db";
import { NextResponse } from "next/server";
import { playerProfileErrorResponse } from "@/app/api/profile/route-helpers";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { deletePlayerAuthUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE() {
	try {
		const profile = await getCurrentProfile();
		if (!profile) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const profileId = profile.id;
		await deleteOwnPlayerProfile(db, { profileId });

		try {
			await deletePlayerAuthUser(profileId);
		} catch (err) {
			console.error("[profile me delete] auth user cleanup failed:", err);
			throw err;
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		return playerProfileErrorResponse(error, "[profile me delete]");
	}
}
