export type AuthResponse = {
	ok: boolean;
	error?: string;
	code?: string;
	redirectTo?: string;
	needsConfirmation?: boolean;
};

export class ClientAuthError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string | undefined,
		message: string,
	) {
		super(message);
		this.name = "ClientAuthError";
	}
}

async function postAuth<T extends AuthResponse>(
	path: string,
	input: Record<string, string | undefined>,
): Promise<T> {
	const response = await fetch(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});
	const body = (await response.json().catch(() => null)) as T | null;
	if (!response.ok || !body?.ok) {
		throw new ClientAuthError(
			response.status,
			body?.code,
			body?.error ?? "Unable to complete that request right now.",
		);
	}
	return body;
}

export function signUpPlayer(input: { email: string; password: string }) {
	return postAuth<AuthResponse & { ok: true }>(
		"/api/auth/player-sign-up",
		input,
	);
}

export function signInPlayer(input: {
	email: string;
	password: string;
	next?: string | undefined;
}) {
	return postAuth<AuthResponse & { ok: true; redirectTo: string }>(
		"/api/auth/player-sign-in",
		input,
	);
}

export function requestPasswordReset(input: { email: string }) {
	return postAuth<AuthResponse & { ok: true }>(
		"/api/auth/forgot-password",
		input,
	);
}
