import { svg } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgBarChartDef } from '../../../types';
import { resolveChartValue } from '../shared';

export function renderBar(
	def: PfgBarChartDef,
	hass: HomeAssistant,
	suppressLabel: boolean,
): unknown {
	const { pct, displayVal, activeColor } = resolveChartValue(def, hass);
	const label =
		def.label && !suppressLabel
			? svg`<text x="50" y="8" text-anchor="middle" font-size="8" font-weight="bold" fill="#aaa" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">${def.label}</text>`
			: '';
	const value = svg`<text x="50" y="95" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="bold" fill="#fff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));;transform:translateY(-10px)">${displayVal}</text>`;
	if (def.orientation === 'horizontal') {
		const barWidth = 76 * pct;
		return svg`<svg viewBox="0 0 100 100" style="width:100%;height:100%;">
			<rect x="10" y="40" width="80" height="20" rx="4" fill="none" stroke="${def.bg ?? 'rgba(255,255,255,0.15)'}" stroke-width="2" />
			<rect x="12" y="42" width="${barWidth}" height="16" rx="2" fill="${activeColor}" />
			${value}
			${label}
		</svg>`;
	}
	const barHeight = 70 * pct;
	return svg`<svg viewBox="0 0 100 100" style="width:100%;height:100%;">
		<rect x="20" y="15" width="60" height="70" rx="4" fill="none" stroke="${def.bg ?? 'rgba(255,255,255,0.15)'}" stroke-width="2" />
		<rect x="24" y="${85 - barHeight}" width="52" height="${barHeight}" rx="2" fill="${activeColor}" />
		${value}
		${label}
	</svg>`;
}
