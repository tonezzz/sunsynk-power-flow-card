import { html, svg } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgBarsChartDef } from '../../../types';

export function renderBars(def: PfgBarsChartDef, hass: HomeAssistant): unknown {
	const series = def.series ?? [];
	if (!series.length) return undefined;
	const n = series.length;
	const vertical = def.orientation === 'vertical';
	// Bars stretch to the full tile via preserveAspectRatio="none";
	// labels/values are HTML overlays so the text is not distorted.
	const items = series.map((s, i) => {
		const sEnts: string[] =
			s.entities && s.entities.length ? s.entities : s.entity ? [s.entity] : [];
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
		const chartHeight = def.chart_height ?? 64;
		const trackH = Math.max(30, Math.min(chartHeight, 90));
		const trackY = (100 - trackH) / 2;
		return html`<div style="position:relative;width:100%;height:100%;">
			<svg
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				style="position:absolute;inset:0;width:100%;height:100%;"
			>
				${items.map((r) => {
					const gap = def.bar_gap ?? 0.15;
					const x = r.i * colW + colW * gap;
					const w = colW * (1 - 2 * gap);
					const fillH = trackH * r.sPct;
					return svg`
						<rect x="${x}" y="${trackY}" width="${w}" height="${trackH}" rx="3" fill="none" stroke="${r.sBg}" stroke-width="1.5" />
						<rect x="${x + 1.5}" y="${trackY + trackH - fillH}" width="${w - 3}" height="${fillH}" rx="2" fill="${r.sColor}" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.55));" />
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
						style="position:absolute;${
							def.value_rotate
								? `left:${r.i * colW + colW / 2}%;bottom:${def.value_offset ?? '18%'};transform:translateX(-50%);writing-mode:sideways-lr;font-size:${def.value_font_size ?? 'min(2.2vw,16px)'};`
								: `left:${r.i * colW}%;top:${def.value_offset ?? '2%'};width:${colW}%;font-size:${def.value_font_size ?? 'min(2.2vw,15px)'};`
						}text-align:center;font-weight:bold;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;overflow:visible;"
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
					<rect x="2.5" y="${r.barY + 1.5}" width="${95 * r.sPct}" height="${r.barH - 3}" rx="2" fill="${r.sColor}" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.55));" />
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
