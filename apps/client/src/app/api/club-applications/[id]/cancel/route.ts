import { ClubApplicationError, cancelClubApplication, db } from "@rotra/db";
import { NextResponse } from "next/server";

import { toClubApplicationDto } from "@/lib/api/club-application-mapper";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { id } = await context.params;
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let supabase: Awaited<ReturnType<typeof createClient>>;
	try {
		supabase = await createClient();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user || user.id !== profile.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const row = await cancelClubApplication(db, id, profile.id);
		return NextResponse.json({ application: toClubApplicationDto(row) });
	} catch (e) {
		if (e instanceof ClubApplicationError) {
			const status = e.code === "not_found" ? 404 : 409;
			return NextResponse.json({ error: e.message }, { status });
		}
		console.error("[club-applications cancel]", e);
		return NextResponse.json(
			{ error: "Failed to cancel application." },
			{ status: 500 },
		);
	}
}
