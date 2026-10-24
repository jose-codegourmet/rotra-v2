import { ClubApplicationError, createClubApplication, db } from "@rotra/db";
import { NextResponse } from "next/server";

import { parseClubApplicationCreateBody } from "@/lib/api/club-application-body-parse";
import { toClubApplicationDto } from "@/lib/api/club-application-mapper";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

import type { ClubApplicationCreateBody } from "@/types/club-application";

export const runtime = "nodejs";

export async function GET() {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const pending = await db.clubApplication.findFirst({
		where: { playerId: profile.id, status: "pending" },
	});

	let lastRejected = null;
	if (!pending) {
		const rejected = await db.clubApplication.findFirst({
			where: { playerId: profile.id, status: "rejected" },
			orderBy: { updatedAt: "desc" },
		});
		lastRejected = rejected ? toClubApplicationDto(rejected) : null;
	}

	return NextResponse.json({
		pending: pending ? toClubApplicationDto(pending) : null,
		lastRejected,
	});
}

export async function POST(request: Request) {
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
		const row = await createClubApplication(db, profile.id, parsed.data);
		return NextResponse.json({ application: toClubApplicationDto(row) });
	} catch (e) {
		if (e instanceof ClubApplicationError && e.code === "conflict") {
			return NextResponse.json({ error: e.message }, { status: 409 });
		}
		console.error("[club-applications POST]", e);
		return NextResponse.json(
			{ error: "Failed to create application." },
			{ status: 500 },
		);
	}
}
