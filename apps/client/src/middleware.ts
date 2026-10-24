import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

function copyCookies(from: NextResponse, to: NextResponse) {
	const setCookies = from.headers.getSetCookie?.() ?? [];
	if (setCookies.length > 0) {
		for (const cookie of setCookies) {
			to.headers.append("Set-Cookie", cookie);
		}
	} else {
		for (const cookie of from.cookies.getAll()) {
			to.cookies.set(cookie.name, cookie.value);
		}
	}
}

/** Paths that do not require a Supabase session (everything else redirects to /login when logged out). */
function isPublicPath(pathname: string): boolean {
	if (
		pathname === "/login" ||
		pathname.startsWith("/login/") ||
		pathname === "/sign-up" ||
		pathname === "/forgot-password"
	) {
		return true;
	}
	if (pathname.startsWith("/auth")) {
		return true;
	}
	if (
		pathname === "/privacy" ||
		pathname === "/terms" ||
		pathname === "/data-deletion"
	) {
		return true;
	}
	if (pathname.startsWith("/api")) {
		return true;
	}
	// Marketing / dev shell at root — allowed when logged out; logged-in users are sent to /dashboard below.
	if (pathname === "/") {
		return true;
	}
	return false;
}

export async function middleware(request: NextRequest) {
	const { response, user } = await updateSession(request);
	const url = request.nextUrl;

	const legacyAuthPath =
		url.pathname === "/login-admin" || url.pathname === "/login-tester";
	if (legacyAuthPath) {
		const target = new URL(request.url);
		target.pathname = "/login";
		const redirectResponse = NextResponse.redirect(target);
		copyCookies(response, redirectResponse);
		return redirectResponse;
	}
	if (url.pathname === "/login-tester/auth/accept-invite") {
		const target = new URL(request.url);
		target.pathname = "/auth/accept-invite";
		const redirectResponse = NextResponse.redirect(target);
		copyCookies(response, redirectResponse);
		return redirectResponse;
	}

	// When redirectTo isn't in Supabase "Redirect URLs", Supabase sends ?code= to Site URL (often "/").
	// Forward to our route handler so exchangeCodeForSession runs and cookies are set.
	if (url.pathname === "/" && url.searchParams.has("code")) {
		const code = url.searchParams.get("code");
		if (code) {
			const target = new URL(request.url);
			target.pathname = "/auth/callback";
			target.search = "";
			target.searchParams.set("code", code);
			const next = url.searchParams.get("next");
			if (next?.startsWith("/") && !next.startsWith("//")) {
				target.searchParams.set("next", next);
			} else {
				target.searchParams.set("next", "/dashboard");
			}
			const redirectResponse = NextResponse.redirect(target);
			copyCookies(response, redirectResponse);
			return redirectResponse;
		}
	}

	if (user) {
		if (
			url.pathname === "/login" ||
			url.pathname === "/sign-up" ||
			url.pathname === "/forgot-password"
		) {
			const dest = new URL("/dashboard", request.url);
			const redirectResponse = NextResponse.redirect(dest);
			copyCookies(response, redirectResponse);
			return redirectResponse;
		}
		if (url.pathname.startsWith("/login/")) {
			const dest = new URL("/dashboard", request.url);
			const redirectResponse = NextResponse.redirect(dest);
			copyCookies(response, redirectResponse);
			return redirectResponse;
		}
		if (url.pathname === "/") {
			const dest = new URL("/dashboard", request.url);
			const redirectResponse = NextResponse.redirect(dest);
			copyCookies(response, redirectResponse);
			return redirectResponse;
		}
		return response;
	}

	if (!isPublicPath(url.pathname)) {
		const loginUrl = new URL("/login", request.url);
		const returnPath = `${url.pathname}${url.search}`;
		if (returnPath !== "/login") {
			loginUrl.searchParams.set("next", returnPath);
		}
		const redirectResponse = NextResponse.redirect(loginUrl);
		copyCookies(response, redirectResponse);
		return redirectResponse;
	}

	return response;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
