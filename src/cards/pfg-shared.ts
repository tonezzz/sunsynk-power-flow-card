import { LitElement, html, svg } from 'lit';
import { until } from 'lit/directives/until.js';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef } from '../types';

export const STATUS_COLORS: Record<string, string> = {
	online: '#00E676',
	offline: '#FF1744',
	running: '#00E676',
	stopped: '#FF1744',
	warning: '#FF9100',
	unknown: '#9E9E9E',
};

export function hexToRgba(hex: string, alpha: number): string {
	const clean = hex.replace('#', '');
	const r = parseInt(clean.substring(0, 2), 16);
	const g = parseInt(clean.substring(2, 4), 16);
	const b = parseInt(clean.substring(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

export const historyCache = new Map<
	string,
	{ ts: number; promise: Promise<ReturnType<typeof svg>> }
>();

export function stateToStatus(state?: string): string {
	if (!state) return 'unknown';
	const s = state.toLowerCase();
	if (
		[
			'on',
			'home',
			'running',
			'connected',
			'up',
			'open',
			'detected',
			'available',
			'ok',
			'true',
			'active',
		].includes(s)
	) {
		return 'online';
	}
	if (
		[
			'off',
			'away',
			'not_home',
			'disconnected',
			'down',
			'closed',
			'false',
			'inactive',
		].includes(s)
	) {
		return 'offline';
	}
	if (['stopped', 'not_running'].includes(s)) return 'stopped';
	if (['unavailable', 'unknown', 'none', 'null'].includes(s)) return 'unknown';
	return 'warning';
}

export function renderPfgChart(
	chartDef: PfgChartDef,
	c: { row: number; col: number },
	hass?: HomeAssistant,
	suppressLabel = false,
): unknown {
	if (!chartDef || !hass) return undefined;
	if (chartDef.type === 'cycle') {
		return html`<pfg-cycle
			.steps="${chartDef.steps}"
			.c="${c}"
			.hass="${hass}"
			.interval="${chartDef.interval ?? 3}"
		></pfg-cycle>`;
	}

	if (chartDef.type === 'bars') {
		const series = chartDef.series ?? [];
		if (!series.length) return undefined;
		const n = series.length;
		const vertical = chartDef.orientation === 'vertical';
		// Bars stretch to the full tile via preserveAspectRatio="none";
		// labels/values are HTML overlays so the text is not distorted.
		const items = series.map((s, i) => {
			const sEnts: string[] =
				s.entities && s.entities.length
					? s.entities
					: s.entity
						? [s.entity]
						: [];
			const raw = sEnts.length
				? sEnts.reduce(
						(sum, e) => sum + (parseFloat(hass.states[e]?.state) || 0),
						0,
					)
				: parseFloat(String(s.value ?? 0)) || 0;
			const sMin = s.min ?? 0;
			const sMax = s.max ?? 100;
			const sPct = Math.min(
				Math.max(sMax > sMin ? (raw - sMin) / (sMax - sMin) : 0, 0),
				1,
			);
			const sVal = `${(raw * (s.scale ?? 1)).toFixed(s.decimals ?? 0)}${s.unit ? ` ${s.unit}` : ''}`;
			const sSegs = [...(s.segments || [])].sort((a, b) => a.from - b.from);
			const sColor = sSegs.reduce(
				(col, seg) => (raw >= seg.from ? seg.color : col),
				s.color ?? '#00E676',
			);
			return {
				label: s.label ?? '',
				sVal,
				sColor,
				sBg: s.bg ?? 'rgba(255,255,255,0.25)',
				sPct,
				i,
			};
		});
		if (vertical) {
			const colW = 100 / n;
			return html`<div style="position:relative;width:100%;height:100%;">
				<svg
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					style="position:absolute;inset:0;width:100%;height:100%;"
				>
					${items.map((r) => {
						const x = r.i * colW + colW * 0.15;
						const w = colW * 0.7;
						const trackY = 16;
						const trackH = 64;
						const fillH = trackH * r.sPct;
						return svg`
							<rect x="${x}" y="${trackY}" width="${w}" height="${trackH}" rx="3" fill="none" stroke="${r.sBg}" stroke-width="1.5" />
							<rect x="${x + 1.5}" y="${trackY + trackH - fillH}" width="${w - 3}" height="${fillH}" rx="2" fill="${r.sColor}" />
						`;
					})}
				</svg>
				${items.map(
					(r) => html`
						<span
							style="position:absolute;left:${r.i * colW}%;top:86%;width:${colW}%;text-align:center;font-size:min(2.2vw,15px);font-weight:bold;color:#eee;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;overflow:hidden;"
							>${r.label}</span
						>
						<span
							style="position:absolute;left:${r.i * colW}%;top:2%;width:${colW}%;text-align:center;font-size:min(2.2vw,15px);font-weight:bold;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;overflow:hidden;"
							>${r.sVal}</span
						>
					`,
				)}
			</div>`;
		}
		const rowH = 100 / n;
		const rows = items.map((r) => ({
			...r,
			barY: r.i * rowH + rowH * 0.48,
			barH: rowH * 0.5,
			labelTop: r.i * rowH + rowH * 0.02,
		}));
		return html`<div style="position:relative;width:100%;height:100%;">
			<svg
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				style="position:absolute;inset:0;width:100%;height:100%;"
			>
				${rows.map(
					(r) => svg`
						<rect x="1" y="${r.barY}" width="98" height="${r.barH}" rx="3" fill="none" stroke="${r.sBg}" stroke-width="1.5" />
						<rect x="2.5" y="${r.barY + 1.5}" width="${95 * r.sPct}" height="${r.barH - 3}" rx="2" fill="${r.sColor}" />
					`,
				)}
			</svg>
			${rows.map(
				(r) => html`
					<span
						style="position:absolute;left:2%;top:${r.labelTop}%;font-size:min(2.4vw,16px);font-weight:bold;color:#eee;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;"
						>${r.label}</span
					>
					<span
						style="position:absolute;right:2%;top:${r.labelTop}%;text-align:right;font-size:min(2.4vw,16px);font-weight:bold;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;"
						>${r.sVal}</span
					>
				`,
			)}
		</div>`;
	}

	const ents: string[] =
		chartDef.entities && chartDef.entities.length
			? chartDef.entities
			: chartDef.entity
				? [chartDef.entity]
				: [];
	const rawVal = ents.length
		? ents.reduce((sum, e) => sum + (parseFloat(hass.states[e]?.state) || 0), 0)
		: parseFloat(String(chartDef.value ?? 0)) || 0;
	const min = chartDef.min ?? 0;
	const max = chartDef.max ?? 100;
	const scale = chartDef.scale ?? 1;
	const scaledVal = rawVal * scale;
	const pct = Math.min(
		Math.max(max > min ? (rawVal - min) / (max - min) : 0, 0),
		1,
	);
	const decimals = chartDef.decimals ?? 0;
	const displayVal = `${scaledVal.toFixed(decimals)}${chartDef.unit ? ` ${chartDef.unit}` : ''}`;
	const getAngle = (v: number) =>
		((Math.max(min, Math.min(v, max)) - min) / (max - min)) * 180;
	const sortedSegs = [...(chartDef.segments || [])].sort(
		(a, b) => a.from - b.from,
	);
	const activeColor = sortedSegs.reduce(
		(color, seg) => (rawVal >= seg.from ? seg.color : color),
		chartDef.color ?? '#00E676',
	);
	if (chartDef.type === 'bar') {
		if (chartDef.orientation === 'horizontal') {
			const barWidth = 76 * pct;
			return svg`<svg viewBox="0 0 100 100" style="width:100%;height:100%;">
															<rect x="10" y="40" width="80" height="20" rx="4" fill="none" stroke="${chartDef.bg ?? 'rgba(255,255,255,0.15)'}" stroke-width="2" />
															<rect x="12" y="42" width="${barWidth}" height="16" rx="2" fill="${activeColor}" />
															<text x="50" y="95" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>
															${chartDef.label && !suppressLabel ? svg`<text x="50" y="8" text-anchor="middle" font-size="8" font-weight="bold" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${chartDef.label}</text>` : ''}
														</svg>`;
		}
		const barHeight = 70 * pct;
		return svg`<svg viewBox="0 0 100 100" style="width:100%;height:100%;">
															<rect x="20" y="15" width="60" height="70" rx="4" fill="none" stroke="${chartDef.bg ?? 'rgba(255,255,255,0.15)'}" stroke-width="2" />
															<rect x="24" y="${85 - barHeight}" width="52" height="${barHeight}" rx="2" fill="${activeColor}" />
															<text x="50" y="95" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>
															${chartDef.label && !suppressLabel ? svg`<text x="50" y="8" text-anchor="middle" font-size="8" font-weight="bold" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${chartDef.label}</text>` : ''}
														</svg>`;
	} else if (chartDef.type === 'history') {
		const entityIds = ents;
		const hours = chartDef.hours ?? 24;
		const end = new Date();
		const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
		const dataMax = max * scale;
		const dataMin = min * scale;
		const strokeColor = chartDef.stroke || activeColor || '#00E676';
		const fillColor = chartDef.fill || hexToRgba(strokeColor, 0.25);
		const cacheKey = `${entityIds.join('+')}:${hours}:${Math.floor(end.getTime() / (5 * 60 * 1000))}`;
		if (
			!historyCache.has(cacheKey) ||
			(historyCache.get(cacheKey)?.ts || 0) < end.getTime() - 5 * 60 * 1000
		) {
			const h = hass as HomeAssistant & {
				callWS?: <T>(msg: object) => Promise<T>;
				callApi?: (method: string, path: string) => Promise<unknown>;
			};
			const call = h.callWS
				? h.callWS({
						type: 'history/history_during_period',
						start_time: start.toISOString(),
						end_time: end.toISOString(),
						entity_ids: entityIds,
						minimal_response: true,
						no_attributes: true,
						significant_changes_only: false,
						include_start_time_state: true,
					})
				: h.callApi
					? h.callApi(
							'GET',
							`history/period/${start.toISOString()}?end_time=${encodeURIComponent(end.toISOString())}&filter_entity_id=${entityIds.map(encodeURIComponent).join(',')}`,
						)
					: Promise.resolve(null);
			const promise = call
				.then((resp: unknown) => {
					const seriesLists: unknown[] = Array.isArray(resp)
						? resp
						: entityIds.map(
								(e) => (resp && (resp as Record<string, unknown>)[e]) || [],
							);
					const lists = seriesLists.filter((l) => Array.isArray(l));
					const list =
						lists.length > 1
							? (() => {
									const n = Math.min(
										...lists.map((l) => (l as unknown[]).length),
									);
									const out: { s: number; lu?: number }[] = [];
									for (let i = 0; i < n; i++) {
										let v = 0;
										for (const l of lists) {
											const pt = (l as { s?: unknown; state?: unknown }[])[i];
											v += parseFloat(String(pt?.s ?? pt?.state ?? 0)) || 0;
										}
										const t0 = (lists[0] as { lu?: number }[])[i];
										out.push({ s: v, lu: t0?.lu });
									}
									return out;
								})()
							: lists[0] || [];
					const points = list
						.map(
							(p: {
								s?: unknown;
								state?: unknown;
								lu?: number;
								last_updated?: string;
								last_changed?: string;
							}) => {
								const stateStr = p.s !== undefined ? p.s : p.state;
								const time =
									p.lu !== undefined
										? p.lu
										: new Date(
												p.last_updated ?? p.last_changed ?? 0,
											).getTime() / 1000;
								const v = parseFloat(String(stateStr));
								return { t: time, v: isNaN(v) ? 0 : v };
							},
						)
						.filter(
							(p: { t: number; v: number }) =>
								typeof p.t === 'number' && !isNaN(p.v),
						);
					points.sort(
						(a: { t: number; v: number }, b: { t: number; v: number }) =>
							a.t - b.t,
					);
					const values = points.map(
						(p: { t: number; v: number }) => p.v * scale,
					);
					const effectiveMax = Math.max(dataMax, ...values, dataMin + 1);
					const effectiveMin = Math.min(dataMin, ...values);
					const range =
						effectiveMax === effectiveMin ? 1 : effectiveMax - effectiveMin;
					const width = 100;
					const height = 60;
					const pad = 4;
					const graphH = height - pad * 2;
					const count = values.length || 1;
					let pts = values
						.map((v: number, i: number) => {
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
					return svg`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;">
																		<polygon points="${areaPts}" fill="${fillColor}" />
																		<polyline points="${pts}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
																	</svg>`;
				})
				.catch(
					() =>
						svg`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;"><text x="50" y="30" text-anchor="middle" font-size="8" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">no history</text></svg>`,
				);
			historyCache.set(cacheKey, { ts: end.getTime(), promise });
		}
		const tpl = historyCache.get(cacheKey)!.promise;
		return until(
			tpl,
			html`<div style="color:#aaa;font-size:10px;">loading</div>`,
		);
	} else if (chartDef.needle || chartDef.segments) {
		const arcRadius = 40;
		const toXY = (angle: number) => {
			const rad = (angle * Math.PI) / 180;
			return {
				x: -arcRadius * Math.cos(rad),
				y: -arcRadius * Math.sin(rad),
			};
		};
		const valueAngle = getAngle(rawVal);
		const sorted = [...sortedSegs];
		if (sorted.length === 0 || sorted[0].from > min) {
			sorted.unshift({
				from: min,
				color: chartDef.color ?? '#00E676',
			});
		}
		const segmentArcs = sorted
			.map((seg, i) => {
				const startVal = Math.max(seg.from, min);
				const endVal =
					i < sorted.length - 1 ? Math.min(sorted[i + 1].from, max) : max;
				if (endVal <= startVal) return '';
				const start = toXY(getAngle(startVal));
				const end = toXY(getAngle(endVal));
				return svg`<path d="M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${arcRadius} ${arcRadius} 0 0 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}" fill="none" stroke="${seg.color}" stroke-width="12" stroke-linecap="butt" />`;
			})
			.filter((x) => x !== '');
		const needlePath =
			'M -34,-3 L -40,-1 A 1,1,0,0,0,-40,1 L -34,3 A 2,2,0,0,0,-34,-3 Z';
		return svg`<svg viewBox="-50 -50 100 70" style="width:100%;height:100%;">
															<g style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));"><path d="M -40 0 A 40 40 0 0 1 40 0" fill="none" stroke="${chartDef.bg ?? 'rgba(255,255,255,0.15)'}" stroke-width="12" stroke-linecap="butt" />
															${segmentArcs}</g>
															<path d="${needlePath}" fill="#fff" stroke="rgba(0,0,0,0.6)" stroke-width="1" transform="rotate(${valueAngle})" style="transform-origin:0 0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));" />
															<text x="0" y="2" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>
															${chartDef.label && !suppressLabel ? svg`<text x="0" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${chartDef.label}</text>` : ''}
														</svg>`;
	} else {
		const gaugeR = 40;
		const gaugeCirc = 2 * Math.PI * gaugeR;
		const gaugeColor = chartDef.color ?? '#00E676';
		const gaugeBg = chartDef.bg ?? '#102040';
		const gradId = `pfg-gauge-grad-${c.row}-${c.col}`;
		const gaugeStroke = chartDef.gradient ? `url(#${gradId})` : gaugeColor;
		const off = gaugeCirc * (1 - pct);
		return svg`<svg viewBox="0 0 100 100" style="width:100%;height:100%;">
															<defs>
																${chartDef.gradient ? svg`<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${chartDef.gradient.from}" /><stop offset="100%" stop-color="${chartDef.gradient.to}" /></linearGradient>` : ''}
															</defs>
															<g transform="rotate(-90 50 50)" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">
																<circle cx="50" cy="50" r="${gaugeR}" fill="none" stroke="${gaugeBg}" stroke-width="12" />
																<circle cx="50" cy="50" r="${gaugeR}" fill="none" stroke="${gaugeStroke}" stroke-width="12" stroke-dasharray="${gaugeCirc}" stroke-dashoffset="${off}" stroke-linecap="round" />
															</g>
															<text x="50" y="48" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>
															${chartDef.label && !suppressLabel ? svg`<text x="50" y="70" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${chartDef.label}</text>` : ''}
														</svg>`;
	}
}

@customElement('pfg-cycle')
export class PfgCycleCard extends LitElement {
	@property({ attribute: false })
	steps?: PfgChartDef[][];

	@property({ attribute: false })
	c?: { row: number; col: number };

	@property({ attribute: false })
	hass?: HomeAssistant;

	@property({ type: Number })
	interval = 3;

	private _index = 0;
	private _timer?: number;

	connectedCallback() {
		super.connectedCallback();
		this._timer = window.setInterval(() => {
			this._index =
				(this._index + 1) % (this.steps?.length ? this.steps.length : 1);
			this.requestUpdate();
		}, this.interval * 1000);
	}

	disconnectedCallback() {
		if (this._timer) window.clearInterval(this._timer);
		super.disconnectedCallback();
	}

	protected render() {
		const step = this.steps?.[this._index] || [];
		const charts = Array.isArray(step) ? step : [step];
		const stepLabel = charts.find((d) => d?.label)?.label;
		return html`<div style="position:absolute;inset:0;pointer-events:none;">
			${charts.map((chartDef) => {
				const pos = chartDef.position || 'center';
				const style =
					pos === 'bottom'
						? 'position:absolute;bottom:2%;left:2.5%;width:95%;height:35%;'
						: 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:95%;height:70%;';
				return html`<div style="${style}">
					${renderPfgChart(chartDef, this.c!, this.hass, true)}
				</div>`;
			})}
			${
				stepLabel
					? html`<span
							style="position:absolute;left:50%;top:calc(55% - 14px);transform:translate(-50%,-50%);z-index:2;font-weight:bold;font-size:min(1.6vw,11px);color:#ddd;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;"
							>${stepLabel}</span
						>`
					: ''
			}
		</div>`;
	}
}
