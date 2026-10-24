export interface GeocodingSuggestion {
	id: string;
	placeName: string;
	text: string;
	/** Mapbox center as [lng, lat] */
	center: [number, number];
}

interface MapboxGeocodingFeature {
	id: string;
	place_name: string;
	text: string;
	center: [number, number];
}

interface MapboxGeocodingResponse {
	features?: MapboxGeocodingFeature[];
}

const GEOCODE_TYPES = "region,place,locality,neighborhood,address,poi";

export async function forwardGeocode(
	query: string,
	token: string,
): Promise<GeocodingSuggestion[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const url = new URL(
		`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`,
	);
	url.searchParams.set("access_token", token);
	url.searchParams.set("types", GEOCODE_TYPES);
	url.searchParams.set("country", "PH");
	url.searchParams.set("limit", "5");

	try {
		const res = await fetch(url.toString());
		if (!res.ok) return [];

		const data = (await res.json()) as MapboxGeocodingResponse;
		return (data.features ?? []).map((feature) => ({
			id: feature.id,
			placeName: feature.place_name,
			text: feature.text,
			center: feature.center,
		}));
	} catch {
		return [];
	}
}

export interface GeocodedAddress {
	lat: number;
	lng: number;
	formattedAddress: string;
}

/** Server-side helper: geocode a single address/location query via Mapbox. */
export async function geocodeAddress(
	query: string,
): Promise<GeocodedAddress | null> {
	const trimmed = query.trim();
	if (!trimmed) return null;

	const token =
		process.env.MAPBOX_SECRET_TOKEN ??
		process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
		"";
	if (!token) return null;

	const results = await forwardGeocode(trimmed, token);
	const first = results[0];
	if (!first) return null;

	const [lng, lat] = first.center;
	return {
		lat,
		lng,
		formattedAddress: first.placeName,
	};
}

export async function reverseGeocode(
	lat: number,
	lng: number,
	token: string,
): Promise<string> {
	const url = new URL(
		`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
	);
	url.searchParams.set("access_token", token);
	url.searchParams.set("types", "address,poi,place");
	url.searchParams.set("country", "PH");
	url.searchParams.set("limit", "1");

	try {
		const res = await fetch(url.toString());
		if (!res.ok) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
		const data = (await res.json()) as MapboxGeocodingResponse;
		return (
			data.features?.[0]?.place_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
		);
	} catch {
		return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
	}
}
