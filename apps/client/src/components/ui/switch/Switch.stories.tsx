import type { Meta, StoryObj } from "@storybook/react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field/Field";
import { Switch } from "./Switch";

const meta: Meta<typeof Switch> = {
	title: "UI/Switch",
	component: Switch,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
	render: () => <Switch id="switch-default" />,
};

export const Checked: Story = {
	render: () => <Switch id="switch-checked" defaultChecked />,
};

export const Disabled: Story = {
	render: () => <Switch id="switch-disabled" disabled />,
};

export const Invalid: Story = {
	render: () => (
		<Field orientation="horizontal" data-invalid className="w-fit">
			<Switch id="switch-invalid" aria-invalid />
			<FieldContent>
				<FieldLabel htmlFor="switch-invalid">Accept terms</FieldLabel>
				<FieldDescription>Required field example.</FieldDescription>
			</FieldContent>
		</Field>
	),
};

export const Sizes: Story = {
	render: () => (
		<FieldGroup className="w-full max-w-[12rem]">
			<Field orientation="horizontal">
				<Switch id="switch-size-sm" size="sm" />
				<FieldLabel htmlFor="switch-size-sm">Small</FieldLabel>
			</Field>
			<Field orientation="horizontal">
				<Switch id="switch-size-default" size="default" />
				<FieldLabel htmlFor="switch-size-default">Default</FieldLabel>
			</Field>
		</FieldGroup>
	),
};
