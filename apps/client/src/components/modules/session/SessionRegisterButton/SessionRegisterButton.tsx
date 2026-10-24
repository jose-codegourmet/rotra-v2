"use client";

import { cn } from "@/lib/utils";

export interface SessionRegisterButtonProps {
	className?: string;
	children?: React.ReactNode;
}

/**
 * Register CTA for session list cards. Client-only so it can sit beside `Link`
 * without living inside an `<a>` (invalid HTML) and without server `onClick`.
 */
export function SessionRegisterButton({
	className,
	children = "Register",
}: SessionRegisterButtonProps) {
	return (
		<button
			type="button"
			className={cn(
				"h-9 px-4 text-small font-bold uppercase tracking-widest text-bg-base bg-accent rounded-md hover:opacity-90 transition-opacity duration-default shrink-0",
				className,
			)}
			onClick={() => {
				// Stub — wire to registration flow later
			}}
		>
			{children}
		</button>
	);
}
