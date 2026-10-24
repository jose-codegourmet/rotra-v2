import type { PublicProfileDto } from "@/types/public-profile";

export async function fetchProfile(userId: string): Promise<PublicProfileDto> {
	const res = await fetch(`/api/profile/${encodeURIComponent(userId)}`);
	if (res.status === 404) {
		throw new Error("Profile not found");
	}
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<PublicProfileDto>;
}
