import type {
	ClubApplicationCreateBody,
	ClubApplicationDto,
} from "@/types/club-application";

export type MyClubApplicationResponse = {
	pending: ClubApplicationDto | null;
	/** Most recent rejected row when the player has no pending application. */
	lastRejected: ClubApplicationDto | null;
};

export async function fetchMyPendingClubApplication(): Promise<MyClubApplicationResponse> {
	const res = await fetch("/api/club-applications/me");
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<MyClubApplicationResponse>;
}

export async function createClubApplication(
	body: ClubApplicationCreateBody,
): Promise<{ application: ClubApplicationDto }> {
	const res = await fetch("/api/club-applications/me", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = (await res.json().catch(() => null)) as {
		error?: string;
		application?: ClubApplicationDto;
	} | null;
	if (!res.ok) {
		throw new Error(data?.error ?? `Request failed (${res.status})`);
	}
	if (!data?.application) {
		throw new Error("Invalid response from server.");
	}
	return { application: data.application };
}

export async function updateClubApplication(
	id: string,
	body: ClubApplicationCreateBody,
): Promise<{ application: ClubApplicationDto }> {
	const res = await fetch(`/api/club-applications/${encodeURIComponent(id)}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = (await res.json().catch(() => null)) as {
		error?: string;
		application?: ClubApplicationDto;
	} | null;
	if (!res.ok) {
		throw new Error(data?.error ?? `Request failed (${res.status})`);
	}
	if (!data?.application) {
		throw new Error("Invalid response from server.");
	}
	return { application: data.application };
}

export async function cancelClubApplication(
	id: string,
): Promise<{ application: ClubApplicationDto }> {
	const res = await fetch(
		`/api/club-applications/${encodeURIComponent(id)}/cancel`,
		{ method: "POST" },
	);
	const data = (await res.json().catch(() => null)) as {
		error?: string;
		application?: ClubApplicationDto;
	} | null;
	if (!res.ok) {
		throw new Error(data?.error ?? `Request failed (${res.status})`);
	}
	if (!data?.application) {
		throw new Error("Invalid response from server.");
	}
	return { application: data.application };
}
