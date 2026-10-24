"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MAP_CENTER } from "@/constants/dashboard";
import type { SessionGeoPoint } from "@/types/session-discovery";

export type GeolocationStatus =
	| "idle"
	| "loading"
	| "granted"
	| "denied"
	| "unsupported";

const GEO_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 12_000,
	maximumAge: 60_000,
};

const CEBU_FALLBACK_LABEL = "Cebu City";

async function reverseGeocodeLabel(
	point: SessionGeoPoint,
): Promise<string | null> {
	const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
	if (!token) return null;

	const url = new URL(
		`https://api.mapbox.com/geocoding/v5/mapbox.places/${point.lng},${point.lat}.json`,
	);
	url.searchParams.set("access_token", token);
	url.searchParams.set("types", "place,locality,neighborhood");
	url.searchParams.set("limit", "1");

	try {
		const res = await fetch(url.toString());
		if (!res.ok) return null;
		const data = (await res.json()) as {
			features?: Array<{ place_name?: string; text?: string }>;
		};
		const feature = data.features?.[0];
		return feature?.text ?? feature?.place_name ?? null;
	} catch {
		return null;
	}
}

export function useGeolocation() {
	const [center, setCenter] = useState<SessionGeoPoint>(DEFAULT_MAP_CENTER);
	const [status, setStatus] = useState<GeolocationStatus>("idle");
	const [locationLabel, setLocationLabel] = useState(CEBU_FALLBACK_LABEL);
	const [isUserLocation, setIsUserLocation] = useState(false);

	const resolveLabel = useCallback(
		async (point: SessionGeoPoint, granted: boolean) => {
			if (granted) {
				const label = await reverseGeocodeLabel(point);
				setLocationLabel(label ?? "Your location");
				return;
			}
			setLocationLabel(CEBU_FALLBACK_LABEL);
		},
		[],
	);

	const requestPosition = useCallback(() => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setStatus("unsupported");
			setCenter(DEFAULT_MAP_CENTER);
			setIsUserLocation(false);
			void resolveLabel(DEFAULT_MAP_CENTER, false);
			return;
		}

		setStatus("loading");

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const point = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				};
				setCenter(point);
				setStatus("granted");
				setIsUserLocation(true);
				void resolveLabel(point, true);
			},
			() => {
				setCenter(DEFAULT_MAP_CENTER);
				setStatus("denied");
				setIsUserLocation(false);
				void resolveLabel(DEFAULT_MAP_CENTER, false);
			},
			GEO_OPTIONS,
		);
	}, [resolveLabel]);

	useEffect(() => {
		requestPosition();
	}, [requestPosition]);

	return {
		center,
		status,
		locationLabel,
		isUserLocation,
		refresh: requestPosition,
	};
}
