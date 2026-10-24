"use client";

import { format, parseISO } from "date-fns";
import {
	Building2,
	LayoutGrid,
	List,
	Loader2,
	Map as MapIcon,
	MapPin,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FilterPanel } from "@/components/modules/dashboard/filter-panel/FilterPanel";
import { viewToggleTabVariants } from "@/components/modules/dashboard/view-toggle/ViewToggle.variants";
import { DateRangePicker } from "@/components/ui/date-range-picker/DateRangePicker";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs";
import { MAX_RADIUS_KM } from "@/constants/dashboard";
import type { GeolocationStatus } from "@/hooks/useGeolocation";
import { forwardGeocode, type GeocodingSuggestion } from "@/lib/geo/geocode";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setDashboardViewMode } from "@/store/slices/uiSlice";
import type {
	DashboardViewMode,
	SessionGeoPoint,
	VenueSessionGroup,
} from "@/types/session-discovery";

const VIEW_TABS: Array<{
	mode: DashboardViewMode;
	label: string;
	Icon: typeof MapIcon;
}> = [
	{ mode: "map", label: "Map View", Icon: MapIcon },
	{ mode: "list", label: "List", Icon: List },
	{ mode: "grid", label: "Grid", Icon: LayoutGrid },
];

type SearchMode = "place" | "club";
type ActivePanel = "where" | "when" | null;

interface MapSearchOverlayProps {
	locationLabel: string;
	geoStatus: GeolocationStatus;
	radiusKm: number;
	doublesOnly: boolean;
	weekendOnly: boolean;
	onRadiusChange: (km: number) => void;
	onToggleDoubles: () => void;
	onToggleWeekend: () => void;
	onRecenter?: () => void;
	onPlaceSelect: (center: SessionGeoPoint) => void;
	clubQuery: string;
	onClubQueryChange: (query: string) => void;
	venueGroups: VenueSessionGroup[];
	slotAvailability: "full" | "not_full" | undefined;
	onSlotAvailabilityChange: (value: "full" | "not_full" | undefined) => void;
	dateFrom: string | undefined;
	dateTo: string | undefined;
	onDateRangeChange: (from: string | undefined, to: string | undefined) => void;
	onDiscover: () => void;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}

function formatDateRangeLabel(from?: string, to?: string): string {
	if (from && to) {
		const fromDate = parseISO(from);
		const toDate = parseISO(to);
		if (from === to) return format(fromDate, "MMM d");
		if (fromDate.getFullYear() === toDate.getFullYear()) {
			return `${format(fromDate, "MMM d")} – ${format(toDate, "MMM d")}`;
		}
		return `${format(fromDate, "MMM d, yyyy")} – ${format(toDate, "MMM d, yyyy")}`;
	}
	if (from) return format(parseISO(from), "MMM d");
	return "Any dates";
}

function formatWhereLabel(
	searchMode: SearchMode,
	clubQuery: string,
	locationLabel: string,
): string {
	if (searchMode === "club" && clubQuery.trim()) {
		return clubQuery.trim();
	}
	if (locationLabel) return locationLabel;
	return "Nearby";
}

export function MapSearchOverlay({
	locationLabel,
	geoStatus,
	radiusKm,
	doublesOnly,
	weekendOnly,
	onRadiusChange,
	onToggleDoubles,
	onToggleWeekend,
	onRecenter,
	onPlaceSelect,
	clubQuery,
	onClubQueryChange,
	venueGroups,
	slotAvailability,
	onSlotAvailabilityChange,
	dateFrom,
	dateTo,
	onDateRangeChange,
	onDiscover,
}: MapSearchOverlayProps) {
	const dispatch = useAppDispatch();
	const viewMode = useAppSelector((s) => s.ui.dashboardViewMode);
	const [activePanel, setActivePanel] = useState<ActivePanel>(null);
	const [searchMode, setSearchMode] = useState<SearchMode>("place");
	const [placeInput, setPlaceInput] = useState("");
	const [clubInput, setClubInput] = useState(clubQuery);
	const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [filterPanelOpen, setFilterPanelOpen] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);

	const debouncedPlaceInput = useDebouncedValue(placeInput, 300);
	const debouncedClubInput = useDebouncedValue(clubInput, 300);

	const placePlaceholder =
		geoStatus === "loading"
			? "Locating you…"
			: locationLabel || "Province, city, street…";

	const hasActivePanelFilters = slotAvailability != null;

	useEffect(() => {
		onClubQueryChange(debouncedClubInput);
	}, [debouncedClubInput, onClubQueryChange]);

	useEffect(() => {
		setClubInput(clubQuery);
	}, [clubQuery]);

	useEffect(() => {
		if (searchMode !== "place" || activePanel !== "where") {
			setSuggestions([]);
			return;
		}

		const query = debouncedPlaceInput.trim();
		if (!query) {
			setSuggestions([]);
			setIsGeocoding(false);
			return;
		}

		const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
		if (!token) {
			setSuggestions([]);
			return;
		}

		let cancelled = false;
		setIsGeocoding(true);

		void forwardGeocode(query, token).then((results) => {
			if (cancelled) return;
			setSuggestions(results);
			setIsGeocoding(false);
			setShowSuggestions(results.length > 0);
		});

		return () => {
			cancelled = true;
		};
	}, [debouncedPlaceInput, searchMode, activePanel]);

	const handlePlaceSuggestionSelect = useCallback(
		(suggestion: GeocodingSuggestion) => {
			onPlaceSelect({
				lat: suggestion.center[1],
				lng: suggestion.center[0],
			});
			setPlaceInput("");
			setSuggestions([]);
			setShowSuggestions(false);
		},
		[onPlaceSelect],
	);

	const handlePlaceInputKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (event.key === "Enter" && suggestions[0]) {
			handlePlaceSuggestionSelect(suggestions[0]);
		}
	};

	const handlePlaceInputFocus = () => {
		if (suggestions.length > 0) {
			setShowSuggestions(true);
		}
	};

	const handlePlaceRecenter = () => {
		if (!placeInput.trim()) {
			onRecenter?.();
		}
	};

	const togglePanel = (panel: ActivePanel) => {
		setActivePanel((current) => (current === panel ? null : panel));
	};

	const handleDiscover = () => {
		onDiscover();
		setActivePanel(null);
	};

	return (
		<div
			className={cn(
				"pointer-events-auto w-full px-4",
				viewMode === "map"
					? "absolute top-4 left-1/2 z-20 max-w-[990px] -translate-x-1/2"
					: "relative z-10 shrink-0 pt-4",
			)}
		>
			<div className="rounded-2xl border border-outline-variant/10 bg-bg-base/90 p-3 shadow-2xl backdrop-blur-xl">
				<div className="flex items-stretch gap-2">
					<div className="flex min-w-0 flex-1 overflow-hidden rounded-full border border-outline-variant/10 bg-bg-elevated">
						<button
							type="button"
							onClick={() => togglePanel("where")}
							className={cn(
								"min-w-0 flex-1 border-r border-outline-variant/10 px-4 py-2.5 text-left transition-colors",
								activePanel === "where" ? "bg-bg-base" : "hover:bg-bg-base/60",
							)}
						>
							<span className="block text-[10px] font-bold tracking-wider text-text-secondary uppercase">
								Where
							</span>
							<span className="block truncate text-sm font-medium text-text-primary">
								{formatWhereLabel(searchMode, clubQuery, locationLabel)}
							</span>
						</button>

						<button
							type="button"
							onClick={() => togglePanel("when")}
							className={cn(
								"min-w-0 flex-1 px-4 py-2.5 text-left transition-colors",
								activePanel === "when" ? "bg-bg-base" : "hover:bg-bg-base/60",
							)}
						>
							<span className="block text-[10px] font-bold tracking-wider text-text-secondary uppercase">
								When
							</span>
							<span className="block truncate text-sm font-medium text-text-primary">
								{formatDateRangeLabel(dateFrom, dateTo)}
							</span>
						</button>
					</div>

					<button
						type="button"
						onClick={handleDiscover}
						className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-bg-base transition-opacity hover:opacity-90"
					>
						<Search size={16} />
						<span>Discover</span>
					</button>
				</div>

				<div
					role="tablist"
					aria-label="Dashboard view mode"
					className="mt-3 flex rounded-xl border border-outline-variant/10 bg-bg-elevated p-1.5"
				>
					{VIEW_TABS.map(({ mode, label, Icon }) => {
						const isActive = viewMode === mode;
						return (
							<button
								key={mode}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => dispatch(setDashboardViewMode(mode))}
								className={cn(
									viewToggleTabVariants({ active: isActive }),
									"flex-1 justify-center",
								)}
							>
								<Icon size={14} fill={isActive ? "currentColor" : "none"} />
								<span>{label}</span>
							</button>
						);
					})}
				</div>

				{activePanel === "where" ? (
					<div className="mt-3 rounded-xl border border-outline-variant/10 bg-bg-elevated p-3">
						<Tabs
							value={searchMode}
							onValueChange={(value) => setSearchMode(value as SearchMode)}
						>
							<div className="flex items-center gap-2">
								<TabsList className="h-auto shrink-0 gap-1 border-0 bg-transparent p-0">
									<TabsTrigger
										value="place"
										className="size-10 rounded-xl p-0 data-[state=active]:bg-accent data-[state=active]:text-bg-base"
										aria-label="Search by place"
									>
										<MapPin size={16} />
									</TabsTrigger>
									<TabsTrigger
										value="club"
										className="size-10 rounded-xl p-0 data-[state=active]:bg-accent data-[state=active]:text-bg-base"
										aria-label="Search by club"
									>
										<Building2 size={16} />
									</TabsTrigger>
								</TabsList>

								<div className="relative min-w-0 flex-1">
									{searchMode === "place" ? (
										<input
											type="text"
											value={placeInput}
											onChange={(event) => setPlaceInput(event.target.value)}
											onFocus={handlePlaceInputFocus}
											onKeyDown={handlePlaceInputKeyDown}
											onClick={handlePlaceRecenter}
											placeholder={placePlaceholder}
											className="w-full rounded-xl border border-outline-variant/10 bg-bg-base px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-secondary"
											aria-label="Search by place"
										/>
									) : (
										<input
											type="text"
											value={clubInput}
											onChange={(event) => setClubInput(event.target.value)}
											placeholder="Search clubs…"
											className="w-full rounded-xl border border-outline-variant/10 bg-bg-base px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-secondary"
											aria-label="Search clubs"
										/>
									)}

									{searchMode === "place" && isGeocoding && (
										<Loader2
											size={16}
											className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-accent"
										/>
									)}

									{searchMode === "place" &&
										showSuggestions &&
										suggestions.length > 0 && (
											<ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-xl border border-outline-variant/10 bg-bg-base shadow-xl">
												{suggestions.map((suggestion) => (
													<li key={suggestion.id}>
														<button
															type="button"
															onClick={() =>
																handlePlaceSuggestionSelect(suggestion)
															}
															className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated"
														>
															<MapPin
																size={14}
																className="mt-0.5 shrink-0 text-accent"
															/>
															<span className="truncate">
																{suggestion.placeName}
															</span>
														</button>
													</li>
												))}
											</ul>
										)}
								</div>
							</div>
						</Tabs>
					</div>
				) : null}

				{activePanel === "when" ? (
					<div className="mt-3 rounded-xl border border-outline-variant/10 bg-bg-elevated p-3">
						<div className="mb-3 flex items-center justify-between">
							<span className="text-xs font-bold tracking-wider text-text-secondary uppercase">
								Select dates
							</span>
							{dateFrom || dateTo ? (
								<button
									type="button"
									onClick={() => onDateRangeChange(undefined, undefined)}
									className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
								>
									<X size={14} />
									Clear
								</button>
							) : null}
						</div>
						<DateRangePicker
							{...(dateFrom !== undefined ? { from: dateFrom } : {})}
							{...(dateTo !== undefined ? { to: dateTo } : {})}
							onChange={onDateRangeChange}
						/>
					</div>
				) : null}

				<div className="mt-3 flex flex-col gap-2">
					<div className="rounded-xl border border-outline-variant/10 bg-bg-elevated p-3">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-bold tracking-wider text-text-secondary uppercase">
								Distance
							</span>
							<span className="text-xs font-medium text-text-primary">
								{radiusKm} km
							</span>
						</div>
						<Slider
							value={[radiusKm]}
							min={1}
							max={MAX_RADIUS_KM}
							step={1}
							onValueChange={(vals) => {
								const next = Array.isArray(vals) ? vals[0] : vals;
								if (next !== undefined) onRadiusChange(next);
							}}
						/>
					</div>

					<div className="flex items-center gap-2">
						<div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
							<FilterChip
								active={doublesOnly}
								onClick={onToggleDoubles}
								label="Doubles Only"
							/>
							<FilterChip
								active={weekendOnly}
								onClick={onToggleWeekend}
								label="Weekend"
							/>
						</div>

						<FilterPanel
							open={filterPanelOpen}
							onOpenChange={setFilterPanelOpen}
							venueGroups={venueGroups}
							activeFilters={slotAvailability ? { slotAvailability } : {}}
							onApply={(filters) =>
								onSlotAvailabilityChange(filters.slotAvailability)
							}
							trigger={
								<button
									type="button"
									className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant/10 bg-bg-elevated text-text-secondary"
									aria-label="Filters"
								>
									<SlidersHorizontal size={16} />
									{hasActivePanelFilters && (
										<span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />
									)}
								</button>
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function FilterChip({
	active,
	onClick,
	label,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold tracking-tighter whitespace-nowrap uppercase",
				active
					? "border-accent/20 bg-accent/5 text-accent"
					: "border-outline-variant/10 bg-bg-elevated text-text-secondary",
			)}
		>
			{label}
		</button>
	);
}
