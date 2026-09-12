import { HomeAssistant } from 'custom-card-helpers';
import { fetchHistorySeries } from '../history-cache';

// Vendored copies live in <ha>/config/www and are served at /local/ — try
// them first so the chart works offline; fall back to the CDN.
const ECHARTS_SRC = [
	'/local/echarts-5.5.1.min.js',
	'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js',
];
const ECHARTS_GL_SRC = [
	'/local/echarts-gl-2.1.0.min.js',
	'https://cdn.jsdelivr.net/npm/echarts-gl@2.1.0/dist/echarts-gl.min.js',
];

let echartsGlPromise: Promise<unknown> | null = null;

export function ensureEchartsGl(): Promise<unknown> {
	const w = window as unknown as { echarts?: unknown };
	if (w.echarts && echartsGlPromise) return echartsGlPromise;
	if (!echartsGlPromise) {
		const load = (src: string) =>
			new Promise<void>((res, rej) => {
				const s = document.createElement('script');
				s.src = src;
				s.onload = () => res();
				s.onerror = () => rej(new Error(`script load failed: ${src}`));
				document.head.appendChild(s);
			});
		const loadFirst = async (srcs: string[]) => {
			let err: unknown;
			for (const src of srcs) {
				try {
					await load(src);
					return;
				} catch (e) {
					err = e;
				}
			}
			throw err;
		};
		echartsGlPromise = (async () => {
			if (!w.echarts) await loadFirst(ECHARTS_SRC);
			await loadFirst(ECHARTS_GL_SRC);
			return w.echarts;
		})();
	}
	return echartsGlPromise;
}

function surface3dCacheKey(
	entity: string,
	days: number,
	scale: number,
): string {
	return `pfg3d:${entity}:${days}:${scale}:v2`;
}

type Surface3dCache = {
	grid: number[][];
	dayLabels: string[];
	start: number;
	lastEnd: string;
	ts: number;
};

function readCache(key: string): Surface3dCache | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as Surface3dCache;
	} catch {
		return null;
	}
}

function writeCache(
	key: string,
	grid: number[][],
	dayLabels: string[],
	start: number,
	lastEnd: string,
) {
	try {
		localStorage.setItem(
			key,
			JSON.stringify({
				grid,
				dayLabels,
				start,
				lastEnd,
				ts: Date.now(),
			}),
		);
	} catch {
		/* ignore quota errors */
	}
}

function makeParseLocal(tz?: string) {
	return (ms: number) => {
		const s = new Date(ms).toLocaleString(
			'sv-SE',
			tz ? { timeZone: tz } : undefined,
		);
		const [d, h] = s.split(' ');
		const [y, m, day] = d.split('-').map(Number);
		const [hr] = h.split(':').map(Number);
		return { y, m, day, hr };
	};
}

function makeLocalFmt(tz?: string) {
	return (ms: number, opts: Intl.DateTimeFormatOptions) =>
		tz
			? new Date(ms).toLocaleString('en-GB', { timeZone: tz, ...opts })
			: new Date(ms).toLocaleString('en-GB', opts);
}

type HassWithWS = HomeAssistant & {
	callWS?: <T>(msg: object) => Promise<T>;
};

const pendingGrid = new Map<
	string,
	Promise<{ grid: number[][]; dayLabels: string[] }>
>();

async function fetchStatisticsPeriod(
	hass: HomeAssistant,
	entity: string,
	period: 'hour' | '5minute',
	start: Date,
	end: Date,
): Promise<{ start: number | string; mean?: number }[] | null> {
	const h = hass as HassWithWS;
	if (!h.callWS) return null;
	try {
		const resp = (await h.callWS({
			type: 'recorder/statistics_during_period',
			start_time: start.toISOString(),
			end_time: end.toISOString(),
			statistic_ids: [entity],
			period,
		})) as Record<string, { start: number | string; mean?: number }[]>;
		const stats = resp?.[entity] ?? [];
		return stats.length ? stats : null;
	} catch {
		return null;
	}
}

export async function fetchHourlyDayGrid(
	hass: HomeAssistant,
	entity: string,
	days: number,
	scale: number,
	cacheMinutes: number,
): Promise<{ grid: number[][]; dayLabels: string[] }> {
	const end = new Date();
	const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
	const startMs = start.getTime();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tz = (hass as any).config?.time_zone;
	const parseLocal = makeParseLocal(tz);
	const localFmt = makeLocalFmt(tz);
	const startLocal = parseLocal(startMs);

	const dayLabels: string[] = [];
	for (let i = 0; i <= days; i++) {
		const d = new Date(startMs + i * 24 * 60 * 60 * 1000);
		dayLabels.push(localFmt(d.getTime(), { day: '2-digit', month: 'short' }));
	}

	const key = surface3dCacheKey(entity, days, scale);
	let cached: Surface3dCache | null = null;
	if (cacheMinutes > 0) {
		cached = readCache(key);
		if (
			cached &&
			Date.now() - new Date(cached.lastEnd).getTime() <=
				cacheMinutes * 60 * 1000
		) {
			const cachedStart = parseLocal(cached.start);
			const sameStart =
				cachedStart.y === startLocal.y &&
				cachedStart.m === startLocal.m &&
				cachedStart.day === startLocal.day;
			if (sameStart) {
				// same day window: start from the cached grid and pull only new hours
				const grid = cached.grid.map((row) => [...row]);
				const h = hass as HassWithWS;
				if (h.callWS) {
					const dedupKey = [
						'grid-incr',
						entity,
						String(days),
						String(scale),
						cached.lastEnd,
						end.toISOString().slice(0, 19),
					].join(':');
					if (!pendingGrid.has(dedupKey)) {
						const promise = (async () => {
							try {
								const resp = (await h.callWS({
									type: 'recorder/statistics_during_period',
									start_time: cached.lastEnd,
									end_time: end.toISOString(),
									statistic_ids: [entity],
									period: 'hour',
								})) as Record<
									string,
									{ start: number | string; mean?: number }[]
								>;
								const stats = resp?.[entity] ?? [];
								for (const s of stats) {
									const t = new Date(s.start).getTime();
									if (typeof s.mean === 'number') {
										const loc = parseLocal(t);
										const di = Math.round(
											(Date.UTC(loc.y, loc.m - 1, loc.day) -
												Date.UTC(
													startLocal.y,
													startLocal.m - 1,
													startLocal.day,
												)) /
												(24 * 60 * 60 * 1000),
										);
										if (di >= 0 && di <= days) {
											grid[di][loc.hr] = +(s.mean * scale).toFixed(2);
										}
									}
								}
							} catch {
								/* fall back to full fetch */
							}
							return { grid, dayLabels: cached.dayLabels };
						})();
						pendingGrid.set(dedupKey, promise);
						promise.finally(() => pendingGrid.delete(dedupKey));
					}
					await pendingGrid.get(dedupKey);
				}
				writeCache(key, grid, cached.dayLabels, startMs, end.toISOString());
				return { grid, dayLabels: cached.dayLabels };
			}
		}
	}

	const dedupKey = [
		'grid',
		entity,
		String(days),
		String(scale),
		start.toISOString().slice(0, 19),
		end.toISOString().slice(0, 19),
	].join(':');

	if (pendingGrid.has(dedupKey)) {
		return pendingGrid.get(dedupKey)!;
	}

	const sum: number[][] = Array.from({ length: days + 1 }, () =>
		new Array(24).fill(0),
	);
	const cnt: number[][] = Array.from({ length: days + 1 }, () =>
		new Array(24).fill(0),
	);
	const add = (t: number, v: number) => {
		const loc = parseLocal(t);
		const di = Math.round(
			(Date.UTC(loc.y, loc.m - 1, loc.day) -
				Date.UTC(startLocal.y, startLocal.m - 1, startLocal.day)) /
				(24 * 60 * 60 * 1000),
		);
		if (di < 0 || di > days) return;
		const hr = loc.hr;
		sum[di][hr] += v;
		cnt[di][hr]++;
	};

	const promise = (async () => {
		// Try hourly long-term statistics first.
		const hourStats = await fetchStatisticsPeriod(
			hass,
			entity,
			'hour',
			start,
			end,
		);
		if (hourStats) {
			for (const s of hourStats) {
				const t = new Date(s.start).getTime();
				if (typeof s.mean === 'number') add(t, s.mean * scale);
			}
		}

		// If hourly stats are missing, try 5-minute short-term statistics.
		if (!cnt.flat().some((c) => c > 0)) {
			const fiveMinStats = await fetchStatisticsPeriod(
				hass,
				entity,
				'5minute',
				start,
				end,
			);
			if (fiveMinStats) {
				for (const s of fiveMinStats) {
					const t = new Date(s.start).getTime();
					if (typeof s.mean === 'number') add(t, s.mean * scale);
				}
			}
		}

		// Last resort: raw state history (expensive for long windows).
		if (!cnt.flat().some((c) => c > 0)) {
			const lists = await fetchHistorySeries(
				hass,
				[entity],
				days * 24,
				cacheMinutes,
			);
			for (const p of lists[0] ?? []) add(p.t * 1000, p.v * scale);
		}

		const grid = sum.map((row, di) =>
			row.map((s, hr) => (cnt[di][hr] ? +(s / cnt[di][hr]).toFixed(2) : 0)),
		);

		if (cacheMinutes > 0 && cnt.flat().some((c) => c > 0)) {
			writeCache(key, grid, dayLabels, startMs, end.toISOString());
		}

		return { grid, dayLabels };
	})();

	pendingGrid.set(dedupKey, promise);
	promise.finally(() => pendingGrid.delete(dedupKey));
	return promise;
}
