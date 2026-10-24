"use client";

import {
	cloneElement,
	type ReactElement,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover/Popover";
import {
	RadioGroup,
	RadioGroupItem,
} from "@/components/ui/radio-group/RadioGroup";
import {
	countMatchingSessions,
	countTotalSessions,
	type PanelFilterState,
} from "@/lib/dashboard/venue-session-utils";
import { cn } from "@/lib/utils";
import type { VenueSessionGroup } from "@/types/session-discovery";

export interface FilterPanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	venueGroups: VenueSessionGroup[];
	activeFilters: PanelFilterState;
	onApply: (filters: PanelFilterState) => void;
	trigger: ReactElement<{
		onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	}>;
}

const COMING_SOON_FILTERS = [
	"Schedule Type",
	"Match Format",
	"Skill Level",
] as const;

function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const media = window.matchMedia("(min-width: 768px)");
		const update = () => setIsDesktop(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	return isDesktop;
}

export function FilterPanelBody({
	venueGroups,
	pendingFilters,
	onPendingFiltersChange,
	onApply,
	onClose,
}: {
	venueGroups: VenueSessionGroup[];
	pendingFilters: PanelFilterState;
	onPendingFiltersChange: (filters: PanelFilterState) => void;
	onApply: () => void;
	onClose: () => void;
}) {
	const totalSessions = countTotalSessions(venueGroups);
	const matchCount = useMemo(
		() => countMatchingSessions(venueGroups, pendingFilters),
		[venueGroups, pendingFilters],
	);
	const hasPendingFilters = pendingFilters.slotAvailability != null;
	const availabilityValue = pendingFilters.slotAvailability ?? "";

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">
					Filters
				</h2>
				<button
					type="button"
					disabled={!hasPendingFilters}
					onClick={() => onPendingFiltersChange({})}
					className="text-[10px] font-bold uppercase tracking-widest text-accent disabled:cursor-not-allowed disabled:opacity-40"
				>
					Clear all
				</button>
			</div>

			<section className="space-y-3">
				<p className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
					Availability
				</p>
				<RadioGroup
					value={availabilityValue}
					onValueChange={(value) => {
						if (value === "not_full" || value === "full") {
							onPendingFiltersChange({
								slotAvailability: value,
							});
							return;
						}
						onPendingFiltersChange({});
					}}
					className="gap-3"
				>
					<label
						htmlFor="filter-not-full"
						className="flex cursor-pointer items-center gap-3"
					>
						<RadioGroupItem value="not_full" id="filter-not-full" />
						<span
							className={cn(
								"text-sm",
								availabilityValue === "not_full"
									? "text-accent"
									: "text-text-primary",
							)}
						>
							Not Full
						</span>
					</label>
					<label
						htmlFor="filter-full"
						className="flex cursor-pointer items-center gap-3"
					>
						<RadioGroupItem value="full" id="filter-full" />
						<span
							className={cn(
								"text-sm",
								availabilityValue === "full"
									? "text-accent"
									: "text-text-primary",
							)}
						>
							Full
						</span>
					</label>
				</RadioGroup>
			</section>

			<section className="space-y-3">
				<p className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
					More filters
				</p>
				<div className="space-y-2">
					{COMING_SOON_FILTERS.map((label) => (
						<div
							key={label}
							className="flex items-center justify-between rounded-lg border border-outline-variant/10 bg-bg-elevated px-3 py-2"
						>
							<span className="text-sm text-text-secondary">{label}</span>
							<span className="rounded-full bg-bg-overlay px-2 py-0.5 text-[9px] font-bold tracking-widest text-text-secondary uppercase">
								Coming soon
							</span>
						</div>
					))}
				</div>
			</section>

			<button
				type="button"
				onClick={() => {
					onApply();
					onClose();
				}}
				className="w-full rounded-xl bg-accent py-3 text-[10px] font-black tracking-widest text-bg-base uppercase"
			>
				{hasPendingFilters
					? `Show ${matchCount} sessions`
					: `${totalSessions} sessions`}
			</button>
		</div>
	);
}

function MobileFilterSheet({
	open,
	onClose,
	children,
}: {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				"fixed inset-0 z-50 md:hidden",
				open ? "pointer-events-auto" : "pointer-events-none",
			)}
			aria-hidden={!open}
		>
			<div
				className={cn(
					"absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
					open ? "opacity-100" : "opacity-0",
				)}
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				className={cn(
					"absolute right-0 bottom-0 left-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-outline-variant/10 bg-bg-base p-6 shadow-2xl transition-transform duration-300",
					open ? "translate-y-0" : "translate-y-full",
				)}
				role="dialog"
				aria-modal="true"
				aria-label="Filters"
			>
				<div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bg-overlay" />
				{children}
			</div>
		</div>
	);
}

export function FilterPanel({
	open,
	onOpenChange,
	venueGroups,
	activeFilters,
	onApply,
	trigger,
}: FilterPanelProps) {
	const isDesktop = useIsDesktop();
	const [pendingFilters, setPendingFilters] =
		useState<PanelFilterState>(activeFilters);

	useEffect(() => {
		if (open) {
			setPendingFilters(activeFilters);
		}
	}, [open, activeFilters]);

	const handleApply = () => {
		onApply(pendingFilters);
		onOpenChange(false);
	};

	const body = (
		<FilterPanelBody
			venueGroups={venueGroups}
			pendingFilters={pendingFilters}
			onPendingFiltersChange={setPendingFilters}
			onApply={handleApply}
			onClose={() => onOpenChange(false)}
		/>
	);

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverTrigger render={trigger} />
				<PopoverContent
					align="end"
					side="bottom"
					sideOffset={8}
					className="w-80 border border-outline-variant/10 bg-bg-base p-4 shadow-2xl"
				>
					{body}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<>
			{cloneElement(trigger, {
				onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
					trigger.props.onClick?.(event);
					onOpenChange(true);
				},
			} as Partial<typeof trigger.props>)}
			<MobileFilterSheet open={open} onClose={() => onOpenChange(false)}>
				{body}
			</MobileFilterSheet>
		</>
	);
}
