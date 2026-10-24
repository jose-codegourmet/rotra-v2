import type { Meta, StoryObj } from "@storybook/react";
import { SkillCalibrationCard } from "./SkillCalibrationCard";

const MOCK_USER = {
	id: "user-1",
	name: "Alex Chen",
	avatarUrl: null,
};

const meta: Meta<typeof SkillCalibrationCard> = {
	title: "profile/SkillCalibrationCard",
	component: SkillCalibrationCard,
	tags: ["autodocs"],
	argTypes: {
		user: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof SkillCalibrationCard>;

export const Default: Story = {
	args: {
		user: MOCK_USER,
	},
};

export const HighSkill: Story = {
	args: {
		user: { ...MOCK_USER, name: "Elena Reyes" },
	},
};

export const LowSkill: Story = {
	args: {
		user: { ...MOCK_USER, name: "Sam Lee" },
	},
};
