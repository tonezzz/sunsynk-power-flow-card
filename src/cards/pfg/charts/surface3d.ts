import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef, PfgSurface3dChartDef } from '../../../types';
import { fetchHistorySeries } from '../history';

// ---------- surface3d (echarts-gl via CDN, loaded on demand) ----------

const ECHARTS_CDN =
	'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js';
const ECHARTS_GL_CDN =
	'https://cdn.jsdelivr.net/npm/echarts-gl@2.1.0/dist/echarts-gl.min.js';

let echartsGlPromise: Promise<unknown> | null = null;
function ensureEchartsGl(): Promise<unknown> {
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
		echartsGlPromise = (async () => {
			if (!w.echarts) await load(ECHARTS_CDN);
			await load(ECHARTS_GL_CDN);
			return w.echarts;
		})();
	}
	return echartsGlPromise;
}

function surface3dCacheKey(entity: string, days: number, scale: number, end: Date): string {
	return `pfg3d:${entity}:${days}:${scale}:${end.toISOString().slice(0, 13)}`;
}

type Surface3dCache = { grid: number[][]; dayLabels: string[]; ts: number };

function readCache(key: string, ttlMs: number): Surface3dCache | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const v = JSON.parse(raw) as Surface3dCache;
		if (Date.now() - v.ts > ttlMs) {
			localStorage.removeItem(key);
			return null;
		}
		return v;
	} catch {
		return null;
	}
}

function writeCache(key: string, grid: number[][], dayLabels: string[]) {
	try {
		localStorage.setItem(key, JSON.stringify({ grid, dayLabels, ts: Date.now() }));
	} catch {
		/* ignore quota errors */
	}
}

async function fetchHourlyDayGrid(
	hass: HomeAssistant,
	entity: string,
	days: number,
	scale: number,
	cacheMinutes: number,
): Promise<{ grid: number[][]; dayLabels: string[] }> {
	const end = new Date();
	const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
	const startMs = start.getTime();

	if (cacheMinutes > 0) {
		const key = surface3dCacheKey(entity, days, scale, end);
		const cached = readCache(key, cacheMinutes * 60 * 1000);
		if (cached) return { grid: cached.grid, dayLabels: cached.dayLabels };
	}

	const dayLabels: string[] = [];
	for (let i = 0; i < days; i++) {
		const d = new Date(startMs + i * 24 * 60 * 60 * 1000);
		dayLabels.push(
			d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
		);
	}
	const sum: number[][] = Array.from({ length: days }, () =>
		new Array(24).fill(0),
	);
	const cnt: number[][] = Array.from({ length: days }, () =>
		new Array(24).fill(0),
	);
	const add = (t: number, v: number) => {
		const di = Math.floor((t - startMs) / (24 * 60 * 60 * 1000));
		if (di < 0 || di >= days) return;
		const hr = new Date(t).getHours();
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
		const lists = await fetchHistorySeries(hass, [entity], days * 24);
		for (const p of lists[0] ?? []) add(p.t * 1000, p.v * scale);
	}
	const grid = sum.map((row, di) =>
		row.map((s, hr) => (cnt[di][hr] ? +(s / cnt[di][hr]).toFixed(2) : 0)),
	);

	if (cacheMinutes > 0 && cnt.flat().some((c) => c > 0)) {
		writeCache(surface3dCacheKey(entity, days, scale, end), grid, dayLabels);
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
		const cacheMinutes = def.cache ?? 5;
		const { grid, dayLabels } = entity
			? await fetchHourlyDayGrid(hass, entity, days, def.scale ?? 1, cacheMinutes)
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
			],
		});
		new ResizeObserver(() => chart.resize()).observe(el as HTMLElement);
		const host = el as HTMLElement;
		host.style.touchAction = 'none';
			host.style.background = def.bg ?? 'rgba(10,14,18,0.45)';
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
				const control = getControl();
				if (control?.setAlpha && control?.setBeta) {
					control.setAlpha(targetAlpha);
					control.setBeta(targetBeta);
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
		host.addEventListener('mousedown', (e: MouseEvent) => {
			if (e.button !== 0) return;
			dragging = true;
			startX = e.clientX;
			startY = e.clientY;
			alphaStart = currentAlpha;
			betaStart = currentBeta;
			e.preventDefault();
		});
		const onMove = (e: MouseEvent) => {
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
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
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
