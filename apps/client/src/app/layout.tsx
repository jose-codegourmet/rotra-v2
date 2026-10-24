import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthSync } from "@/providers/AuthSync";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./globals.css";
import { cn } from "@/lib/utils";
import { satoshi } from "./fonts";

export const metadata: Metadata = {
	title: "ROTRA",
	description: "The badminton session platform.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={cn("font-sans", satoshi.variable)}
			suppressHydrationWarning
		>
			<body className="bg-bg-base text-text-primary antialiased font-sans">
				<ReduxProvider>
					<AuthSync>
						<QueryProvider>
							<ThemeProvider>
								{children}
								<Toaster position="top-center" duration={4000} />
							</ThemeProvider>
						</QueryProvider>
					</AuthSync>
				</ReduxProvider>
			</body>
		</html>
	);
}
