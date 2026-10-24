import {
	ClubApplicationError,
	db,
	updatePendingClubApplication,
} from "@rotra/db";
import { NextResponse } from "next/server";

import { parseClubApplicationCreateBody } from "@/lib/api/club-application-body-parse";
import { toClubApplicationDto } from "@/lib/api/club-application-mapper";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

import type { ClubApplicationCreateBody } from "@/types/club-application";

export const runtime = "nodejs";

export async function PATCH(
	request: Request,
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

	let body: ClubApplicationCreateBody;
	try {
		body = (await request.json()) as ClubApplicationCreateBody;
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const parsed = parseClubApplicationCreateBody(body);
	if (!parsed.ok) {
		return NextResponse.json({ error: parsed.message }, { status: 400 });
	}

	try {
		const row = await updatePendingClubApplication(
			db,
			id,
			profile.id,
			parsed.data,
		);
		return NextResponse.json({ application: toClubApplicationDto(row) });
	} catch (e) {
		if (e instanceof ClubApplicationError) {
			const status =
				e.code === "not_found"
					? 404
					: e.code === "conflict"
						? 409
						: e.code === "bad_state"
							? 409
							: 400;
			return NextResponse.json({ error: e.message }, { status });
		}
		console.error("[club-applications PATCH]", e);
		return NextResponse.json(
			{ error: "Failed to update application." },
			{ status: 500 },
		);
	}
}
