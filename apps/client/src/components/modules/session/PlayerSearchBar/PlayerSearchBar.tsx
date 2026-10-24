"use client";

import { Filter, Search } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button/Button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group/InputGroup";
import { cn } from "@/lib/utils";

export interface PlayerSearchBarProps {
	value: string;
	onChange: (value: string) => void;
	onFilterClick?: () => void;
	placeholder?: string;
	className?: string;
}

export function PlayerSearchBar({
	value,
	onChange,
	onFilterClick,
	placeholder = "Search…",
	className,
}: PlayerSearchBarProps) {
	const searchId = useId();

	return (
		<div className={cn("flex w-full items-center gap-2", className)}>
			<label className="min-w-0 flex-1" htmlFor={searchId}>
				<span className="sr-only">Search players</span>
				<InputGroup className="h-10 rounded-md border-border bg-bg-surface">
					<InputGroupAddon
						align="inline-start"
						className="pl-3 text-text-disabled [&>svg]:pointer-events-none"
					>
						<Search className="size-4" strokeWidth={2} />
					</InputGroupAddon>
					<InputGroupInput
						id={searchId}
						type="search"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
						className={cn(
							"text-small text-text-primary placeholder:text-text-disabled",
							"h-10 min-h-10 py-0",
						)}
					/>
				</InputGroup>
			</label>
			<Button
				type="button"
				variant="outline"
				className="h-10 shrink-0 uppercase text-label font-bold tracking-widest gap-2"
				onClick={onFilterClick}
			>
				<Filter className="size-4" />
				Filter
			</Button>
		</div>
	);
}
