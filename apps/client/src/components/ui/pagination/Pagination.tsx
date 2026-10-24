"use client";

import { Slot } from "@radix-ui/react-slot";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
} from "lucide-react";
import * as React from "react";
import {
	type PaginationLinkVariants,
	paginationLinkVariants,
} from "@/components/ui/pagination/Pagination.variants";
import { cn } from "@/lib/utils";

export type PaginationProps = React.ComponentProps<"nav">;

export const Pagination = ({ className, ...props }: PaginationProps) => (
	<nav
		aria-label="pagination"
		className={cn("mx-auto flex w-full justify-center", className)}
		{...props}
	/>
);

export type PaginationContentProps = React.ComponentProps<"ul">;

export const PaginationContent = React.forwardRef<
	HTMLUListElement,
	PaginationContentProps
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		className={cn("flex flex-row items-center gap-1", className)}
		{...props}
	/>
));
PaginationContent.displayName = "PaginationContent";

export type PaginationItemProps = React.ComponentProps<"li">;

export const PaginationItem = React.forwardRef<
	HTMLLIElement,
	PaginationItemProps
>((props, ref) => <li ref={ref} {...props} />);
PaginationItem.displayName = "PaginationItem";

export type PaginationLinkProps = React.ComponentProps<"a"> &
	PaginationLinkVariants & {
		asChild?: boolean;
		isActive?: boolean;
	};

export const PaginationLink = React.forwardRef<
	HTMLAnchorElement,
	PaginationLinkProps
>(({ className, isActive, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "a";

	return (
		<Comp
			ref={ref}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				paginationLinkVariants({
					variant: variant ?? (isActive ? "active" : "default"),
					size,
					className,
				}),
			)}
			{...props}
		/>
	);
});
PaginationLink.displayName = "PaginationLink";

export type PaginationPreviousProps = React.ComponentProps<
	typeof PaginationLink
> & {
	text?: string;
};

export const PaginationPrevious = ({
	className,
	text = "Previous",
	...props
}: PaginationPreviousProps) => (
	<PaginationLink
		aria-label="Go to previous page"
		size="default"
		className={cn("gap-1.5 px-2.5 sm:px-3", className)}
		{...props}
	>
		<ChevronLeftIcon className="size-4" />
		<span className="hidden sm:block">{text}</span>
	</PaginationLink>
);

export type PaginationNextProps = React.ComponentProps<
	typeof PaginationLink
> & {
	text?: string;
};

export const PaginationNext = ({
	className,
	text = "Next",
	...props
}: PaginationNextProps) => (
	<PaginationLink
		aria-label="Go to next page"
		size="default"
		className={cn("gap-1.5 px-2.5 sm:px-3", className)}
		{...props}
	>
		<span className="hidden sm:block">{text}</span>
		<ChevronRightIcon className="size-4" />
	</PaginationLink>
);

export type PaginationEllipsisProps = React.ComponentProps<"span">;

export const PaginationEllipsis = ({
	className,
	...props
}: PaginationEllipsisProps) => (
	<span
		aria-hidden
		className={cn(
			"flex h-9 min-w-9 items-center justify-center text-text-secondary",
			className,
		)}
		{...props}
	>
		<MoreHorizontalIcon className="size-4" />
		<span className="sr-only">More pages</span>
	</span>
);
