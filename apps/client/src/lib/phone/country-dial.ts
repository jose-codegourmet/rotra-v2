/** ISO 3166-1 alpha-2 → country calling code (digits only, no +). */
export const COUNTRY_CALLING_CODES = {
	PH: "63",
	US: "1",
	GB: "44",
	SG: "65",
	MY: "60",
	AU: "61",
	JP: "81",
	IN: "91",
	ID: "62",
	TH: "66",
	VN: "84",
	CA: "1",
} as const;

export type IsoCountry = keyof typeof COUNTRY_CALLING_CODES;

export const COUNTRY_LABELS: Record<IsoCountry, string> = {
	PH: "Philippines",
	US: "United States",
	GB: "United Kingdom",
	SG: "Singapore",
	MY: "Malaysia",
	AU: "Australia",
	JP: "Japan",
	IN: "India",
	ID: "Indonesia",
	TH: "Thailand",
	VN: "Vietnam",
	CA: "Canada",
};

export function dialDigitsFor(iso: string): string {
	return COUNTRY_CALLING_CODES[iso as IsoCountry] ?? "";
}

/** National digits only; returns E.164 including + or null if invalid. */
export function toE164(iso: string, nationalDigits: string): string | null {
	const cc = dialDigitsFor(iso);
	const nat = nationalDigits.replace(/\D/g, "");
	if (!cc || !nat) return null;
	const full = `+${cc}${nat}`;
	if (!/^\+[1-9]\d{6,14}$/.test(full)) return null;
	return full;
}

const ISO_ORDER = Object.keys(COUNTRY_CALLING_CODES) as IsoCountry[];

/** Best-effort split of E.164 into ISO + national (longest calling code match). */
export function splitE164(
	e164: string,
): { iso: IsoCountry; nationalDigits: string } | null {
	const trimmed = e164.trim();
	const m = trimmed.match(/^\+(\d{6,15})$/);
	if (!m?.[1]) return null;
	const digits = m[1];
	const sorted = [...ISO_ORDER].sort(
		(a, b) => dialDigitsFor(b).length - dialDigitsFor(a).length,
	);
	for (const iso of sorted) {
		const cc = dialDigitsFor(iso);
		if (cc && digits.startsWith(cc)) {
			return { iso, nationalDigits: digits.slice(cc.length) };
		}
	}
	return null;
}
