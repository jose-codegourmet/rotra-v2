"use client";

import { useCallback, useEffect, useRef } from "react";
import MapboxMap, {
	Layer,
	type MapRef,
	Marker,
	Popup,
	Source,
} from "react-map-gl/mapbox";
import { resolveMapboxStyle, USER_LOCATION_ZOOM } from "@/constants/dashboard";
import type {
	SessionGeoPoint,
	VenueSessionGroup,
} from "@/types/session-discovery";
import { VenuePin } from "./VenuePin";
import { VenuePinTooltip } from "./VenuePinTooltip";

function createRadiusCircle(center: SessionGeoPoint, radiusKm: number) {
	const points = 64;
	const coords: [number, number][] = [];
	const distX = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
	const distY = radiusKm / 110.574;

	for (let i = 0; i <= points; i++) {
		const theta = (i / points) * 2 * Math.PI;
		coords.push([
			center.lng + distX * Math.cos(theta),
			center.lat + distY * Math.sin(theta),
		]);
	}

	return {
		type: "Feature" as const,
		geometry: { type: "Polygon" as const, coordinates: [coords] },
		properties: {},
	};
}

function UserLocationMarker({ location }: { location: SessionGeoPoint }) {
	return (
		<Marker longitude={location.lng} latitude={location.lat} anchor="center">
			<div className="relative flex items-center justify-center">
				<span className="absolute h-8 w-8 animate-ping rounded-full bg-accent opacity-20" />
				<span className="relative h-4 w-4 rounded-full border-2 border-white bg-accent shadow-md" />
			</div>
		</Marker>
	);
}

interface DashboardMapProps {
	venueGroups: VenueSessionGroup[];
	center: SessionGeoPoint;
	userLocation?: SessionGeoPoint;
	radiusKm?: number;
	zoom?: number;
	selectedVenueKey: string | null;
	onSelectVenue: (venueKey: string | null) => void;
	onOpenVenueModal: (venueKey: string) => void;
	onJoinSession: (sessionId: string) => void;
	flyToUserLocation?: boolean;
	flyToCenter?: SessionGeoPoint;
	onMapError?: () => void;
}

export function DashboardMap({
	venueGroups,
	center,
	userLocation,
	radiusKm,
	zoom = USER_LOCATION_ZOOM,
	selectedVenueKey,
	onSelectVenue,
	onOpenVenueModal,
	onJoinSession,
	flyToUserLocation = false,
	flyToCenter,
	onMapError,
}: DashboardMapProps) {
	const mapRef = useRef<MapRef>(null);
	const lastFlyToCenterRef = useRef<SessionGeoPoint | null>(null);
	const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

	const selectedGroup = venueGroups.find(
		(group) => group.venueKey === selectedVenueKey,
	);

	const clearOpenTimer = useCallback(() => {
		if (openTimerRef.current) {
			clearTimeout(openTimerRef.current);
			openTimerRef.current = null;
		}
	}, []);

	const clearCloseTimer = useCallback(() => {
		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	}, []);

	const scheduleOpen = useCallback(
		(venueKey: string) => {
			clearCloseTimer();
			clearOpenTimer();
			openTimerRef.current = setTimeout(() => onSelectVenue(venueKey), 100);
		},
		[clearCloseTimer, clearOpenTimer, onSelectVenue],
	);

	const scheduleClose = useCallback(() => {
		clearOpenTimer();
		clearCloseTimer();
		closeTimerRef.current = setTimeout(() => onSelectVenue(null), 200);
	}, [clearCloseTimer, clearOpenTimer, onSelectVenue]);

	const cancelClose = useCallback(() => {
		clearCloseTimer();
	}, [clearCloseTimer]);

	useEffect(() => {
		return () => {
			clearOpenTimer();
			clearCloseTimer();
		};
	}, [clearCloseTimer, clearOpenTimer]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !flyToUserLocation) return;

		map.flyTo({
			center: [center.lng, center.lat],
			zoom,
			duration: 1200,
			essential: true,
		});
	}, [center.lat, center.lng, zoom, flyToUserLocation]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !flyToCenter) return;

		const prev = lastFlyToCenterRef.current;
		if (prev && prev.lat === flyToCenter.lat && prev.lng === flyToCenter.lng) {
			return;
		}

		lastFlyToCenterRef.current = flyToCenter;
		map.flyTo({
			center: [flyToCenter.lng, flyToCenter.lat],
			zoom: USER_LOCATION_ZOOM,
			duration: 1200,
			essential: true,
		});
	}, [flyToCenter]);

	if (!token) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-bg-elevated p-8 text-center">
				<div>
					<p className="text-small font-bold uppercase tracking-widest text-text-primary">
						Map unavailable
					</p>
					<p className="mt-2 text-body text-text-secondary">
						Set <code className="text-accent">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
						enable the discovery map.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			<MapboxMap
				ref={mapRef}
				mapboxAccessToken={token}
				initialViewState={{
					longitude: center.lng,
					latitude: center.lat,
					zoom,
				}}
				style={{ width: "100%", height: "100%" }}
				mapStyle={resolveMapboxStyle()}
				attributionControl={false}
				reuseMaps
				onClick={() => onSelectVenue(null)}
				onMoveStart={() => onSelectVenue(null)}
				onError={() => onMapError?.()}
			>
				{radiusKm ? (
					<Source
						id="radius-circle"
						type="geojson"
						data={createRadiusCircle(center, radiusKm)}
					>
						{/* Mapbox GL paint props require resolved hex/rgba; CSS vars are not interpolated. */}
						<Layer
							id="radius-circle-fill"
							type="fill"
							paint={{ "fill-color": "#00cc6a", "fill-opacity": 0.06 }}
						/>
						<Layer
							id="radius-circle-border"
							type="line"
							paint={{
								"line-color": "#00cc6a",
								"line-width": 1.5,
								"line-opacity": 0.5,
							}}
						/>
					</Source>
				) : null}

				{userLocation ? <UserLocationMarker location={userLocation} /> : null}

				{venueGroups.map((group) => (
					<VenuePin
						key={group.venueKey}
						group={group}
						isSelected={selectedVenueKey === group.venueKey}
						onSelect={onSelectVenue}
						onHoverStart={scheduleOpen}
						onHoverEnd={scheduleClose}
					/>
				))}

				{selectedGroup && (
					<Popup
						longitude={selectedGroup.coordinates.lng}
						latitude={selectedGroup.coordinates.lat}
						anchor="bottom"
						offset={24}
						closeButton={false}
						closeOnClick={false}
						className="venue-pin-popup"
						maxWidth="none"
						onClose={() => onSelectVenue(null)}
					>
						<VenuePinTooltip
							group={selectedGroup}
							onJoin={onJoinSession}
							onOpenModal={() => onOpenVenueModal(selectedGroup.venueKey)}
							onMouseEnter={cancelClose}
							onMouseLeave={scheduleClose}
						/>
					</Popup>
				)}
			</MapboxMap>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,136,0.05)_0%,transparent_70%)]" />
		</div>
	);
}
