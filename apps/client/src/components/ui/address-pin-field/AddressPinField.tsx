"use client";

/**
 * Mapbox-backed location picker. Consumers in Next.js App Router pages should
 * load this component with `next/dynamic` and `{ ssr: false }`.
 *
 * `"use client"` alone is not enough: App Router still server-renders client
 * components for the initial HTML pass. `react-map-gl` / Mapbox GL need `window`,
 * WebGL, and a real DOM node, so SSR often throws (`window is not defined`) or
 * causes hydration mismatches. `dynamic(..., { ssr: false })` skips server render
 * and mounts the map only in the browser.
 */

import { Loader2, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MapboxMap, { type MapRef, Marker } from "react-map-gl/mapbox";
import { Input } from "@/components/ui/input/Input";
import { Label } from "@/components/ui/label/Label";
import { resolveMapboxStyle } from "@/constants/dashboard";
import {
	forwardGeocode,
	type GeocodingSuggestion,
	reverseGeocode,
} from "@/lib/geo/geocode";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER = { latitude: 10.3157, longitude: 123.8854 };
const DEFAULT_ZOOM = 11;
const PIN_ZOOM = 15;
const DEBOUNCE_MS = 300;

export interface AddressPinValue {
	name: string;
	address: string;
	latitude: number;
	longitude: number;
}

interface AddressPinFieldProps {
	value?: AddressPinValue | null;
	onChange: (value: AddressPinValue | null) => void;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}

function hasCoordinates(
	value: AddressPinValue | null | undefined,
): value is AddressPinValue {
	return (
		value != null &&
		Number.isFinite(value.latitude) &&
		Number.isFinite(value.longitude)
	);
}

export function AddressPinField({
	value,
	onChange,
	label = "Location",
	placeholder = "Search address or place…",
	disabled = false,
	className,
}: AddressPinFieldProps) {
	const mapRef = useRef<MapRef>(null);
	const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

	const [nameDraft, setNameDraft] = useState(value?.name ?? "");
	const [addressQuery, setAddressQuery] = useState(value?.address ?? "");
	const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);

	const debouncedAddressQuery = useDebouncedValue(addressQuery, DEBOUNCE_MS);
	const pinSet = hasCoordinates(value);

	useEffect(() => {
		setNameDraft(value?.name ?? "");
		setAddressQuery(value?.address ?? "");
	}, [value?.name, value?.address]);

	const flyTo = useCallback((latitude: number, longitude: number) => {
		mapRef.current?.flyTo({
			center: [longitude, latitude],
			zoom: PIN_ZOOM,
			duration: 1000,
			essential: true,
		});
	}, []);

	const applyCoordinates = useCallback(
		async (latitude: number, longitude: number, address?: string) => {
			if (!token || disabled) return;

			setIsReverseGeocoding(true);
			const resolvedAddress =
				address ?? (await reverseGeocode(latitude, longitude, token));
			setIsReverseGeocoding(false);
			setAddressQuery(resolvedAddress);
			setSuggestions([]);
			setShowSuggestions(false);
			onChange({
				name: nameDraft,
				address: resolvedAddress,
				latitude,
				longitude,
			});
			flyTo(latitude, longitude);
		},
		[disabled, flyTo, nameDraft, onChange, token],
	);

	useEffect(() => {
		if (disabled) {
			setSuggestions([]);
			setIsSearching(false);
			return;
		}

		const query = debouncedAddressQuery.trim();
		if (!query || !token) {
			setSuggestions([]);
			setIsSearching(false);
			return;
		}

		if (pinSet && query === value.address) {
			setSuggestions([]);
			setIsSearching(false);
			return;
		}

		let cancelled = false;
		setIsSearching(true);

		void forwardGeocode(query, token).then((results) => {
			if (cancelled) return;
			setSuggestions(results);
			setIsSearching(false);
			if (results.length > 0) {
				setShowSuggestions(true);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [debouncedAddressQuery, disabled, pinSet, token, value?.address]);

	const handleSuggestionSelect = useCallback(
		(suggestion: GeocodingSuggestion) => {
			const [longitude, latitude] = suggestion.center;
			void applyCoordinates(latitude, longitude, suggestion.placeName);
		},
		[applyCoordinates],
	);

	const handleMapClick = useCallback(
		(event: { lngLat: { lat: number; lng: number } }) => {
			if (disabled) return;
			const { lat, lng } = event.lngLat;
			void applyCoordinates(lat, lng);
		},
		[applyCoordinates, disabled],
	);

	const handleMarkerDragEnd = useCallback(
		(event: { lngLat: { lat: number; lng: number } }) => {
			if (disabled) return;
			const { lat, lng } = event.lngLat;
			void applyCoordinates(lat, lng);
		},
		[applyCoordinates, disabled],
	);

	const handleNameChange = (nextName: string) => {
		setNameDraft(nextName);
		if (pinSet) {
			onChange({ ...value, name: nextName });
		}
	};

	const handleClear = () => {
		setNameDraft("");
		setAddressQuery("");
		setSuggestions([]);
		setShowSuggestions(false);
		onChange(null);
	};

	const mapLatitude = pinSet ? value.latitude : DEFAULT_CENTER.latitude;
	const mapLongitude = pinSet ? value.longitude : DEFAULT_CENTER.longitude;

	if (!token) {
		return (
			<div className={cn("space-y-2", className)}>
				<Label>{label}</Label>
				<div className="rounded-xl border border-border bg-bg-elevated p-4 text-body text-text-secondary">
					Set <code className="text-accent">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
					enable location picking.
				</div>
			</div>
		);
	}

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center justify-between gap-2">
				<Label>{label}</Label>
				{pinSet && !disabled && (
					<button
						type="button"
						onClick={handleClear}
						className="text-label text-text-secondary transition-colors hover:text-text-primary"
					>
						Clear location
					</button>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="address-pin-name" className="text-text-secondary">
					Name
				</Label>
				<Input
					id="address-pin-name"
					value={nameDraft}
					onChange={(event) => handleNameChange(event.target.value)}
					placeholder="Venue name"
					disabled={disabled}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="address-pin-search" className="text-text-secondary">
					Address
				</Label>
				<div className="relative">
					<Input
						id="address-pin-search"
						value={addressQuery}
						onChange={(event) => setAddressQuery(event.target.value)}
						onFocus={() => {
							if (suggestions.length > 0) {
								setShowSuggestions(true);
							}
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" && suggestions[0]) {
								handleSuggestionSelect(suggestions[0]);
							}
						}}
						placeholder={placeholder}
						disabled={disabled}
						className="pr-10"
					/>
					{(isSearching || isReverseGeocoding) && (
						<Loader2
							size={16}
							className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-accent"
							aria-hidden
						/>
					)}
					{showSuggestions && suggestions.length > 0 && !disabled && (
						<ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-bg-base shadow-lg">
							{suggestions.map((suggestion) => (
								<li key={suggestion.id}>
									<button
										type="button"
										onClick={() => handleSuggestionSelect(suggestion)}
										className="flex w-full items-start gap-2 px-3 py-2 text-left text-body text-text-primary hover:bg-bg-elevated"
									>
										<MapPin
											size={14}
											className="mt-0.5 shrink-0 text-accent"
											aria-hidden
										/>
										<span className="truncate">{suggestion.placeName}</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{!pinSet && (
				<p className="text-label text-text-secondary">
					No location set. Search for an address or pick a point on the map.
				</p>
			)}

			<div className="overflow-hidden rounded-xl border border-border">
				<MapboxMap
					ref={mapRef}
					mapboxAccessToken={token}
					initialViewState={{
						longitude: mapLongitude,
						latitude: mapLatitude,
						zoom: pinSet ? PIN_ZOOM : DEFAULT_ZOOM,
					}}
					style={{ width: "100%", height: 280 }}
					mapStyle={resolveMapboxStyle()}
					attributionControl={false}
					onClick={handleMapClick}
					cursor={disabled ? "default" : "crosshair"}
				>
					{pinSet && (
						<Marker
							longitude={value.longitude}
							latitude={value.latitude}
							anchor="bottom"
							draggable={!disabled}
							onDragEnd={handleMarkerDragEnd}
						>
							<MapPin
								size={32}
								className="text-accent drop-shadow-md"
								fill="currentColor"
								strokeWidth={1.5}
								aria-hidden
							/>
						</Marker>
					)}
				</MapboxMap>
			</div>
		</div>
	);
}
