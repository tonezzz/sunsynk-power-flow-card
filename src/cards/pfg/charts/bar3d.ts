import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgBar3dChartDef } from '../../../types';
import { ensureEchartsGl, fetchHourlyDayGrid } from './surface3d';

async function mountBar3d(
	el: Element | undefined,
	hass: HomeAssistant,
	chartDef: PfgBar3dChartDef,
): Promise<void> {
	if (!el) return;
	await ensureEchartsGl();
	const echarts = (window as unknown as { echarts: { init: (e: Element) => any } }).echarts;
	const def = chartDef;
	const entity = def.entity ?? (def.entities && def.entities[0]);
	const days = Math.max(2, Math.min(def.days ?? 30, 90));
	const cacheMinutes = def.cache ?? Number.POSITIVE_INFINITY;
	const { grid, dayLabels } = entity
		? await fetchHourlyDayGrid(hass, entity, days, def.scale ?? 1, cacheMinutes)
		: { grid: [], dayLabels: [] };

	const HOUR_OFFSET = 0;
	const flat: number[][] = [];
	for (let d = 0; d < days; d++) {
		for (let h = 0; h < 24; h++) {
			// shift x so 06:00 is at the left and the day wraps around
			const x = h < HOUR_OFFSET ? h + 24 : h;
			flat.push([x, d, grid[d]?.[h] ?? 0]);
		}
	}
	const values = flat.map((p) => p[2]);
	const valueMax = values.length ? Math.max(...values) : 0;
	const unit = def.unit ?? '';

	const chart = echarts.init(el);
	chart.setOption({
		backgroundColor: 'transparent',
		tooltip: {
			formatter: (p: { value?: [number, number, number] }) => {
				const [h, d, v] = p.value ?? [0, 0, 0];
				const hr = Math.round(h) % 24;
				return `${dayLabels[d] ?? ''} ${String(hr).padStart(2, '0')}:00 — ${v} ${unit}`;
			},
		},
		xAxis3D: {
			type: 'value',
			name: 'Hour',
			min: HOUR_OFFSET,
			max: HOUR_OFFSET + 23,
			interval: 3,
			axisLabel: {
				color: '#9fb3c8',
				formatter: (h: number) => {
					const hr = Math.round(h) % 24;
					return `${String(hr).padStart(2, '0')}:00`;
				},
			},
		},
		yAxis3D: {
			type: 'value',
			name: 'Day',
			min: 0,
			max: days - 1,
			interval: Math.max(1, Math.floor(days / 8)),
			axisLabel: {
				color: '#9fb3c8',
				formatter: (d: number) => dayLabels[d] ?? '',
			},
		},
		zAxis3D: {
			type: 'value',
			name: unit,
			min: 0,
			axisLabel: { color: '#9fb3c8' },
		},
		grid3D: {
			boxWidth: 220,
			boxHeight: 70,
			boxDepth: 200,
			light: {
				main: { intensity: 1.2 },
				ambient: { intensity: 0.3 },
			},
			viewControl: {
				autoRotate: def.auto_rotate ?? false,
				alpha: def.alpha ?? 18,
				beta: def.beta ?? 215,
				distance: 300,
				rotateMouseButton: def.rotate_mouse_button ?? 'middle',
				panMouseButton: def.pan_mouse_button ?? 'right',
				rotateSensitivity: 0,
				zoomSensitivity: def.zoom_sensitivity ?? 1,
			},
		},
		visualMap: {
			show: false,
			min: 0,
			max: valueMax,
			dimension: 2,
			inRange: { color: ['#1a237e', '#00838f', '#ffd54f'] },
		},
		series: [
			{
				type: 'bar3D',
				data: flat,
				shading: 'lambert',
				silent: true,
				itemStyle: { opacity: def.opacity ?? 1 },
			},
		],
	});
	chart.resize();
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
	host.addEventListener('pointerdown', onDown);
	const onMove = (e: PointerEvent) => {
		if (!dragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const beta = betaStart + (dx * sens[0]) / 20;
		const alpha = Math.max(-90, Math.min(90, alphaStart - (dy * sens[1]) / 20));
		updateCamera(alpha, beta);
	};
	const onUp = () => {
		dragging = false;
	};
	window.addEventListener('pointermove', onMove, true);
	window.addEventListener('pointerup', onUp, true);
	window.addEventListener('pointercancel', onUp, true);
}

export function renderBar3d(def: PfgBar3dChartDef, hass: HomeAssistant): unknown {
	return html`<div
		${ref((el) => {
			void mountBar3d(el, hass, def);
		})}
		style="position:absolute;inset:0;pointer-events:auto;z-index:2;"
	></div>`;
}
