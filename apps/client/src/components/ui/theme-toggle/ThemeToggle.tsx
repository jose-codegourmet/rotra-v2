"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeToggle } from "@/hooks/useThemeToggle";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
	variant?: "icon" | "row";
	className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
	const { toggle, mounted } = useThemeToggle();

	if (variant === "row") {
		return (
			<button
				type="button"
				onClick={mounted ? toggle : undefined}
				className={cn(
					"w-full flex items-center px-6 py-4 text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors duration-default",
					className,
				)}
			>
				<Moon
					size={20}
					strokeWidth={1.5}
					className="mr-4 shrink-0 dark:hidden"
				/>
				<Sun
					size={20}
					strokeWidth={1.5}
					className="mr-4 shrink-0 hidden dark:block"
				/>
				<span className="text-label font-medium uppercase tracking-widest dark:hidden">
					Dark Mode
				</span>
				<span className="text-label font-medium uppercase tracking-widest hidden dark:block">
					Light Mode
				</span>
			</button>
		);
	}

	return (
		<button
			type="button"
			aria-label="Toggle theme"
			onClick={mounted ? toggle : undefined}
			className={cn(
				"text-text-disabled hover:text-accent transition-colors duration-default",
				className,
			)}
		>
			<Moon size={20} strokeWidth={1.5} className="dark:hidden" />
			<Sun size={20} strokeWidth={1.5} className="hidden dark:block" />
		</button>
	);
}
