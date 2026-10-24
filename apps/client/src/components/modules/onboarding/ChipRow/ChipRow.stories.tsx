import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { ChipRow } from "./ChipRow";

const OPTIONS = [
	{ v: "singles", label: "Singles" },
	{ v: "doubles", label: "Doubles" },
	{ v: "both", label: "Both" },
] as const;

const meta = {
	title: "Modules/Onboarding/ChipRow",
	component: ChipRow,
	parameters: { layout: "centered" },
} satisfies Meta<typeof ChipRow>;

export default meta;

type Story = StoryObj<typeof meta>;
type ChipValue = (typeof OPTIONS)[number]["v"] | "";

export const Interactive: Story = {
	args: {
		value: "doubles",
		onChange: () => {},
		options: [...OPTIONS],
	},
	render: () => {
		const [value, setValue] = useState<ChipValue>("doubles");
		return (
			<div className="w-[320px]">
				<ChipRow
					value={value}
					onChange={(next) => setValue(next as ChipValue)}
					options={[...OPTIONS]}
				/>
			</div>
		);
	},
};
