// Pure numeric/string helpers for the editor — extracted statics.

export function _toFiniteNum(x: unknown): number | undefined {
	if (typeof x === 'number' && Number.isFinite(x)) return x;
	if (typeof x === 'string' && x.trim() !== '') {
		const n = Number(x);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

export function _clamp255(n: number): number {
	return Math.max(0, Math.min(255, Math.round(n)));
}

export function _getStr(obj: unknown, key: string): string | undefined {
	if (!obj || typeof obj !== 'object') return undefined;
	const val = (obj as Record<string, unknown>)[key];
	return typeof val === 'string' ? val : undefined;
}
