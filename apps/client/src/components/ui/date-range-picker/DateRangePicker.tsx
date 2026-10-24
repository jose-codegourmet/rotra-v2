"use client";

import { format, parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar/Calendar";
import { cn } from "@/lib/utils";

export type DateFlexibility = 0 | 1 | 2 | 3 | 7 | 14;

export type DateRangePickerMode = "dates" | "flexible";

export interface DateRangePickerProps {
	from?: string | undefined;
	to?: string | undefined;
	onChange: (from: string | undefined, to: string | undefined) => void;
	className?: string;
	/** When true, past dates can be selected (e.g. session history filters). */
	allowPastDates?: boolean;
}

function toDateRange(from?: string, to?: string): DateRange | undefined {
	if (!from) return undefined;

	return {
		from: parseISO(from),
		...(to != null ? { to: parseISO(to) } : {}),
	};
}

export function DateRangePicker({
	from,
	to,
	onChange,
	className,
	allowPastDates = false,
}: DateRangePickerProps) {
	const [mode, setMode] = useState<DateRangePickerMode>("dates");
	const [baseRange, setBaseRange] = useState<DateRange | undefined>(() =>
		toDateRange(from, to),
	);

	const selectedRange = useMemo(() => toDateRange(from, to), [from, to]);

	useEffect(() => {
		if (!from && !to) {
			setBaseRange(undefined);
		}
	}, [from, to]);

	const calendarRange = baseRange ?? selectedRange;

	const handleRangeSelect = useCallback(
		(range: DateRange | undefined) => {
			setBaseRange(range);

			if (!range?.from) {
				onChange(undefined, undefined);
				return;
			}

			const nextFrom = format(range.from, "yyyy-MM-dd");
			const nextTo = range.to ? format(range.to, "yyyy-MM-dd") : nextFrom;

			onChange(nextFrom, nextTo);
		},
		[onChange],
	);

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<div className="flex justify-center">
				<div className="inline-flex rounded-full border border-outline-variant/10 bg-bg-base p-1">
					{(["dates", "flexible"] as const).map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setMode(option)}
							className={cn(
								"rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
								mode === option
									? "bg-bg-elevated text-text-primary shadow-sm"
									: "text-text-secondary hover:text-text-primary",
							)}
						>
							{option === "dates" ? "Dates" : "Flexible"}
						</button>
					))}
				</div>
			</div>

			{mode === "dates" ? (
				<div className="flex justify-center overflow-x-auto">
					<Calendar
						mode="range"
						numberOfMonths={2}
						selected={calendarRange}
						onSelect={handleRangeSelect}
						disabled={allowPastDates ? undefined : { before: new Date() }}
						className="bg-transparent p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(11)] w-full"
						classNames={{
							months: "relative flex flex-col gap-6 md:flex-row md:gap-10",
							month: "flex w-full flex-col gap-4",
							month_caption:
								"flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
							caption_label: "text-base font-semibold text-text-primary",
							weekday:
								"flex-1 text-[0.7rem] font-medium tracking-wide text-text-secondary uppercase",
							day: "flex-1 text-sm",
							day_button: "aspect-[3/2]",
							button_previous:
								"size-9 rounded-full border border-outline-variant/10 bg-bg-elevated text-text-secondary hover:bg-bg-base",
							button_next:
								"size-9 rounded-full border border-outline-variant/10 bg-bg-elevated text-text-secondary hover:bg-bg-base",
						}}
					/>
				</div>
			) : (
				<div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-outline-variant/20 bg-bg-base px-6 py-10 text-center">
					<p className="max-w-sm text-sm text-text-secondary">
						Flexible date search is coming soon. Use the Dates tab to pick a
						range for now.
					</p>
				</div>
			)}
		</div>
	);
}
