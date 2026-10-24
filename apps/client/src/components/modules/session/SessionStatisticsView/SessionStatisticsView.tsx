"use client";

import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { ChartPoint } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

import { KpiCard } from "../KpiCard/KpiCard";

const ACCENT = "var(--color-accent)";
const MUTED = "rgba(255,255,255,0.12)";
const LABEL = "var(--color-text-secondary)";

export interface SessionStatisticsViewProps {
	title?: string;
	kpis: readonly { label: string; value: string; hint?: string }[];
	chartData: ChartPoint[];
	className?: string;
}

export function SessionStatisticsView({
	title = "Statistics",
	kpis,
	chartData,
	className,
}: SessionStatisticsViewProps) {
	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<h2 className="text-display font-bold text-text-primary tracking-tight">
				{title}
			</h2>

			<div className="flex flex-wrap gap-3">
				{kpis.map((k) => (
					<KpiCard
						key={k.label}
						label={k.label}
						value={k.value}
						{...(k.hint !== undefined ? { hint: k.hint } : {})}
					/>
				))}
			</div>

			<div className="rounded-lg bg-bg-surface border border-border p-4 flex flex-col gap-2">
				<div>
					<p className="text-label font-bold uppercase tracking-widest text-text-primary">
						Session attendance
					</p>
					<p className="text-micro text-text-disabled uppercase tracking-wider mt-0.5">
						Players active (6PM – 10PM)
					</p>
				</div>
				<div className="w-full" style={{ height: 280 }}>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={chartData}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
									<stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid stroke={MUTED} vertical={false} />
							<XAxis
								dataKey="slot"
								tick={{ fill: LABEL, fontSize: 10 }}
								axisLine={false}
								tickLine={false}
							/>
							<YAxis
								tick={{ fill: LABEL, fontSize: 10 }}
								axisLine={false}
								tickLine={false}
								width={32}
							/>
							<Tooltip
								contentStyle={{
									background: "var(--color-bg-surface)",
									border: "1px solid var(--color-border)",
									borderRadius: 8,
								}}
								labelStyle={{ color: LABEL }}
							/>
							<Legend
								wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
								formatter={(value) => (
									<span className="text-text-secondary">{value}</span>
								)}
							/>
							<Area
								type="monotone"
								dataKey="projected"
								name="Projected"
								stroke={LABEL}
								fill="none"
								strokeWidth={1.5}
								strokeDasharray="4 4"
							/>
							<Area
								type="monotone"
								dataKey="live"
								name="Live"
								stroke={ACCENT}
								strokeWidth={2}
								fill="url(#liveFill)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
				<p className="text-micro text-text-disabled text-center uppercase tracking-widest">
					Schedule → Players active
				</p>
			</div>

			<div className="rounded-lg bg-bg-surface border border-border p-4 h-[220px] flex flex-col">
				<p className="text-label font-bold uppercase tracking-widest text-text-primary mb-2">
					Schedule load (secondary)
				</p>
				<div className="flex-1 min-h-0">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={chartData}
							margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
						>
							<CartesianGrid stroke={MUTED} vertical={false} />
							<XAxis dataKey="slot" hide />
							<YAxis hide />
							<Area
								type="monotone"
								dataKey="live"
								stroke={ACCENT}
								fill={ACCENT}
								fillOpacity={0.15}
								strokeWidth={2}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}
