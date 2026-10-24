"use client";

import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button/Button";
import { Calendar } from "@/components/ui/calendar/Calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover/Popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
	value?: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	fromDate?: Date;
	placeholder?: string;
	className?: string;
	popoverContainer?: HTMLElement | null;
}

export function DatePicker({
	value,
	onChange,
	disabled = false,
	fromDate,
	placeholder = "Pick a date",
	className,
	popoverContainer,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);

	const selected = value ? parseISO(value) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						disabled={disabled}
						className={cn("w-full justify-start font-normal", className)}
					>
						{selected ? format(selected, "PPP") : placeholder}
					</Button>
				}
			/>
			<PopoverContent
				className="w-auto p-0"
				{...(popoverContainer != null ? { container: popoverContainer } : {})}
			>
				<Calendar
					mode="single"
					selected={selected}
					disabled={fromDate ? { before: fromDate } : undefined}
					onSelect={(date) => {
						if (!date) return;
						onChange(format(date, "yyyy-MM-dd"));
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
