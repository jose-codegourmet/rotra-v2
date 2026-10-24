"use client";

import {
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ResponsiveContainer,
} from "recharts";

export interface SkillRadarChartData {
	subject: string;
	value: number;
	fullMark: number;
}

interface SkillRadarChartProps {
	data: SkillRadarChartData[];
}

const ACCENT = "var(--color-accent)";
const GRID_STROKE = "rgba(255,255,255,0.06)";
const LABEL_COLOR = "var(--color-text-secondary)";

export function SkillRadarChart({ data }: SkillRadarChartProps) {
	return (
		<div
			className="relative w-full"
			style={{
				height: 260,
				background:
					"radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)",
				borderRadius: "50%",
			}}
		>
			<ResponsiveContainer width="100%" height={260}>
				<RadarChart
					data={data}
					margin={{ top: 28, right: 36, bottom: 28, left: 36 }}
				>
					<PolarGrid
						stroke={GRID_STROKE}
						strokeWidth={0.5}
						gridType="polygon"
					/>
					<PolarAngleAxis
						dataKey="subject"
						tick={{
							fill: LABEL_COLOR,
							fontSize: 9,
							fontWeight: 700,
							letterSpacing: "0.1em",
						}}
						tickLine={false}
					/>
					<Radar
						dataKey="value"
						stroke={ACCENT}
						fill={ACCENT}
						fillOpacity={0.18}
						strokeWidth={1.5}
						dot={false}
					/>
				</RadarChart>
			</ResponsiveContainer>
		</div>
	);
}
