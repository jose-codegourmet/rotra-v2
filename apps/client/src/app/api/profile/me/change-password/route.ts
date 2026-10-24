import { NextResponse } from "next/server";
import { z } from "zod";
import { playerProfileErrorResponse } from "@/app/api/profile/route-helpers";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
	password: z.string().trim().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body.", code: "bad_input" },
			{ status: 400 },
		);
	}

	const parsed = changePasswordSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error:
					parsed.error.issues[0]?.message ??
					"Password must be at least 8 characters.",
				code: "bad_input",
			},
			{ status: 400 },
		);
	}

	try {
		const profile = await getCurrentProfile();
		if (!profile) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (
			user?.identities?.some((identity) => identity.provider === "facebook")
		) {
			return NextResponse.json(
				{
					error: "Password changes are managed by your sign-in provider.",
					code: "provider_managed",
				},
				{ status: 403 },
			);
		}
		const { error } = await supabase.auth.updateUser({
			password: parsed.data.password,
		});
		if (error) {
			const authError = error as Error & { status?: number };
			if (authError.status === 429) {
				return NextResponse.json(
					{
						error: "Too many attempts. Please wait before retrying.",
						code: "rate_limited",
					},
					{ status: 429 },
				);
			}
			return NextResponse.json(
				{
					error: "Unable to change password right now.",
					code: "change_password_failed",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			ok: true,
			message: "Password updated successfully.",
		});
	} catch (error) {
		return playerProfileErrorResponse(error, "[profile me change-password]");
	}
}
