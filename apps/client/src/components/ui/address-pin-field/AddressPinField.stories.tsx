import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MOCK_ADDRESS_PIN_VALUE } from "@/constants/places-mocks";
import { AddressPinField, type AddressPinValue } from "./AddressPinField";

function AddressPinFieldControlled({
	initialValue = null,
	disabled = false,
}: {
	initialValue?: AddressPinValue | null;
	disabled?: boolean;
}) {
	const [value, setValue] = useState<AddressPinValue | null>(initialValue);

	return (
		<div className="max-w-xl p-4">
			<AddressPinField
				value={value}
				onChange={setValue}
				label="Venue location"
				disabled={disabled}
			/>
		</div>
	);
}

const meta: Meta<typeof AddressPinField> = {
	title: "UI/AddressPinField",
	component: AddressPinField,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof AddressPinField>;

export const Default: Story = {
	render: () => <AddressPinFieldControlled />,
};

export const WithValue: Story = {
	render: () => (
		<AddressPinFieldControlled initialValue={MOCK_ADDRESS_PIN_VALUE} />
	),
};

export const Disabled: Story = {
	render: () => (
		<AddressPinFieldControlled initialValue={MOCK_ADDRESS_PIN_VALUE} disabled />
	),
};
