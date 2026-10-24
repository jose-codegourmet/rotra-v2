export function normalizeEmail(email: string | undefined): string | null {
	const value = email?.trim().toLowerCase();
	if (!value) return null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
	return value;
}

export function normalizePassword(password: string | undefined): string | null {
	const value = password?.trim();
	if (!value) return null;
	return value;
}
