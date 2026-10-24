import { type NextRequest, NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-next";
import { createClientForOAuthResponse } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
	const url = request.nextUrl;
	const oauthError = url.searchParams.get("error");
	if (oauthError) {
		const desc = url.searchParams.get("error_description") ?? "";
		const login = new URL("/login", request.url);
		login.searchParams.set("error", "oauth");
		if (desc) {
			login.searchParams.set("details", desc.slice(0, 200));
		}
		return NextResponse.redirect(login);
	}

	const code = url.searchParams.get("code");
	const next = safeNextPath(url.searchParams.get("next"));

	if (!code) {
		return NextResponse.redirect(new URL("/login?error=auth", request.url));
	}

	const redirectTarget = new URL(next, request.url);
	const response = NextResponse.redirect(redirectTarget);

	const supabase = createClientForOAuthResponse(request, response);
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		console.error("[auth/callback] exchangeCodeForSession:", error.message);
		const login = new URL("/login", request.url);
		login.searchParams.set("error", "auth");
		if (process.env.NODE_ENV === "development") {
			login.searchParams.set("reason", encodeURIComponent(error.message));
		}
		return NextResponse.redirect(login);
	}

	return response;
}
