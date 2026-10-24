interface MatchDateBlockProps {
	date: string;
}

export function MatchDateBlock({ date }: MatchDateBlockProps) {
	const parsed = new Date(date);
	const month = parsed
		.toLocaleString("en-US", { month: "short" })
		.toUpperCase();
	const day = parsed.getUTCDate().toString();

	return (
		<div className="flex flex-col items-center justify-center bg-bg-elevated w-12 h-12 rounded-lg shrink-0">
			<span className="text-[9px] font-black text-text-secondary uppercase leading-none">
				{month}
			</span>
			<span className="text-lg font-black text-text-primary leading-none">
				{day}
			</span>
		</div>
	);
}
