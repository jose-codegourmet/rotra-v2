import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "@/components/ui/input/Input";

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "./Field";

const meta: Meta<typeof Field> = {
	title: "UI/Field",
	component: Field,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Vertical: Story = {
	render: () => (
		<Field>
			<FieldLabel htmlFor="field-name">Display name</FieldLabel>
			<Input id="field-name" placeholder="Your name" />
			<FieldDescription>Shown on your profile.</FieldDescription>
		</Field>
	),
};

export const Horizontal: Story = {
	render: () => (
		<Field orientation="horizontal">
			<FieldLabel htmlFor="field-sub">Subscribe</FieldLabel>
			<Input id="field-sub" type="email" placeholder="you@example.com" />
		</Field>
	),
};

export const Fieldset: Story = {
	render: () => (
		<FieldSet>
			<FieldLegend>Contact</FieldLegend>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="field-email">Email</FieldLabel>
					<Input id="field-email" type="email" autoComplete="email" />
				</Field>
				<Field>
					<FieldLabel htmlFor="field-phone">Phone</FieldLabel>
					<Input id="field-phone" type="tel" />
				</Field>
			</FieldGroup>
		</FieldSet>
	),
};
