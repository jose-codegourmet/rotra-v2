import { toast } from "sonner";
import type { SessionJoinFixture } from "@/constants/mock-session-join";

export function resolveShareUrl(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	if (typeof window === "undefined") return path;
	return new URL(path, window.location.origin).toString();
}

export async function shareJoinLink(
	session: SessionJoinFixture,
): Promise<void> {
	const url = resolveShareUrl(session.sharePath);
	try {
		if (typeof navigator !== "undefined" && navigator.share) {
			await navigator.share({
				title: session.shareTitle,
				text: session.shareText,
				url,
			});
			return;
		}
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(url);
			toast.success("Join link copied.");
			return;
		}
		toast.message(url);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") return;
		toast.error("Could not share the join link.");
	}
}

export function buildDecorativeQrCells(size = 21): boolean[][] {
	const cells = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => false),
	);

	const setCell = (row: number, col: number, value: boolean) => {
		const line = cells[row];
		if (!line || col < 0 || col >= line.length) return;
		line[col] = value;
	};

	const paintFinder = (row: number, col: number) => {
		for (let i = 0; i < 7; i += 1) {
			for (let j = 0; j < 7; j += 1) {
				const edge = i === 0 || i === 6 || j === 0 || j === 6;
				const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
				setCell(row + i, col + j, edge || inner);
			}
		}
	};

	paintFinder(0, 0);
	paintFinder(0, size - 7);
	paintFinder(size - 7, 0);

	for (let i = 8; i < size - 8; i += 1) {
		setCell(6, i, i % 2 === 0);
		setCell(i, 6, i % 2 === 0);
	}

	for (let row = 0; row < size; row += 1) {
		for (let col = 0; col < size; col += 1) {
			const inTopLeft = row < 8 && col < 8;
			const inTopRight = row < 8 && col >= size - 8;
			const inBottomLeft = row >= size - 8 && col < 8;
			if (inTopLeft || inTopRight || inBottomLeft) continue;
			if (row === 6 || col === 6) continue;
			setCell(row, col, (row * 7 + col * 13) % 5 < 2);
		}
	}

	return cells;
}
