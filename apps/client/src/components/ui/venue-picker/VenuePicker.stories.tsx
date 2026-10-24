import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
	MOCK_VENUE_PICKER_CONFIRMED,
	MOCK_VENUE_PICKER_NEW,
} from "@/constants/places-mocks";
import { VenuePicker, type VenuePickerValue } from "./VenuePicker";

function VenuePickerControlled({
	initialValue = null,
	disabled = false,
}: {
	initialValue?: VenuePickerValue | null;
	disabled?: boolean;
}) {
	const [value, setValue] = useState<VenuePickerValue | null>(initialValue);

	return (
		<div className="max-w-md p-4">
			<VenuePicker value={value} onChange={setValue} disabled={disabled} />
		</div>
	);
}

const meta: Meta<typeof VenuePicker> = {
	title: "UI/VenuePicker",
	component: VenuePicker,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof VenuePicker>;

export const Empty: Story = {
	render: () => <VenuePickerControlled />,
};

export const ConfirmedSelection: Story = {
	render: () => (
		<VenuePickerControlled initialValue={MOCK_VENUE_PICKER_CONFIRMED} />
	),
};

export const NewPinSet: Story = {
	render: () => <VenuePickerControlled initialValue={MOCK_VENUE_PICKER_NEW} />,
};

export const Disabled: Story = {
	render: () => (
		<VenuePickerControlled
			initialValue={MOCK_VENUE_PICKER_CONFIRMED}
			disabled
		/>
	),
};
