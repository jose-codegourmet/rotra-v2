"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StepBlockProps = {
	kicker: string;
	title: string;
	subtitle: string;
	children: ReactNode;
	/** Heading block only; children stay full width for forms and chip lists. */
	align?: "start" | "center";
};

export function StepBlock({
	kicker,
	title,
	subtitle,
	children,
	align = "start",
}: StepBlockProps) {
	return (
		<div className="flex flex-col gap-4">
			<div
				className={cn(
					"flex flex-col gap-4",
					align === "center" && "text-center",
				)}
			>
				<p
					className={cn(
						"text-small text-text-secondary",
						align === "center" &&
							"md:font-black md:uppercase md:tracking-widest",
					)}
				>
					{kicker}
				</p>
				<h2
					className={cn(
						"text-xl font-semibold tracking-tight text-text-primary",
						align === "center" &&
							"md:text-2xl md:font-black md:uppercase md:tracking-tighter",
					)}
				>
					{title}
				</h2>
				<p
					className={cn(
						"text-body text-text-secondary",
						align === "center" && "md:mx-auto md:max-w-md",
					)}
				>
					{subtitle}
				</p>
			</div>
			{children}
		</div>
	);
}
