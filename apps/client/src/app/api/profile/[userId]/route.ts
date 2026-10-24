import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const publicSelect = {
	id: true,
	name: true,
	avatarUrl: true,
	playingLevel: true,
	formatPreference: true,
	courtPosition: true,
	playMode: true,
	mmr: true,
	expTotal: true,
	onboardingCompleted: true,
	createdAt: true,
	updatedAt: true,
	tagsAssigned: {
		orderBy: { assignedAt: "desc" as const },
		select: {
			id: true,
			slug: true,
			label: true,
			assignedAt: true,
		},
	},
} as const;

export async function GET(
	_request: Request,
	context: { params: Promise<{ userId: string }> },
) {
	const { userId } = await context.params;

	let supabase: Awaited<ReturnType<typeof createClient>>;
	try {
		supabase = await createClient();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const row = await db.profile.findUnique({
		where: { id: userId },
		select: publicSelect,
	});

	if (!row) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	return NextResponse.json({
		id: row.id,
		name: row.name,
		avatarUrl: row.avatarUrl,
		playingLevel: row.playingLevel,
		formatPreference: row.formatPreference,
		courtPosition: row.courtPosition,
		playMode: row.playMode,
		mmr: row.mmr,
		expTotal: row.expTotal,
		onboardingCompleted: row.onboardingCompleted,
		tags: row.tagsAssigned.map((t) => ({
			id: t.id,
			slug: t.slug,
			label: t.label,
			assignedAt: t.assignedAt.toISOString(),
		})),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});
}
