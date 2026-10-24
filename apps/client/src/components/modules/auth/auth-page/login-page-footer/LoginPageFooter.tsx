import Link from "next/link";
import { Logo } from "@/components/ui/logo/Logo";
import { cn } from "@/lib/utils";

export type LoginPageFooterProps = React.ComponentProps<"footer"> & {
	showSystemStatus?: boolean;
};

export const LoginPageFooter = ({
	className,
	showSystemStatus = false,
	...props
}: LoginPageFooterProps) => {
	return (
		<footer
			className={cn(
				"fixed bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-center gap-4 bg-transparent px-6 py-5 md:flex-row md:gap-8",
				className,
			)}
			{...props}
		>
			<Logo variant="dark" className="h-6 w-6" />

			<div className="flex items-center gap-6">
				<Link
					href="/privacy"
					className="text-[0.6875rem] font-medium tracking-[0.1em] text-text-secondary uppercase transition-colors duration-150 hover:opacity-80"
				>
					Privacy Policy
				</Link>
				<Link
					href="/terms"
					className="text-[0.6875rem] font-medium tracking-[0.1em] text-text-secondary uppercase transition-colors duration-150 hover:opacity-80"
				>
					Terms of Service
				</Link>
				{showSystemStatus ? (
					<Link
						href="/status"
						className="text-[0.6875rem] font-medium tracking-[0.1em] text-text-secondary uppercase transition-colors duration-150 hover:opacity-80"
					>
						System Status
					</Link>
				) : null}
			</div>

			<span className="text-[0.6875rem] font-medium tracking-[0.1em] text-text-secondary uppercase">
				© 2025 ROTRA
			</span>
		</footer>
	);
};
