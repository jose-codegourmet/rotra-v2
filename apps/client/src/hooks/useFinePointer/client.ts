"use client";

import { useEffect, useState } from "react";

/** True when the primary input supports hover (desktop mouse/trackpad). */
export function useFinePointer(): boolean {
	const [hasFinePointer, setHasFinePointer] = useState(true);

	useEffect(() => {
		const media = window.matchMedia("(pointer: fine)");
		const update = () => setHasFinePointer(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	return hasFinePointer;
}
