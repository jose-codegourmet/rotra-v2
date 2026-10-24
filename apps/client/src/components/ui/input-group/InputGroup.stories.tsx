import type { Meta, StoryObj } from "@storybook/react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "./InputGroup";

const meta: Meta<typeof InputGroup> = {
	title: "UI/InputGroup",
	component: InputGroup,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InputGroup>;

export const WithLeadingAddon: Story = {
	render: () => (
		<InputGroup className="max-w-sm">
			<InputGroupAddon>
				<InputGroupText>https://</InputGroupText>
			</InputGroupAddon>
			<InputGroupInput placeholder="example.com" />
		</InputGroup>
	),
};

export const WithIconAndButton: Story = {
	render: () => (
		<InputGroup className="max-w-sm">
			<InputGroupAddon align="inline-start">
				<Search className="text-muted-foreground" aria-hidden />
			</InputGroupAddon>
			<InputGroupInput placeholder="Search…" />
			<InputGroupAddon align="inline-end">
				<InputGroupButton type="button">Go</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	),
};

export const WithTrailingButton: Story = {
	render: () => (
		<InputGroup className="max-w-sm">
			<InputGroupInput placeholder="Email" type="email" />
			<InputGroupAddon align="inline-end">
				<Button type="button" variant="ghost" size="sm" className="h-6 px-2">
					Send
				</Button>
			</InputGroupAddon>
		</InputGroup>
	),
};
