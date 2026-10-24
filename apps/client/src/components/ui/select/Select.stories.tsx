"use client";

import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "@/components/ui/field/Field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./Select";

const meta: Meta<typeof Select> = {
	title: "UI/Select",
	component: Select,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
	render: () => (
		<Select defaultValue="apple">
			<SelectTrigger className="w-[200px]">
				<SelectValue placeholder="Pick a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectItem value="apple">Apple</SelectItem>
					<SelectItem value="banana">Banana</SelectItem>
					<SelectItem value="blueberry">Blueberry</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select disabled defaultValue="apple">
			<SelectTrigger className="w-[200px]">
				<SelectValue placeholder="Pick a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectItem value="apple">Apple</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Invalid: Story = {
	render: () => (
		<Field data-invalid>
			<Select>
				<SelectTrigger className="w-[200px]" aria-invalid>
					<SelectValue placeholder="Pick a fruit" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectItem value="apple">Apple</SelectItem>
						<SelectItem value="banana">Banana</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
		</Field>
	),
};
