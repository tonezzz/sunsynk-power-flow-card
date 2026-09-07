import { svg } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgGaugeChartDef } from '../../../types';
import { resolveChartValue } from '../shared';

export function renderGauge(
	def: PfgGaugeChartDef,
	c: { row: number; col: number },
	hass: HomeAssistant,
	suppressLabel: boolean,
): unknown {
	const { rawVal, min, max, pct, displayVal, getAngle, sortedSegs } =
		resolveChartValue(def, hass);
	const label =
		def.label && !suppressLabel
			? svg`<text x="0" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${def.label}</text>`
			: '';

	if (def.needle || def.segments) {
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
				color: def.color ?? '#00E676',
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
			<g style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));"><path d="M -40 0 A 40 40 0 0 1 40 0" fill="none" stroke="${def.bg ?? 'rgba(255,255,255,0.15)'}" stroke-width="12" stroke-linecap="butt" />
			${segmentArcs}</g>
			<path d="${needlePath}" fill="#fff" stroke="rgba(0,0,0,0.6)" stroke-width="1" transform="rotate(${valueAngle})" style="transform-origin:0 0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));" />
			<text x="0" y="2" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>
			${label}
		</svg>`;
	}

	const gaugeR = 40;
	const gaugeCirc = 2 * Math.PI * gaugeR;
	const gaugeColor = def.color ?? '#00E676';
	const gaugeBg = def.bg ?? '#102040';
	const gradId = `pfg-gauge-grad-${c.row}-${c.col}`;
	const gaugeStroke = def.gradient ? `url(#${gradId})` : gaugeColor;
	const off = gaugeCirc * (1 - pct);
	return svg`<svg viewBox="0 0 100 100" style="width:100%;height:100%;">
		<defs>
			${def.gradient ? svg`<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${def.gradient.from}" /><stop offset="100%" stop-color="${def.gradient.to}" /></linearGradient>` : ''}
		</defs>
		<g transform="rotate(-90 50 50)" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">
			<circle cx="50" cy="50" r="${gaugeR}" fill="none" stroke="${gaugeBg}" stroke-width="12" />
			<circle cx="50" cy="50" r="${gaugeR}" fill="none" stroke="${gaugeStroke}" stroke-width="12" stroke-dasharray="${gaugeCirc}" stroke-dashoffset="${off}" stroke-linecap="round" />
		</g>
		<text x="50" y="48" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>
		${def.label && !suppressLabel ? svg`<text x="50" y="70" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${def.label}</text>` : ''}
	</svg>`;
}
