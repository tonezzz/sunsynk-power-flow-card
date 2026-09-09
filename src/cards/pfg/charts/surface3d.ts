import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef, PfgSurface3dChartDef } from '../../../types';
import { fetchHistorySeries } from '../history';

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
		const flat: [number, number, number][] = [];
		let dataMax = Number.NEGATIVE_INFINITY;
		grid.forEach((row, d) =>
			row.forEach((v, h) => {
				flat.push([h, d, v]);
				if (v > dataMax) dataMax = v;
			}),
		);
		const valueMin = def.min ?? 0;
		const valueMax = def.max ?? Math.max(dataMax, valueMin + 1);
		const valueMid = (valueMin + valueMax) / 2;
		const xMid = (0 + 23) / 2;
		const zMid = (0 + (days - 1)) / 2;
		const boxWidth = 160;
		const boxHeight = 60;
		const boxDepth = 120;
		const frontCenter: [number, number, number] = [
			boxWidth * (11.5 / 23 - 0.5),
			boxHeight * ((valueMid - valueMin) / (valueMax - valueMin) - 0.5),
			boxDepth / 2,
		];
		const volumeCenter: [number, number, number] = [
			boxWidth * ((xMid - 0) / 23 - 0.5),
			boxHeight * ((valueMid - valueMin) / (valueMax - valueMin) - 0.5),
			boxDepth * ((zMid - 0) / (days - 1) - 0.5),
		];
		const center: [number, number, number] = (() => {
			if (def.center) return def.center;
			if (Array.isArray(def.rotate_center)) return def.rotate_center;
			return def.rotate_center === 'front' ? frontCenter : volumeCenter;
		})();
		const unit = def.unit ?? '';
		const chart = echarts.init(el);
		chart.setOption({
			backgroundColor: 'transparent',
			tooltip: {
				formatter: (p: { value: number[] }) =>
					`${dayLabels[p.value[1]] ?? ''} ${String(p.value[0]).padStart(2, '0')}:00 — ${p.value[2]}${unit ? ' ' + unit : ''}`,
				// dim the axisPointer crosshair lines; the hover plane carries the cue
				axisPointer: { lineStyle: { opacity: 0.12 } },
			},
			xAxis3D: {
				type: 'value',
				name: 'Hour',
				min: 0,
				max: 23,
				interval: 3,
				axisLabel: { color: '#9fb3c8' },
			},
			yAxis3D: {
				type: 'value',
				name: 'Day',
				min: 0,
				max: days - 1,
				interval: Math.max(1, Math.floor(days / 8)),
				inverse: true,
				axisLabel: {
					color: '#9fb3c8',
					formatter: (d: number) => dayLabels[d] ?? '',
				},
			},
			zAxis3D: {
				type: 'value',
				name: unit,
				min: valueMin,
				max: valueMax,
				axisLabel: { color: '#9fb3c8' },
			},
			grid3D: {
				boxWidth: boxWidth,
				boxHeight: boxHeight,
				boxDepth: boxDepth,
				light: {
					main: { intensity: 1.2 },
					ambient: { intensity: 0.3 },
				},
				viewControl: {
					autoRotate: def.auto_rotate ?? false,
					alpha: def.alpha ?? 18,
					beta: def.beta ?? 215,
					center: center,
					// left drag is handled by our own event loop so it works over
					// the rendered surface; middle/right still use OrbitControl
					rotateMouseButton: def.rotate_mouse_button ?? 'middle',
					panMouseButton: def.pan_mouse_button ?? 'right',
					rotateSensitivity: 0,
					zoomSensitivity: def.zoom_sensitivity ?? 1,
				},
			},
			visualMap: {
				show: false,
				min: valueMin,
				max: valueMax,
				dimension: 2,
				inRange: { color: ['#1a237e', '#00838f', '#ffd54f'] },
			},
			series: [
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
				{
					id: 'pfg3d-hover-plane',
					type: 'surface',
					// flat quad spanning the whole box at z = hovered value
					data: [
						[0, 0, valueMid],
						[23, 0, valueMid],
						[0, days - 1, valueMid],
						[23, days - 1, valueMid],
					],
					dataShape: [2, 2],
					shading: 'lambert',
					silent: true,
					animation: false,
					itemStyle: {
						opacity:
							typeof def.hover_plane === 'number'
								? def.hover_plane
								: def.hover_plane === false
									? 0
									: 0.25,
						color: def.hover_plane_color ?? '#4fc3f7',
					},
					wireframe: { show: false },
				},
			],
		});
		let planePinned = false; // click toggles pin on the hover plane
		const planeOn =
			typeof def.hover_plane === 'number'
				? def.hover_plane > 0
				: (def.hover_plane ?? true);
		if (planeOn) {
			const setPlane = (vv: number) =>
				chart.setOption(
					{
						series: [
							{
								id: 'pfg3d-hover-plane',
								data: [
									[0, 0, vv],
									[23, 0, vv],
									[0, days - 1, vv],
									[23, days - 1, vv],
								],
							},
						],
					},
					false,
					false,
				);
			const clampV = (v: unknown) =>
				typeof v === 'number' && !isNaN(v)
					? Math.max(valueMin, Math.min(valueMax, v))
					: undefined;
			let lastDataMove = 0; // data-hover suppresses the pixel-projection path
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(chart as any).on('mousemove', (ev: any) => {
				if (planePinned || ev?.seriesId === 'pfg3d-hover-plane') return;
				const vv = clampV(ev?.value?.[2] ?? ev?.data?.[2]);
				if (vv !== undefined) {
					lastDataMove = Date.now();
					setPlane(vv);
				}
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(chart as any).on('updateAxisPointer', (ev: any) => {
				if (planePinned) return;
				const infos = ev?.axesInfo ?? [];
				const xi = infos.find((a: { axisDim?: string }) => a.axisDim === 'x');
				const yi = infos.find((a: { axisDim?: string }) => a.axisDim === 'y');
				if (xi?.value == null || yi?.value == null) return;
				const h = Math.max(0, Math.min(23, Math.round(xi.value)));
				const d = Math.max(0, Math.min(days - 1, Math.round(yi.value)));
				const vv = clampV(grid[d]?.[h]);
				if (vv !== undefined) setPlane(vv);
			});
			// pointer over walls/canvas: project z-axis min/max to screen pixels
			// and map the pointer's vertical position back to a kW level
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chAny: any = chart;
			const zr = chAny.getZr?.();
			zr?.on('mousemove', (e: { offsetX: number; offsetY: number }) => {
				if (planePinned || Date.now() - lastDataMove < 100) return;
				const zMinPx = chAny.convertToPixel?.('grid3D', [0, 0, valueMin]);
				const zMaxPx = chAny.convertToPixel?.('grid3D', [0, 0, valueMax]);
				if (!Array.isArray(zMinPx) || !Array.isArray(zMaxPx)) return;
				const dy = zMinPx[1] - zMaxPx[1];
				if (!dy) return;
				const v =
					valueMin + ((zMinPx[1] - e.offsetY) / dy) * (valueMax - valueMin);
				const vv = clampV(v);
				if (vv !== undefined) setPlane(vv);
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(chart as any).on('globalout', () => {
				if (!planePinned) setPlane(valueMid);
			});
		}
		new ResizeObserver(() => chart.resize()).observe(el as HTMLElement);
		const host = el as HTMLElement;
		host.style.touchAction = 'none';
		const initAlpha = def.alpha ?? 18;
		const initBeta = def.beta ?? 215;
		let currentAlpha = initAlpha;
		let currentBeta = initBeta;
		let dragging = false;
		let startX = 0;
		let startY = 0;
		let alphaStart = initAlpha;
		let betaStart = initBeta;
		const s = def.rotate_sensitivity ?? 3;
		const sens = Array.isArray(s) ? s : [s, s];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const chartAny = chart as any;
		const getControl = () => {
			const views = chartAny?._componentsViews ?? [];
			for (let i = 0; i < views.length; i++) {
				const c = views[i]?._control;
				if (c?.setAlpha && c?.setBeta) return c;
			}
			return undefined;
		};
		let pending = false;
		let targetAlpha = initAlpha;
		let targetBeta = initBeta;
		const updateCamera = (alpha: number, beta: number) => {
			targetAlpha = alpha;
			targetBeta = beta;
			if (pending) return;
			pending = true;
			requestAnimationFrame(() => {
				pending = false;
				currentAlpha = targetAlpha;
				currentBeta = targetBeta;
				// echarts-gl OrbitControl does NOT pick up viewControl changes
				// via setOption — drive the control instance directly.
				const ctrl = getControl();
				if (ctrl) {
					ctrl.setAlpha(targetAlpha);
					ctrl.setBeta(targetBeta);
				} else {
					chartAny.setOption(
						{
							grid3D: {
								viewControl: {
									alpha: targetAlpha,
									beta: targetBeta,
								},
							},
						},
						false,
						false,
					);
				}
			});
		};
		const onDown = (e: PointerEvent) => {
			if (e.button !== 0) return;
			dragging = true;
			startX = e.clientX;
			startY = e.clientY;
			alphaStart = currentAlpha;
			betaStart = currentBeta;
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		// bind on host (not window) so sibling overlays outside the chart
		// can't shadow the hit-test; events on the canvas bubble up here
		host.addEventListener('pointerdown', onDown);
		const onMove = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			const beta = betaStart + (dx * sens[0]) / 20;
			const alpha = Math.max(
				-90,
				Math.min(90, alphaStart - (dy * sens[1]) / 20),
			);
			updateCamera(alpha, beta);
		};
		const onUp = () => {
			dragging = false;
		};
		window.addEventListener('pointermove', onMove, true);
		window.addEventListener('pointerup', onUp, true);
		window.addEventListener('pointercancel', onUp, true);
		// plain click (no drag) toggles the hover-plane pin
		host.addEventListener('click', (e: MouseEvent) => {
			if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) return;
			planePinned = !planePinned;
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
