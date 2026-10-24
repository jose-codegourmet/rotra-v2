"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ActiveSessionBanner } from "@/components/modules/dashboard/active-session-banner/ActiveSessionBanner";
import { AlreadyInSessionDialog } from "@/components/modules/dashboard/already-in-session-dialog/AlreadyInSessionDialog";
import { DashboardSkeleton } from "@/components/modules/dashboard/dashboard-skeleton/DashboardSkeleton";
import { MapSearchOverlay } from "@/components/modules/dashboard/map-search-overlay/MapSearchOverlay";
import { QuickSessionButton } from "@/components/modules/dashboard/quick-session-button/QuickSessionButton";
import { QuickSessionSheet } from "@/components/modules/dashboard/quick-session-sheet/QuickSessionSheet";
import { SessionGridView } from "@/components/modules/dashboard/session-grid-view/SessionGridView";
import { SessionListView } from "@/components/modules/dashboard/session-list-view/SessionListView";
import { SessionUnavailableDialog } from "@/components/modules/dashboard/session-unavailable-dialog/SessionUnavailableDialog";
import { VenueSessionsModal } from "@/components/modules/dashboard/venue-sessions-modal/VenueSessionsModal";
import {
	DEFAULT_MAP_ZOOM,
	DEFAULT_RADIUS_KM,
	USER_LOCATION_ZOOM,
} from "@/constants/dashboard";
import { useEnrolledSessionState } from "@/hooks/useActiveSession/client";
import { useGeolocation } from "@/hooks/useGeolocation/client";
import {
	sessionDiscoveryQueryKey,
	useSessionDiscovery,
} from "@/hooks/useSessionDiscovery/client";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setDashboardViewMode } from "@/store/slices/uiSlice";
import type {
	SessionDiscoveryFilters,
	SessionGeoPoint,
} from "@/types/session-discovery";

const DashboardMap = dynamic(
	() =>
		import("@/components/modules/dashboard/dashboard-map/DashboardMap").then(
			(m) => m.DashboardMap,
		),
	{ ssr: false, loading: () => <DashboardSkeleton /> },
);

export function DashboardClient() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const dispatch = useAppDispatch();
	const viewMode = useAppSelector((s) => s.ui.dashboardViewMode);
	const { center, status, locationLabel, isUserLocation, refresh } =
		useGeolocation();

	const [selectedVenueKey, setSelectedVenueKey] = useState<string | null>(null);
	const [venueModalKey, setVenueModalKey] = useState<string | null>(null);
	const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false);
	const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
	const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
	const [doublesOnly, setDoublesOnly] = useState(false);
	const [weekendOnly, setWeekendOnly] = useState(false);
	const [placeCenter, setPlaceCenter] = useState<SessionGeoPoint | null>(null);
	const [clubQuery, setClubQuery] = useState("");
	const [slotAvailability, setSlotAvailability] = useState<
		"full" | "not_full" | undefined
	>(undefined);
	const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
	const [dateTo, setDateTo] = useState<string | undefined>(undefined);
	const [sheetOpen, setSheetOpen] = useState(false);

	const effectiveCenter = placeCenter ?? center;

	const filters = useMemo<SessionDiscoveryFilters>(() => {
		const base: SessionDiscoveryFilters = {
			radiusKm,
			weekendOnly,
		};

		if (clubQuery.trim()) {
			base.clubQuery = clubQuery.trim();
		}

		if (slotAvailability) {
			base.slotAvailability = slotAvailability;
		}

		if (dateFrom && dateTo) {
			base.dateFrom = dateFrom;
			base.dateTo = dateTo;
		}

		return doublesOnly ? { ...base, playersPerCourt: 4 } : base;
	}, [
		radiusKm,
		doublesOnly,
		weekendOnly,
		clubQuery,
		slotAvailability,
		dateFrom,
		dateTo,
	]);

	const { data, isLoading } = useSessionDiscovery(
		effectiveCenter.lat,
		effectiveCenter.lng,
		filters,
	);

	const { current, scheduled, enrolled } = useEnrolledSessionState();

	const sessions = data?.sessions ?? [];
	const venueGroups = data?.venueGroups ?? [];

	const venueModalGroup =
		venueGroups.find((group) => group.venueKey === venueModalKey) ?? null;

	const handleJoinSession = useCallback(
		async (sessionId: string) => {
			if (enrolled && enrolled.sessionId !== sessionId) {
				setBlockedDialogOpen(true);
				return;
			}

			try {
				const res = await fetch(`/api/sessions/${sessionId}`);
				if (!res.ok) {
					setUnavailableDialogOpen(true);
					return;
				}

				const body = (await res.json()) as { joinable?: boolean };
				if (body.joinable === false) {
					setUnavailableDialogOpen(true);
					return;
				}

				router.push(`/find-sessions/${sessionId}`);
			} catch {
				setUnavailableDialogOpen(true);
			}
		},
		[router, enrolled],
	);

	const handleRefreshNearby = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: sessionDiscoveryQueryKey(
				effectiveCenter.lat,
				effectiveCenter.lng,
				filters,
			),
		});
		setSelectedVenueKey(null);
		setVenueModalKey(null);
	}, [effectiveCenter.lat, effectiveCenter.lng, filters, queryClient]);

	const handlePlaceSelect = useCallback((nextCenter: SessionGeoPoint) => {
		setPlaceCenter(nextCenter);
		setSelectedVenueKey(null);
		setVenueModalKey(null);
	}, []);

	const handleRecenter = useCallback(() => {
		setPlaceCenter(null);
		refresh();
	}, [refresh]);

	const handleDateRangeChange = useCallback(
		(from: string | undefined, to: string | undefined) => {
			setDateFrom(from);
			setDateTo(to);
			if (from && to) {
				setWeekendOnly(false);
			}
		},
		[],
	);

	const handleDiscover = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: sessionDiscoveryQueryKey(
				effectiveCenter.lat,
				effectiveCenter.lng,
				filters,
			),
		});
		setSelectedVenueKey(null);
		setVenueModalKey(null);
	}, [effectiveCenter.lat, effectiveCenter.lng, filters, queryClient]);

	const handleMapError = useCallback(() => {
		dispatch(setDashboardViewMode("list"));
		toast.error("Map unavailable — showing list");
	}, [dispatch]);

	const searchOverlay = (
		<MapSearchOverlay
			locationLabel={locationLabel}
			geoStatus={status}
			radiusKm={radiusKm}
			doublesOnly={doublesOnly}
			weekendOnly={weekendOnly}
			onRadiusChange={setRadiusKm}
			onToggleDoubles={() => setDoublesOnly((v) => !v)}
			onToggleWeekend={() => setWeekendOnly((v) => !v)}
			onRecenter={handleRecenter}
			onPlaceSelect={handlePlaceSelect}
			clubQuery={clubQuery}
			onClubQueryChange={setClubQuery}
			venueGroups={venueGroups}
			slotAvailability={slotAvailability}
			onSlotAvailabilityChange={setSlotAvailability}
			dateFrom={dateFrom}
			dateTo={dateTo}
			onDateRangeChange={handleDateRangeChange}
			onDiscover={handleDiscover}
		/>
	);

	return (
		<div
			className={cn(
				"h-[calc(100dvh-4rem)] min-h-[480px] w-full bg-bg-base",
				viewMode === "map" ? "relative overflow-hidden" : "flex flex-col",
			)}
		>
			{viewMode !== "map" ? searchOverlay : null}

			{viewMode === "map" ? (
				<div
					key="map"
					className="absolute inset-0 z-0 animate-in fade-in duration-150 slide-in-from-bottom-1"
				>
					<DashboardMap
						venueGroups={venueGroups}
						center={effectiveCenter}
						{...(isUserLocation ? { userLocation: center } : {})}
						radiusKm={filters.radiusKm}
						zoom={isUserLocation ? USER_LOCATION_ZOOM : DEFAULT_MAP_ZOOM}
						selectedVenueKey={selectedVenueKey}
						onSelectVenue={setSelectedVenueKey}
						onOpenVenueModal={setVenueModalKey}
						onJoinSession={handleJoinSession}
						flyToUserLocation={isUserLocation && placeCenter == null}
						{...(placeCenter ? { flyToCenter: placeCenter } : {})}
						onMapError={handleMapError}
					/>
				</div>
			) : viewMode === "list" ? (
				<div
					key="list"
					className="relative z-0 min-h-0 flex-1 overflow-hidden animate-in fade-in duration-150 slide-in-from-bottom-1"
				>
					<SessionListView
						sessions={sessions}
						isLoading={isLoading}
						onJoinSession={handleJoinSession}
					/>
				</div>
			) : (
				<div
					key="grid"
					className="relative z-0 min-h-0 flex-1 overflow-hidden animate-in fade-in duration-150 slide-in-from-bottom-1"
				>
					<SessionGridView
						sessions={sessions}
						isLoading={isLoading}
						onJoinSession={handleJoinSession}
					/>
				</div>
			)}

			{viewMode === "map" ? searchOverlay : null}

			{current ? (
				<ActiveSessionBanner
					session={current}
					onNavigate={() => router.push(current.href)}
					className="absolute top-4 left-4 right-4 z-[25]"
				/>
			) : null}

			<QuickSessionButton
				variant={current ? "resume" : scheduled ? "scheduled" : "create"}
				onClick={() => {
					if (current) {
						router.push(current.href);
					} else if (scheduled) {
						router.push(scheduled.href);
					} else {
						setSheetOpen(true);
					}
				}}
			/>
			{!enrolled ? (
				<QuickSessionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
			) : null}

			<VenueSessionsModal
				group={venueModalGroup}
				open={venueModalKey != null}
				onOpenChange={(open) => {
					if (!open) setVenueModalKey(null);
				}}
				onJoin={handleJoinSession}
			/>

			{enrolled ? (
				<AlreadyInSessionDialog
					open={blockedDialogOpen}
					onOpenChange={setBlockedDialogOpen}
					activeSession={enrolled}
					onGoToSession={() => {
						setBlockedDialogOpen(false);
						router.push(enrolled.href);
					}}
				/>
			) : null}

			<SessionUnavailableDialog
				open={unavailableDialogOpen}
				onOpenChange={setUnavailableDialogOpen}
				onRefresh={handleRefreshNearby}
			/>
		</div>
	);
}
