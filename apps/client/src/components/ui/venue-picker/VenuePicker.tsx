"use client";

import { ArrowLeft, Loader2, MapPin, Pin, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { AddressPinValue } from "@/components/ui/address-pin-field/AddressPinField";
import { Input } from "@/components/ui/input/Input";
import { cn } from "@/lib/utils";

const AddressPinField = dynamic(
	() =>
		import("@/components/ui/address-pin-field/AddressPinField").then(
			(m) => m.AddressPinField,
		),
	{
		ssr: false,
		loading: () => (
			<div className="h-[340px] animate-pulse rounded-xl bg-bg-elevated" />
		),
	},
);

const DEBOUNCE_MS = 300;

export interface VenuePickerValue {
	name: string;
	address?: string | undefined;
	latitude?: number | null | undefined;
	longitude?: number | null | undefined;
	/** Set when user picks from confirmed places DB */
	placeId?: string | undefined;
	/** Set when user pins a brand-new location not yet in DB */
	isNewSubmission?: boolean | undefined;
}

interface VenuePickerProps {
	value?: VenuePickerValue | null;
	onChange: (value: VenuePickerValue | null) => void;
	disabled?: boolean;
	className?: string;
}

type PickerMode = "search" | "pin";

type SearchPlace = {
	id: string;
	name: string;
	address: string;
	latitude: number;
	longitude: number;
};

const EMPTY_VENUE: VenuePickerValue = {
	name: "",
	address: "",
	latitude: null,
	longitude: null,
	isNewSubmission: false,
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}

function truncateAddress(address: string, maxLen = 48): string {
	if (address.length <= maxLen) return address;
	return `${address.slice(0, maxLen)}…`;
}

function hasCoordinates(
	value: VenuePickerValue | null | undefined,
): value is VenuePickerValue & { latitude: number; longitude: number } {
	return (
		value != null &&
		value.latitude != null &&
		value.longitude != null &&
		Number.isFinite(value.latitude) &&
		Number.isFinite(value.longitude)
	);
}

function hasSelection(value: VenuePickerValue | null | undefined): boolean {
	if (!value || value.name.trim().length < 2) return false;
	if (value.placeId) return true;
	return hasCoordinates(value);
}

export function VenuePicker({
	value,
	onChange,
	disabled = false,
	className,
}: VenuePickerProps) {
	const [mode, setMode] = useState<PickerMode>("search");
	const [searchQuery, setSearchQuery] = useState("");
	const [places, setPlaces] = useState<SearchPlace[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);

	const debouncedQuery = useDebouncedValue(searchQuery, DEBOUNCE_MS);
	const selected = hasSelection(value);
	const isNewVenue = value?.isNewSubmission === true;

	const resetToSearch = useCallback(() => {
		setMode("search");
		setSearchQuery("");
		setPlaces([]);
		setShowDropdown(false);
	}, []);

	const handleClear = useCallback(() => {
		onChange(EMPTY_VENUE);
		resetToSearch();
	}, [onChange, resetToSearch]);

	const handlePlaceSelect = useCallback(
		(place: SearchPlace) => {
			onChange({
				name: place.name,
				address: place.address,
				latitude: place.latitude,
				longitude: place.longitude,
				placeId: place.id,
				isNewSubmission: false,
			});
			setSearchQuery(place.name);
			setShowDropdown(false);
			setMode("search");
		},
		[onChange],
	);

	const handlePinMode = useCallback(() => {
		setMode("pin");
		setShowDropdown(false);
	}, []);

	const handleAddressPinChange = useCallback(
		(pinValue: AddressPinValue | null) => {
			if (!pinValue) {
				onChange(EMPTY_VENUE);
				return;
			}

			onChange({
				name: pinValue.name,
				address: pinValue.address,
				latitude: pinValue.latitude,
				longitude: pinValue.longitude,
				isNewSubmission: true,
			});
			setMode("search");
		},
		[onChange],
	);

	const handleBackToSearch = useCallback(() => {
		onChange(EMPTY_VENUE);
		resetToSearch();
	}, [onChange, resetToSearch]);

	useEffect(() => {
		if (disabled || mode !== "search" || selected) {
			setPlaces([]);
			setIsSearching(false);
			return;
		}

		const query = debouncedQuery.trim();
		if (query.length < 2) {
			setPlaces([]);
			setIsSearching(false);
			return;
		}

		let cancelled = false;
		setIsSearching(true);

		void fetch(`/api/places/search?q=${encodeURIComponent(query)}`)
			.then((res) => res.json())
			.then((data: { places?: SearchPlace[] }) => {
				if (cancelled) return;
				setPlaces(data.places ?? []);
				setShowDropdown(true);
			})
			.catch(() => {
				if (cancelled) return;
				setPlaces([]);
			})
			.finally(() => {
				if (!cancelled) setIsSearching(false);
			});

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery, disabled, mode, selected]);

	if (selected) {
		return (
			<div className={cn("space-y-2", className)}>
				<div className="rounded-xl border border-border bg-bg-elevated p-3">
					<div className="flex items-start gap-2">
						{isNewVenue && !disabled && (
							<button
								type="button"
								onClick={handleBackToSearch}
								className="mt-0.5 shrink-0 text-text-secondary transition-colors hover:text-text-primary"
								aria-label="Back to search"
							>
								<ArrowLeft size={16} />
							</button>
						)}
						<div className="min-w-0 flex-1">
							<p className="text-body font-semibold text-text-primary">
								{isNewVenue ? `New venue: ${value?.name}` : value?.name}
							</p>
							{value?.address ? (
								<p className="mt-0.5 truncate text-label text-text-secondary">
									{value.address}
								</p>
							) : null}
						</div>
						{!disabled && (
							<button
								type="button"
								onClick={handleClear}
								className="shrink-0 text-text-secondary transition-colors hover:text-text-primary"
								aria-label="Clear venue"
							>
								<X size={16} />
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (mode === "pin") {
		const pinValue: AddressPinValue | null = hasCoordinates(value)
			? {
					name: value.name,
					address: value.address ?? "",
					latitude: value.latitude,
					longitude: value.longitude,
				}
			: null;

		return (
			<div className={cn("space-y-3", className)}>
				{!disabled && (
					<button
						type="button"
						onClick={resetToSearch}
						className="inline-flex items-center gap-1.5 text-label text-text-secondary transition-colors hover:text-text-primary"
					>
						<ArrowLeft size={14} />
						Back to search
					</button>
				)}
				<AddressPinField
					value={pinValue}
					onChange={handleAddressPinChange}
					label="Pin new location"
					disabled={disabled}
				/>
			</div>
		);
	}

	return (
		<div className={cn("space-y-2", className)}>
			<div className="relative">
				<Input
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
					onFocus={() => {
						if (places.length > 0 || searchQuery.trim().length >= 2) {
							setShowDropdown(true);
						}
					}}
					onBlur={() => {
						window.setTimeout(() => setShowDropdown(false), 150);
					}}
					placeholder="Search venues…"
					disabled={disabled}
					className="pr-10"
					aria-autocomplete="list"
					aria-expanded={showDropdown}
				/>
				{isSearching && (
					<Loader2
						size={16}
						className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-accent"
						aria-hidden
					/>
				)}
				{showDropdown && !disabled && (
					<ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-bg-base shadow-lg">
						{places.map((place) => (
							<li key={place.id}>
								<button
									type="button"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => handlePlaceSelect(place)}
									className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-bg-elevated"
								>
									<MapPin
										size={14}
										className="mt-0.5 shrink-0 text-accent"
										aria-hidden
									/>
									<span className="min-w-0">
										<span className="block truncate text-body text-text-primary">
											{place.name}
										</span>
										<span className="block truncate text-label text-text-secondary">
											{truncateAddress(place.address)}
										</span>
									</span>
								</button>
							</li>
						))}
						<li className="border-t border-border">
							<button
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onClick={handlePinMode}
								className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-accent hover:bg-bg-elevated"
							>
								<Pin size={14} className="shrink-0" aria-hidden />
								Pin a new location
							</button>
						</li>
					</ul>
				)}
			</div>
			{searchQuery.trim().length >= 2 &&
				!isSearching &&
				places.length === 0 &&
				!showDropdown && (
					<p className="text-label text-text-secondary">
						No confirmed venues found. Pin a new location below.
					</p>
				)}
			{!showDropdown && searchQuery.trim().length < 2 && (
				<button
					type="button"
					onClick={handlePinMode}
					disabled={disabled}
					className="inline-flex items-center gap-1.5 text-label text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
				>
					<Pin size={14} aria-hidden />
					Pin a new location
				</button>
			)}
		</div>
	);
}
