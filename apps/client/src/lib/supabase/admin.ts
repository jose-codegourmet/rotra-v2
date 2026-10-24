import { createClient } from "@supabase/supabase-js";

function supabaseAdminEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceRoleKey) {
		throw new Error(
			"Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
		);
	}
	return { url, serviceRoleKey };
}

function createSupabaseAdminClient() {
	const { url, serviceRoleKey } = supabaseAdminEnv();
	return createClient(url, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}

export async function deletePlayerAuthUser(userId: string): Promise<void> {
	const adminSupabase = createSupabaseAdminClient();
	const { error } = await adminSupabase.auth.admin.deleteUser(userId);
	if (error) {
		throw new Error(error.message);
	}
}
