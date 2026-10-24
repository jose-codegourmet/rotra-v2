import { TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs";
import {
	SESSION_TAB_IDS,
	SESSION_TAB_LABELS,
} from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

export interface SessionTabNavProps {
	className?: string;
}

/**
 * Must be rendered inside a parent {@link Tabs} from `@/components/ui/tabs/Tabs`.
 */
export function SessionTabNav({ className }: SessionTabNavProps) {
	return (
		<TabsList
			className={cn("w-full justify-start", className)}
			aria-label="Session views"
		>
			{SESSION_TAB_IDS.map((id) => (
				<TabsTrigger key={id} value={id}>
					{SESSION_TAB_LABELS[id]}
				</TabsTrigger>
			))}
		</TabsList>
	);
}
