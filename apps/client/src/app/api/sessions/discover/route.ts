import { type NextRequest, NextResponse } from "next/server";

import { DEFAULT_RADIUS_KM } from "@/constants/dashboard";
import { buildDiscoveryResponse } from "@/lib/api/session-discovery";
import { getCurrentProfile } from "@/lib/server/current-profile";
import type { SessionDiscoveryFilters } from "@/types/session-discovery";

export const runtime = "nodejs";

function parseFilters(searchParams: URLSearchParams): SessionDiscoveryFilters {
	const radiusKm = Number(searchParams.get("radiusKm") ?? DEFAULT_RADIUS_KM);
	const playersPerCourt = searchParams.get("playersPerCourt");
	const scheduleType = searchParams.get("scheduleType");
	const slotAvailability = searchParams.get("slotAvailability");
	const clubQuery = searchParams.get("clubQuery");
	const placeQuery = searchParams.get("placeQuery");
	const dateFrom = searchParams.get("dateFrom");
	const dateTo = searchParams.get("dateTo");

	const filters: SessionDiscoveryFilters = {
		radiusKm: Number.isFinite(radiusKm) ? radiusKm : DEFAULT_RADIUS_KM,
		weekendOnly: searchParams.get("weekendOnly") === "true",
	};

	if (clubQuery) filters.clubQuery = clubQuery;
	if (placeQuery) filters.placeQuery = placeQuery;
	if (dateFrom) filters.dateFrom = dateFrom;
	if (dateTo) filters.dateTo = dateTo;
	if (playersPerCourt) filters.playersPerCourt = Number(playersPerCourt);
	if (scheduleType === "mmr" || scheduleType === "fun_games") {
		filters.scheduleType = scheduleType;
	}
	if (slotAvailability === "full" || slotAvailability === "not_full") {
		filters.slotAvailability = slotAvailability;
	}

	return filters;
}

export async function GET(request: NextRequest) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = request.nextUrl;
	const lat = Number(searchParams.get("lat"));
	const lng = Number(searchParams.get("lng"));

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return NextResponse.json(
			{ error: "lat and lng are required" },
			{ status: 400 },
		);
	}

	const filters = parseFilters(searchParams);
	const { sessions, venueGroups } = await buildDiscoveryResponse(
		{ lat, lng },
		filters,
		profile.id,
	);

	return NextResponse.json({ sessions, venueGroups });
}
