import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ email: z.string().trim().email() });
const success = {
	ok: true,
	message: "If that email has a ROTRA account, we sent a reset link.",
};

export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json(success);

	try {
		const supabase = await createClient();
		const origin = new URL(request.url).origin;
		const { error } = await supabase.auth.resetPasswordForEmail(
			parsed.data.email.toLowerCase(),
			{ redirectTo: `${origin}/auth/reset-callback` },
		);
		if (error) console.error("[forgot-password]", error);
	} catch (error) {
		console.error("[forgot-password]", error);
	}

	return NextResponse.json(success);
}
