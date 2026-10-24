import { TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs";
import { cn } from "@/lib/utils";

export interface ConsoleTabNavProps<T extends string> {
	tabIds: readonly T[];
	labels: Record<T, string>;
	className?: string;
}

export function ConsoleTabNav<T extends string>({
	tabIds,
	labels,
	className,
}: ConsoleTabNavProps<T>) {
	return (
		<TabsList
			className={cn("w-full justify-start overflow-x-auto", className)}
			aria-label="Session views"
		>
			{tabIds.map((id) => (
				<TabsTrigger key={id} value={id}>
					{labels[id]}
				</TabsTrigger>
			))}
		</TabsList>
	);
}
