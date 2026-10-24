import {
	db,
	getOwnPlayerProfile,
	PlayerProfileError,
	updateOwnPlayerName,
} from "@rotra/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { playerProfileErrorResponse } from "@/app/api/profile/route-helpers";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const patchOwnProfileSchema = z.object({
	name: z.string().trim().min(1, "Name is required."),
});

async function requireOwnProfileSession() {
	const profile = await getCurrentProfile();
	if (!profile) {
		throw new PlayerProfileError("not_found", "Unauthorized.");
	}
	return profile;
}

export async function GET() {
	try {
		const session = await requireOwnProfileSession();
		const profile = await getOwnPlayerProfile(db, session.id);

		let email = profile.email;
		if (!email) {
			try {
				const supabase = await createClient();
				const {
					data: { user },
				} = await supabase.auth.getUser();
				email = user?.email ?? null;
			} catch {
				email = null;
			}
		}

		return NextResponse.json({
			profile: {
				...profile,
				email,
			},
		});
	} catch (error) {
		if (error instanceof PlayerProfileError && error.code === "not_found") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		return playerProfileErrorResponse(error, "[profile me GET]");
	}
}

export async function PATCH(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body.", code: "bad_input" },
			{ status: 400 },
		);
	}

	const parsed = patchOwnProfileSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: parsed.error.issues[0]?.message ?? "Invalid request body.",
				code: "bad_input",
			},
			{ status: 400 },
		);
	}

	try {
		const session = await requireOwnProfileSession();
		const { name } = await updateOwnPlayerName(db, {
			profileId: session.id,
			name: parsed.data.name,
		});
		return NextResponse.json({ ok: true, profile: { name } });
	} catch (error) {
		if (error instanceof PlayerProfileError && error.code === "not_found") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		return playerProfileErrorResponse(error, "[profile me PATCH]");
	}
}
