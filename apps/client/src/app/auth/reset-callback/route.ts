import { type NextRequest, NextResponse } from "next/server";
import { createClientForOAuthResponse } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
	const success = NextResponse.redirect(
		new URL("/set-password?mode=reset", request.url),
	);
	const supabase = createClientForOAuthResponse(request, success);
	const tokenHash = request.nextUrl.searchParams.get("token_hash");
	const type = request.nextUrl.searchParams.get("type");
	const code = request.nextUrl.searchParams.get("code");

	let error: { message: string } | null = null;
	if (tokenHash && type === "recovery") {
		({ error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: "recovery",
		}));
	} else if (code) {
		({ error } = await supabase.auth.exchangeCodeForSession(code));
	} else {
		return NextResponse.redirect(
			new URL("/login?error=invalid_link", request.url),
		);
	}

	if (error) {
		console.error("[auth/reset-callback]", error.message);
		return NextResponse.redirect(
			new URL("/login?error=reset_expired", request.url),
		);
	}
	return success;
}
