import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

const meta: Meta<typeof Tabs> = {
	title: "UI/Tabs",
	component: Tabs,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue="a" className="w-full max-w-md">
			<TabsList>
				<TabsTrigger value="a">First</TabsTrigger>
				<TabsTrigger value="b">Second</TabsTrigger>
				<TabsTrigger value="c">Third</TabsTrigger>
			</TabsList>
			<TabsContent value="a" className="mt-4 text-small text-text-secondary">
				Content for the first tab.
			</TabsContent>
			<TabsContent value="b" className="mt-4 text-small text-text-secondary">
				Content for the second tab.
			</TabsContent>
			<TabsContent value="c" className="mt-4 text-small text-text-secondary">
				Content for the third tab.
			</TabsContent>
		</Tabs>
	),
};
