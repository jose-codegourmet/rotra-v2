import { db } from "@rotra/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

const submitPlaceSchema = z.object({
	name: z.string().min(2).max(120),
	address: z.string().max(200),
	latitude: z.number(),
	longitude: z.number(),
});

export async function POST(request: Request) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = submitPlaceSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid body" }, { status: 400 });
	}

	const place = await db.place.create({
		data: {
			name: parsed.data.name,
			address: parsed.data.address,
			latitude: parsed.data.latitude,
			longitude: parsed.data.longitude,
			status: "unreviewed",
			submittedById: profile.id,
		},
	});

	return NextResponse.json({ placeId: place.id });
}
