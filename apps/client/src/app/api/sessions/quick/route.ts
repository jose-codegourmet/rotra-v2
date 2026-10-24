import { db } from "@rotra/db";
import { NextResponse } from "next/server";

import { quickSessionFormSchema } from "@/components/modules/dashboard/quick-session-sheet/schema";
import { geocodeAddress } from "@/lib/geo/geocode";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const runtime = "nodejs";

export async function POST(request: Request) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const parsed = quickSessionFormSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid request body.", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const values = parsed.data;

	const clubId = values.clubId?.trim() || null;

	if (clubId) {
		const membership = await db.clubMember.findFirst({
			where: {
				clubId,
				playerId: profile.id,
				status: "active",
			},
		});

		if (!membership) {
			return NextResponse.json(
				{ error: "You are not a member of this club." },
				{ status: 403 },
			);
		}
	}

	// Clubless casual sessions have no club members to scope to, so they are
	// always open. Club-scoped sessions honor the chosen visibility.
	const visibility = clubId ? values.visibility : "open";

	const { venue } = values;

	const hasCoordinates = venue.latitude != null && venue.longitude != null;

	const geocoded = hasCoordinates
		? {
				lat: venue.latitude,
				lng: venue.longitude,
				formattedAddress: venue.address?.trim() ?? "",
			}
		: await geocodeAddress(venue.address?.trim() || venue.name.trim());

	const playersPerCourt = Number.parseInt(values.playersPerCourt, 10);
	const totalSlots = values.numCourts * playersPerCourt;

	const dateTime = new Date(`${values.date}T${values.startTime}:00`);
	const endTime = new Date(
		dateTime.getTime() + values.durationHours * 60 * 60 * 1000,
	);

	try {
		const session = await db.$transaction(async (tx) => {
			const created = await tx.queueSession.create({
				data: {
					clubId,
					hostId: profile.id,
					origin: "player_organized",
					scheduleType: null,
					status: "open",
					visibility,
					title: values.title.trim(),
					location: venue.name.trim(),
					address: venue.address?.trim() || null,
					venueLat: geocoded?.lat ?? null,
					venueLng: geocoded?.lng ?? null,
					venueAddress: geocoded?.formattedAddress ?? null,
					dateTime,
					endTime,
					numCourts: values.numCourts,
					playersPerCourt,
					totalSlots,
					matchFormat: values.matchFormat,
					scoreLimit: values.scoreLimit,
				},
			});

			await tx.sessionRegistration.create({
				data: {
					sessionId: created.id,
					playerId: profile.id,
					admissionStatus: "accepted",
					playerStatus: "not_arrived",
				},
			});

			return created;
		});

		return NextResponse.json({
			sessionId: session.id,
			href: `/find-sessions/${session.id}`,
		});
	} catch (e) {
		console.error("[sessions/quick POST]", e);
		return NextResponse.json(
			{ error: "Failed to create session." },
			{ status: 500 },
		);
	}
}
