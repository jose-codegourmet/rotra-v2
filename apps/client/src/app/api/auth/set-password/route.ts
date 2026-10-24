import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
	password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		);
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Password must be at least 8 characters." },
			{ status: 400 },
		);
	}

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "You must be signed in to set a password." },
				{ status: 401 },
			);
		}

		const { error } = await supabase.auth.updateUser({
			password: parsed.data.password,
		});

		if (error) {
			return NextResponse.json(
				{ error: error.message || "Unable to set password." },
				{ status: 400 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error("[set-password]", err);
		return NextResponse.json(
			{ error: "Unable to set password right now." },
			{ status: 500 },
		);
	}
}
