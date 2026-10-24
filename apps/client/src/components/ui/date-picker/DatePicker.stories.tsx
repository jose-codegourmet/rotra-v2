"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { DatePicker } from "@/components/ui/date-picker/DatePicker";

function DatePickerDemo({
	fromDate,
	disabled,
}: {
	fromDate?: Date;
	disabled?: boolean;
}) {
	const [value, setValue] = useState<string>("");

	return (
		<DatePicker
			value={value}
			onChange={setValue}
			{...(fromDate !== undefined ? { fromDate } : {})}
			{...(disabled !== undefined ? { disabled } : {})}
		/>
	);
}

const meta: Meta<typeof DatePicker> = {
	title: "UI/DatePicker",
	component: DatePicker,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
	render: () => <DatePickerDemo />,
};

export const WithMinDate: Story = {
	render: () => <DatePickerDemo fromDate={new Date()} />,
};

export const Disabled: Story = {
	render: () => <DatePickerDemo disabled />,
};
