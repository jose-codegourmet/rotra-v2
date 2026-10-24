import Image from "next/image";

import { cn } from "@/lib/utils";

export type LogoVariant = "light" | "dark";

export interface LogoProps {
	variant?: LogoVariant;
	className?: string;
}

const logoSrc = {
	dark: {
		full: "/images/logo/ROTRA_FULL_DARK.svg",
		mini: "/images/logo/ROTRA_MINI_DARK.svg",
	},
	light: {
		full: "/images/logo/ROTRA_FULL_LIGHT.svg",
		mini: "/images/logo/ROTRA_MINI_LIGHT.svg",
	},
} as const;

/** From SVG viewBoxes — stabilizes layout (CLS) while CSS scales via object-contain */
const logoDimensions = {
	full: { width: 324, height: 121 },
	mini: { width: 121, height: 121 },
} as const;

/**
 * ROTRA logo component.
 *
 * Uses CSS container queries to automatically switch between the full
 * wordmark (container ≥ 160px wide) and the icon-only mark (< 160px).
 *
 * @param variant - 'dark' renders white/light marks for dark backgrounds (default);
 *                  'light' renders dark marks for light backgrounds.
 * @param className - applied to the container element for sizing / positioning.
 */
export const Logo = ({ variant = "dark", className }: LogoProps) => {
	const src = variant === "dark" ? logoSrc.dark : logoSrc.light;

	return (
		<div
			className={cn("@container", className)}
			style={{ containerName: "logo" }}
		>
			<div className="hidden h-full @[160px]:flex">
				<Image
					src={src.full}
					alt="ROTRA"
					width={logoDimensions.full.width}
					height={logoDimensions.full.height}
					className="h-full w-full object-contain"
					decoding="async"
				/>
			</div>

			<div className="flex h-full @[160px]:hidden">
				<Image
					src={src.mini}
					alt="ROTRA"
					width={logoDimensions.mini.width}
					height={logoDimensions.mini.height}
					className="h-full w-full object-contain"
					decoding="async"
				/>
			</div>
		</div>
	);
};

Logo.displayName = "Logo";
