import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

function supabaseEnv(): { url: string; anonKey: string } {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		throw new Error(
			"Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}
	return { url, anonKey };
}

/**
 * Supabase client for Route Handlers that return a `NextResponse` redirect.
 * Session cookies from `exchangeCodeForSession` must be written onto that response;
 * `cookies()` from `next/headers` does not reliably attach them to redirect responses.
 */
export function createClientForOAuthResponse(
	request: NextRequest,
	response: NextResponse,
) {
	const { url, anonKey } = supabaseEnv();

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					response.cookies.set(name, value, options);
				}
			},
		},
	});
}

export async function createClient() {
	const cookieStore = await cookies();

	const { url, anonKey } = supabaseEnv();

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch {
					// Called from a Server Component without mutable cookies; safe to ignore when middleware refreshes sessions.
				}
			},
		},
	});
}
