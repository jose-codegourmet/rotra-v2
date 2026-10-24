import { cva, type VariantProps } from "class-variance-authority";

export const paginationLinkVariants = cva(
	"inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border px-3 text-small font-medium transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
				active:
					"border-accent bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent",
				ghost:
					"border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
			},
			size: {
				default: "h-9 min-w-9 px-3",
				icon: "size-9 p-0",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export type PaginationLinkVariants = VariantProps<
	typeof paginationLinkVariants
>;
