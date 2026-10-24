"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { addDays, format } from "date-fns";
import { useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker/DateRangePicker";

function DateRangePickerControlled({
	initialFrom,
	initialTo,
}: {
	initialFrom?: string;
	initialTo?: string;
}) {
	const [from, setFrom] = useState<string | undefined>(initialFrom);
	const [to, setTo] = useState<string | undefined>(initialTo);

	return (
		<div className="mx-auto max-w-3xl rounded-2xl border border-outline-variant/10 bg-bg-elevated p-6">
			<DateRangePicker
				{...(from !== undefined ? { from } : {})}
				{...(to !== undefined ? { to } : {})}
				onChange={(nextFrom, nextTo) => {
					setFrom(nextFrom);
					setTo(nextTo);
				}}
			/>
			<p className="mt-4 text-center text-xs text-text-secondary">
				Selected: {from ?? "—"} {to && to !== from ? `→ ${to}` : ""}
			</p>
		</div>
	);
}

const meta: Meta<typeof DateRangePicker> = {
	title: "UI/DateRangePicker",
	component: DateRangePicker,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
	render: () => <DateRangePickerControlled />,
};

export const WithRangeSelected: Story = {
	render: () => {
		const start = new Date();
		const end = addDays(start, 5);

		return (
			<DateRangePickerControlled
				initialFrom={format(start, "yyyy-MM-dd")}
				initialTo={format(end, "yyyy-MM-dd")}
			/>
		);
	},
};

export const WithFlexibility: Story = {
	render: () => {
		const start = addDays(new Date(), 3);
		const end = addDays(start, 4);

		return (
			<DateRangePickerControlled
				initialFrom={format(start, "yyyy-MM-dd")}
				initialTo={format(end, "yyyy-MM-dd")}
			/>
		);
	},
};
