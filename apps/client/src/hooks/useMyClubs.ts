"use client";

import { useQuery } from "@tanstack/react-query";

export type MyClub = {
	id: string;
	name: string;
};

export type MyClubsResponse = {
	clubs: MyClub[];
};

export const myClubsQueryKey = ["clubs", "mine"] as const;

async function fetchMyClubs(): Promise<MyClubsResponse> {
	const res = await fetch("/api/clubs/mine");
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<MyClubsResponse>;
}

export function useMyClubs() {
	return useQuery({
		queryKey: myClubsQueryKey,
		queryFn: fetchMyClubs,
	});
}
