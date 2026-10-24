import type { StyleSpecification } from "mapbox-gl";
import rotraDarkStyle from "@/mapbox/rotra-dark-style.json";

// Regional fallback — Philippines (Cebu City), NOT a US default
export const DEFAULT_MAP_CENTER = { lat: 10.3157, lng: 123.8854 };
export const DEFAULT_MAP_ZOOM = 12;
export const USER_LOCATION_ZOOM = 13;
export const DEFAULT_RADIUS_KM = 6;
export const MAX_RADIUS_KM = 50;

/** Version-controlled ROTRA dark style (Mapbox Style Spec v8). */
export const MAPBOX_STYLE = rotraDarkStyle as StyleSpecification;

/** Optional override — Mapbox Studio hosted style URL. */
export const MAPBOX_STYLE_URL =
	process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL ?? null;

/** Style object by default; env URL when set (e.g. Mapbox Studio hosted style). */
export function resolveMapboxStyle(): string | StyleSpecification {
	return MAPBOX_STYLE_URL ?? MAPBOX_STYLE;
}

export const DASHBOARD_VIEW_MODES = ["map", "list", "grid"] as const;
