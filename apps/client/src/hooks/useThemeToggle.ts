"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isDark = theme === "dark";
	const toggle = () => setTheme(isDark ? "light" : "dark");

	return { isDark, toggle, mounted };
}
