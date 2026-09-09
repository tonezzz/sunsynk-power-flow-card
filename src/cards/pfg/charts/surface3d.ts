import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef, PfgSurface3dChartDef } from '../../../types';
import { fetchHistorySeries } from '../history-cache';
import { attach3dDrag, build3dBaseOption, build3dCenter } from './pfg3d';
import { build3dFlatData } from './pfg3d-data';

// ---------- surface3d (echarts-gl via CDN, loaded on demand) ----------

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
	return `pfg3d:${entity}:${days}:${scale}`;
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
	const tz = (hass as any).config?.time_zone;
	const parseLocal = makeParseLocal(tz);
	const localFmt = makeLocalFmt(tz);
	const startLocal = parseLocal(startMs);

	const dayLabels: string[] = [];
	for (let i = 0; i < days; i++) {
		const d = new Date(startMs + i * 24 * 60 * 60 * 1000);
		dayLabels.push(
			localFmt(d.getTime(), { day: '2-digit', month: 'short' }),
		);
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
				const h = hass as HomeAssistant & {
					callWS?: <T>(msg: object) => Promise<T>;
				};
				if (h.callWS) {
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
								if (di >= 0 && di < days) {
									grid[di][loc.hr] = +(s.mean * scale).toFixed(2);
								}
							}
						}
					} catch {
						/* fall back to full fetch */
					}
				}
				writeCache(key, grid, cached.dayLabels, startMs, end.toISOString());
				return { grid, dayLabels: cached.dayLabels };
			}
		}
	}

	const sum: number[][] = Array.from({ length: days }, () =>
		new Array(24).fill(0),
	);
	const cnt: number[][] = Array.from({ length: days }, () =>
		new Array(24).fill(0),
	);
	const add = (t: number, v: number) => {
		const loc = parseLocal(t);
		const di = Math.round(
			(Date.UTC(loc.y, loc.m - 1, loc.day) -
				Date.UTC(startLocal.y, startLocal.m - 1, startLocal.day)) /
				(24 * 60 * 60 * 1000),
		);
		if (di < 0 || di >= days) return;
		const hr = loc.hr;
		sum[di][hr] += v;
		cnt[di][hr]++;
	};
	const h = hass as HomeAssistant & {
		callWS?: <T>(msg: object) => Promise<T>;
	};
	if (h.callWS) {
		try {
			const resp = (await h.callWS({
				type: 'recorder/statistics_during_period',
				start_time: start.toISOString(),
				end_time: end.toISOString(),
				statistic_ids: [entity],
				period: 'hour',
			})) as Record<string, { start: number | string; mean?: number }[]>;
			const stats = resp?.[entity] ?? [];
			for (const s of stats) {
				const t = new Date(s.start).getTime();
				if (typeof s.mean === 'number') add(t, s.mean * scale);
			}
		} catch {
			/* fall back to raw history below */
		}
	}
	if (!cnt.flat().some((c) => c > 0)) {
		const lists = await fetchHistorySeries(hass, [entity], days * 24, cacheMinutes);
		for (const p of lists[0] ?? []) add(p.t * 1000, p.v * scale);
	}
	const grid = sum.map((row, di) =>
		row.map((s, hr) => (cnt[di][hr] ? +(s / cnt[di][hr]).toFixed(2) : 0)),
	);

	if (cacheMinutes > 0 && cnt.flat().some((c) => c > 0)) {
		writeCache(key, grid, dayLabels, startMs, end.toISOString());
	}

	return { grid, dayLabels };
}

async function mountSurface3d(
	el: Element | undefined,
	hass: HomeAssistant,
	chartDef: PfgChartDef,
): Promise<void> {
	if (!el || (el as HTMLElement & { __pfg3d?: boolean }).__pfg3d) return;
	(el as HTMLElement & { __pfg3d?: boolean }).__pfg3d = true;
	const def = chartDef as PfgSurface3dChartDef;
	const entity = def.entity ?? (def.entities && def.entities[0]);
	try {
		await ensureEchartsGl();
		const days = Math.max(2, Math.min(def.days ?? 30, 90));
		const cacheMinutes = def.cache ?? Number.POSITIVE_INFINITY;
		const { grid, dayLabels } = entity
			? await fetchHourlyDayGrid(
					hass,
					entity,
					days,
					def.scale ?? 1,
					cacheMinutes,
				)
			: { grid: [], dayLabels: [] };
		const echarts = (
			window as unknown as {
				echarts: {
					init: (e: Element) => {
						setOption: (o: object) => void;
						resize: () => void;
					};
				};
			}
		).echarts;
		const HOUR_OFFSET = 0;
		const X_MIN = HOUR_OFFSET;
		const X_MAX = HOUR_OFFSET + 23;
		const { flat, dataMax: rawMax } = build3dFlatData(grid, days, HOUR_OFFSET);
		const dataMax = grid.length ? rawMax : Number.NEGATIVE_INFINITY;
		const valueMin = def.min ?? 0;
		const valueMax = def.max ?? Math.max(dataMax, valueMin + 1);
		const valueMid = (valueMin + valueMax) / 2;
		const boxWidth = 160;
		const boxHeight = 60;
		const boxDepth = 120;
		const center = build3dCenter({
			boxWidth,
			boxHeight,
			boxDepth,
			xMin: X_MIN,
			xMax: X_MAX,
			valueMin,
			valueMax,
			days,
			rotate_center: def.rotate_center,
			center: def.center,
			viewOffset: def.view_offset,
		});
		const unit = def.unit ?? '';
		const chart = echarts.init(el);
		const host = el as HTMLElement;
		const planeOn =
			typeof def.hover_plane === 'number'
				? def.hover_plane > 0
				: (def.hover_plane ?? false);
		const hover = planeOn ? await import('./pfg3d-hover') : null;
		const series: object[] = [
			{
				type: 'surface',
				data: flat,
				dataShape: [days, 24],
				shading: 'lambert',
				silent: true,
				itemStyle: { opacity: def.opacity ?? 1 },
				wireframe: {
					show: def.wireframe ?? true,
					lineStyle: {
						color: 'rgba(255,255,255,0.25)',
						width: 1,
					},
				},
			},
		];
		if (hover) {
			series.push(hover.buildHoverPlaneSeries(def, days, valueMin, valueMax, valueMid, X_MIN, X_MAX));
		}
		const baseOption = build3dBaseOption({
			def,
			days,
			dayLabels,
			valueMin,
			valueMax,
			unit,
			boxWidth,
			boxHeight,
			boxDepth,
			center,
			distance: 300,
			zMin: valueMin,
			zMax: valueMax,
			axisPointer: { lineStyle: { opacity: 0.12 } },
		});
		chart.setOption({
			...baseOption,
			series,
		});
		if (hover) {
			hover.attachHoverPlane(chart, {
				def,
				grid,
				days,
				valueMin,
				valueMax,
				valueMid,
				host,
			});
		}
		new ResizeObserver(() => chart.resize()).observe(host);
		host.style.touchAction = 'none';
		const s = def.rotate_sensitivity ?? 3;
		const sens = Array.isArray(s) ? s : [s, s];
		attach3dDrag(chart, host, {
			alpha: def.alpha ?? 18,
			beta: def.beta ?? 40,
			sensitivity: sens as [number, number],
			viewControl: baseOption.grid3D.viewControl,
		});
	} catch (e) {
		console.error('[pfg surface3d]', e);
		(el as HTMLElement).innerHTML =
			'<div style="color:#aaa;font-size:10px;text-align:center;padding-top:40%;">3d chart unavailable</div>';
	}
}

export function renderSurface3d(
	def: PfgSurface3dChartDef,
	hass: HomeAssistant,
): unknown {
	return html`<div
		${ref((el) => {
			void mountSurface3d(el, hass, def);
		})}
		style="position:absolute;inset:0;pointer-events:auto;z-index:2;"
	></div>`;
}
