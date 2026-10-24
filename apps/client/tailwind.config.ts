import baseConfig from "@rotra/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
	...baseConfig,
	content: [
		"./src/**/*.{ts,tsx}",
		"../../packages/legal-content/src/**/*.{ts,tsx}",
	],
};

export default config;
