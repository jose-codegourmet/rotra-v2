import type { Preview } from "@storybook/react";
import "../src/app/globals.css";
import { SATOSHI_FONT_STACK } from "./satoshi-font-stack";

const preview: Preview = {
	globalTypes: {
		theme: {
			description: "Color theme",
			toolbar: {
				title: "Theme",
				icon: "circlehollow",
				items: [
					{ value: "light", icon: "sun", title: "Light" },
					{ value: "dark", icon: "moon", title: "Dark" },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		theme: "dark",
	},
	parameters: {
		backgrounds: { disable: true },
		actions: { argTypesRegex: "^on[A-Z].*" },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [
		(Story) => {
			/* next/font’s --font-satoshi uses a private family; Storybook often omits its @font-face.
			   Inline style beats the variable class so font-sans resolves to globals.css @font-face "Satoshi". */
			document.documentElement.style.setProperty(
				"--font-satoshi",
				SATOSHI_FONT_STACK,
			);
			return Story();
		},
		(Story, context) => {
			const theme = (context.globals.theme as string) ?? "dark";
			document.documentElement.classList.toggle("dark", theme === "dark");
			document.documentElement.style.backgroundColor =
				theme === "dark" ? "#0b0b0c" : "#ffffff";
			return Story();
		},
	],
};

export default preview;
