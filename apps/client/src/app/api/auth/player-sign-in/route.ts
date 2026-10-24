import { db, markTesterInvitationAccepted } from "@rotra/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/safe-next";
import { ensureProfileRow } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
	email: z.string().trim().email(),
	password: z.string().min(1),
	next: z.string().optional(),
});

export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Incorrect email or password." },
			{ status: 401 },
		);
	}

	try {
		const supabase = await createClient();
		const { data, error } = await supabase.auth.signInWithPassword({
			email: parsed.data.email.toLowerCase(),
			password: parsed.data.password,
		});
		if (error?.status === 429) {
			return NextResponse.json(
				{
					error: "Too many attempts. Please wait before retrying.",
					code: "RATE_LIMITED",
				},
				{ status: 429 },
			);
		}
		if (error || !data.user) {
			return NextResponse.json(
				{ error: "Incorrect email or password." },
				{ status: 401 },
			);
		}

		const profile = await ensureProfileRow(data.user);
		if (profile.isTesterAccount) {
			await markTesterInvitationAccepted(db, profile.id);
		}
		const fallback =
			profile.adminRole && profile.adminIsActive
				? "/dashboard"
				: profile.isTesterAccount
					? "/home"
					: profile.onboardingCompleted
						? "/dashboard"
						: "/onboarding";
		return NextResponse.json({
			ok: true,
			redirectTo: safeNextPath(parsed.data.next, fallback),
		});
	} catch (error) {
		console.error("[player-sign-in]", error);
		return NextResponse.json(
			{ error: "Unable to sign in right now." },
			{ status: 500 },
		);
	}
}
