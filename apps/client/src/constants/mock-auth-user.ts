import type { User } from "@supabase/supabase-js";

const baseAuthUser: Partial<User> = {
	id: "00000000-0000-0000-0000-000000000001",
	email: "admin@rotra.app",
	app_metadata: {},
	user_metadata: {},
	aud: "authenticated",
	created_at: "2026-01-01T00:00:00.000Z",
};

export const MOCK_AUTH_USER = baseAuthUser as User;

export const MOCK_AUTH_USER_WITH_NAME = {
	...MOCK_AUTH_USER,
	user_metadata: {
		full_name: "ROTRA Platform Admin",
	},
} as User;
