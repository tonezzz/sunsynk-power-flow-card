import { html, svg } from 'lit';
import { until } from 'lit/directives/until.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgAreaChartDef, PfgHistoryChartDef } from '../../../types';
import { hexToRgba, resolveChartValue } from '../shared';
import {
	downsampleHistory,
	fetchHistorySeries,
	mergeHistoryByTimestamp,
	historyCache,
} from '../history-cache';

export function renderHistory(
	def: PfgHistoryChartDef | PfgAreaChartDef,
	hass: HomeAssistant,
): unknown {
	const { ents, min, max, scale, activeColor } = resolveChartValue(def, hass);
	const isArea = def.type === 'area';
	const stack = isArea || (def as PfgHistoryChartDef).stack;
	const entityIds = ents;
	const hours = def.hours ?? 24;
	const end = new Date();
	const dataMax = max * scale;
	const dataMin = min * scale;
	const strokeColor = def.stroke || activeColor || '#00E676';
	const fillColor = def.fill || hexToRgba(strokeColor, 0.25);
	const colors = def.colors ?? [
		'#00E676',
		'#ffb300',
		'#ff5252',
		'#4fc3f7',
		'#5fb6ad',
	];
	const strokeWidth = def.stroke_width ?? (stack ? 0.5 : 2);
	const fillOpacity = def.fill_opacity ?? 0.25;
	const cacheKey = `${entityIds.join('+')}:${hours}:${Math.floor(end.getTime() / (5 * 60 * 1000))}:${stack ? '1' : '0'}`;
	if (
		!historyCache.has(cacheKey) ||
		(historyCache.get(cacheKey)?.ts || 0) < end.getTime() - 5 * 60 * 1000
	) {
		// History/area charts keep raw state changes. Caching very long windows
		// in localStorage silently exceeds quota; default to memory-only.
		const cacheMinutes = def.cache ?? 0;
		const maxPoints = def.max_points ?? 1000;
		const promise = fetchHistorySeries(hass, entityIds, hours, cacheMinutes)
			.then((lists) => {
				if (lists.length === 0 || lists.every((l) => l.length === 0)) {
					return svg`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;"><text x="50" y="30" text-anchor="middle" font-size="8" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">no history</text></svg>`;
				}
				let merged = mergeHistoryByTimestamp(lists, scale);
				if (merged.length > maxPoints) {
					merged = downsampleHistory(merged, maxPoints);
				}
				const width = 100;
				const height = 60;
				const pad = 4;
				const graphH = height - pad * 2;
				if (stack) {
					const numSeries = lists.length;
					const cumulative: number[][] = Array.from(
						{ length: numSeries },
						() => [],
					);
					const totals: number[] = [];
					for (let i = 0; i < merged.length; i++) {
						let sum = 0;
						for (let j = 0; j < numSeries; j++) {
							sum += merged[i].values[j] ?? 0;
							cumulative[j][i] = sum;
						}
						totals[i] = sum;
					}
					const allValues = merged.flatMap((m) => m.values);
					const effectiveMax = Math.max(dataMax, ...totals, dataMin + 1);
					const effectiveMin = Math.min(dataMin, ...allValues);
					const range =
						effectiveMax === effectiveMin ? 1 : effectiveMax - effectiveMin;
					const toY = (v: number) =>
						pad + graphH - ((v - effectiveMin) / range) * graphH;
					const getX = (i: number) =>
						merged.length === 1
							? i === 0
								? 0
								: width
							: (i / (merged.length - 1)) * width;
					const layers: ReturnType<typeof svg>[] = [];
					for (let j = 0; j < numSeries; j++) {
						const top = cumulative[j];
						const bottom =
							j > 0 ? cumulative[j - 1] : new Array(merged.length).fill(0);
						const topPts = top
							.map((v, i) => `${getX(i).toFixed(1)},${toY(v).toFixed(1)}`)
							.join(' ');
						const botPts = bottom
							.slice()
							.reverse()
							.map(
								(v, i) =>
									`${getX(merged.length - 1 - i).toFixed(1)},${toY(v).toFixed(1)}`,
							)
							.join(' ');
						const areaPts = `${getX(0).toFixed(1)},${toY(bottom[0]).toFixed(1)} ${topPts} ${getX(merged.length - 1).toFixed(1)},${toY(bottom[merged.length - 1]).toFixed(1)} ${botPts}`;
						const fill = hexToRgba(colors[j % colors.length], fillOpacity);
						const color = colors[j % colors.length];
						layers.push(
							svg`<polygon points="${areaPts}" fill="${fill}" stroke="none" />
								<polyline points="${topPts}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
						);
					}
					return svg`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;">
						${layers}
					</svg>`;
				}
				const values = merged.map((m) => m.values.reduce((a, b) => a + b, 0));
				const effectiveMax = Math.max(dataMax, ...values, dataMin + 1);
				const effectiveMin = Math.min(dataMin, ...values);
				const range =
					effectiveMax === effectiveMin ? 1 : effectiveMax - effectiveMin;
				const count = values.length || 1;
				let pts = values
					.map((v, i) => {
						const x = (i / (count - 1)) * width;
						const y = pad + graphH - ((v - effectiveMin) / range) * graphH;
						return `${x.toFixed(1)},${y.toFixed(1)}`;
					})
					.join(' ');
				if (values.length === 1) {
					const y =
						pad + graphH - ((values[0] - effectiveMin) / range) * graphH;
					pts = `0,${y.toFixed(1)} ${width},${y.toFixed(1)}`;
				}
				const areaPts = `0,${height} ${pts} ${width},${height}`;
				const midY = pad + graphH / 2;
				return svg`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;">
					<line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="rgba(255,255,255,0.18)" stroke-width="0.8" />
					<line x1="0" y1="${height - pad}" x2="${width}" y2="${height - pad}" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
					<polygon points="${areaPts}" fill="${fillColor}" />
					<polyline points="${pts}" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
					<polyline points="${pts}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
				</svg>`;
			})
			.catch(
				() =>
					svg`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;"><text x="50" y="30" text-anchor="middle" font-size="8" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">no history</text></svg>`,
			);
		historyCache.set(cacheKey, { ts: end.getTime(), promise });
		// Evict stale in-memory SVG caches so the Map does not grow forever.
		for (const [k, v] of historyCache) {
			if (v.ts < end.getTime() - 5 * 60 * 1000) {
				historyCache.delete(k);
			}
		}
	}
	const tpl = historyCache.get(cacheKey)!.promise;
	return until(
		tpl,
		html`<div style="color:#aaa;font-size:10px;">loading</div>`,
	);
}
