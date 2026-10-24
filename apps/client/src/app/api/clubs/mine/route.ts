import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function GET() {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const memberships = await db.clubMember.findMany({
		where: {
			playerId: profile.id,
			status: "active",
		},
		include: {
			club: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: {
			joinedAt: "asc",
		},
	});

	const clubs = memberships.map((membership) => ({
		id: membership.club.id,
		name: membership.club.name,
	}));

	return NextResponse.json({ clubs });
}
