"use server";

import { createClient } from "@/lib/supabase/server";

type StartFacebookSignInInput = {
	redirectOrigin: string;
};

export async function startFacebookSignInAction({
	redirectOrigin,
}: StartFacebookSignInInput) {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: "facebook",
		options: {
			redirectTo: `${redirectOrigin}/auth/callback?next=/dashboard`,
			scopes: "public_profile email",
		},
	});

	if (error || !data.url) {
		throw error ?? new Error("Login failed. Please try again.");
	}

	return data.url;
}
