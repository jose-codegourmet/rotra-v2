"use client";

import type { Meta, StoryObj } from "@storybook/react";

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field/Field";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";

const meta: Meta<typeof RadioGroup> = {
	title: "UI/RadioGroup",
	component: RadioGroup,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
	render: () => (
		<RadioGroup defaultValue="comfortable">
			<div className="flex flex-col gap-3">
				<Field orientation="horizontal">
					<RadioGroupItem value="default" id="rg-default" />
					<FieldLabel htmlFor="rg-default">Default</FieldLabel>
				</Field>
				<Field orientation="horizontal">
					<RadioGroupItem value="comfortable" id="rg-comfortable" />
					<FieldLabel htmlFor="rg-comfortable">Comfortable</FieldLabel>
				</Field>
				<Field orientation="horizontal">
					<RadioGroupItem value="compact" id="rg-compact" />
					<FieldLabel htmlFor="rg-compact">Compact</FieldLabel>
				</Field>
			</div>
		</RadioGroup>
	),
};

export const WithDescription: Story = {
	render: () => (
		<RadioGroup defaultValue="monthly">
			<FieldGroup>
				<div className="flex flex-col gap-1.5">
					<p className="text-sm font-medium">Billing</p>
					<FieldDescription>
						Choose a plan. Yearly is disabled in this example.
					</FieldDescription>
				</div>
				<div className="flex flex-col gap-4">
					<Field orientation="horizontal">
						<RadioGroupItem value="monthly" id="plan-monthly" />
						<FieldLabel htmlFor="plan-monthly">Monthly</FieldLabel>
					</Field>
					<Field orientation="horizontal">
						<RadioGroupItem value="yearly" id="plan-yearly" disabled />
						<FieldLabel htmlFor="plan-yearly">Yearly (coming soon)</FieldLabel>
					</Field>
				</div>
			</FieldGroup>
		</RadioGroup>
	),
};

export const Invalid: Story = {
	render: () => (
		<Field data-invalid>
			<FieldLabel>Notification</FieldLabel>
			<RadioGroup>
				<div className="flex flex-col gap-3">
					<Field orientation="horizontal">
						<RadioGroupItem value="email" id="inv-email" aria-invalid />
						<FieldLabel htmlFor="inv-email">Email</FieldLabel>
					</Field>
					<Field orientation="horizontal">
						<RadioGroupItem value="sms" id="inv-sms" />
						<FieldLabel htmlFor="inv-sms">SMS</FieldLabel>
					</Field>
				</div>
			</RadioGroup>
		</Field>
	),
};
