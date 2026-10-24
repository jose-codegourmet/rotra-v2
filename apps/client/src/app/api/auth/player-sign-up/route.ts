import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureProfileRow } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
	email: z.string().trim().email("Enter a valid email address."),
	password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Invalid request." },
			{ status: 400 },
		);
	}

	try {
		const supabase = await createClient();
		const { data, error } = await supabase.auth.signUp({
			email: parsed.data.email.toLowerCase(),
			password: parsed.data.password,
		});
		if (error) {
			if (error.status === 429) {
				return NextResponse.json(
					{
						error: "Too many attempts. Please wait before retrying.",
						code: "RATE_LIMITED",
					},
					{ status: 429 },
				);
			}
			if (error.message.toLowerCase().includes("already registered")) {
				return NextResponse.json(
					{
						error:
							"An account with that email already exists. Sign in instead.",
						code: "EMAIL_TAKEN",
					},
					{ status: 409 },
				);
			}
			console.error("[player-sign-up]", error);
			return NextResponse.json(
				{ error: "Unable to create your account right now." },
				{ status: 500 },
			);
		}

		if (!data.session) {
			return NextResponse.json({ ok: true, needsConfirmation: true });
		}
		if (data.user) await ensureProfileRow(data.user);
		return NextResponse.json({ ok: true, redirectTo: "/onboarding" });
	} catch (error) {
		console.error("[player-sign-up]", error);
		return NextResponse.json(
			{ error: "Unable to create your account right now." },
			{ status: 500 },
		);
	}
}
