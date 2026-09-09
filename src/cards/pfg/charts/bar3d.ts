import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgBar3dChartDef } from '../../../types';
import { ensureEchartsGl, fetchHourlyDayGrid } from './surface3d';
import { attach3dDrag, build3dBaseOption } from './pfg3d';

async function mountBar3d(
	el: Element | undefined,
	hass: HomeAssistant,
	def: PfgBar3dChartDef,
): Promise<void> {
	if (!el) return;
	await ensureEchartsGl();
	const echarts = (
		window as unknown as { echarts: { init: (e: Element) => any } }
	).echarts;
	const entity = def.entity ?? (def.entities && def.entities[0]);
	const days = Math.max(2, Math.min(def.days ?? 30, 90));
	const cacheMinutes = def.cache ?? Number.POSITIVE_INFINITY;
	const { grid, dayLabels } = entity
		? await fetchHourlyDayGrid(hass, entity, days, def.scale ?? 1, cacheMinutes)
		: { grid: [], dayLabels: [] };

	const flat: number[][] = [];
	for (let d = 0; d < days; d++) {
		for (let h = 0; h < 24; h++) {
			flat.push([h, d, grid[d]?.[h] ?? 0]);
		}
	}
	const values = flat.map((p) => p[2]);
	const valueMax = values.length ? Math.max(...values) : 0;
	const unit = def.unit ?? '';

	const chart = echarts.init(el);
	chart.setOption({
		...build3dBaseOption({
			def,
			days,
			dayLabels,
			valueMin: 0,
			valueMax,
			unit,
			boxWidth: 220,
			boxHeight: 70,
			boxDepth: 200,
		}),
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
	const s = def.rotate_sensitivity ?? 3;
	const sens = Array.isArray(s) ? s : [s, s];
	attach3dDrag(chart, host, {
		alpha: def.alpha ?? 18,
		beta: def.beta ?? 215,
		sensitivity: sens as [number, number],
	});
}

export function renderBar3d(
	def: PfgBar3dChartDef,
	hass: HomeAssistant,
): unknown {
	return html`<div
		${ref((el) => {
			void mountBar3d(el, hass, def);
		})}
		style="position:absolute;inset:0;pointer-events:auto;z-index:2;"
	></div>`;
}
