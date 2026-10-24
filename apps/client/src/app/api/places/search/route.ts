import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
	if (q.length < 2) {
		return NextResponse.json({ places: [] });
	}

	const places = await db.place.findMany({
		where: {
			status: "confirmed",
			OR: [
				{ name: { contains: q, mode: "insensitive" } },
				{ address: { contains: q, mode: "insensitive" } },
			],
		},
		select: {
			id: true,
			name: true,
			address: true,
			latitude: true,
			longitude: true,
		},
		orderBy: { name: "asc" },
		take: 6,
	});

	return NextResponse.json({ places });
}
