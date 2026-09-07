import { html } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgGroupChartDef } from '../../../types';
import { renderPfgChart } from '../index';

export function renderGroup(
	def: PfgGroupChartDef,
	c: { row: number; col: number },
	hass: HomeAssistant,
	suppressLabel: boolean,
): unknown {
	const groups = def.groups ?? [];
	if (!groups.length) return undefined;
	const horiz = def.direction === 'horizontal';
	const groupGap = Math.max(0, Math.min(def.group_gap ?? 1, 15));
	return html`<div
		style="position:absolute;inset:0;display:flex;flex-direction:${
			horiz ? 'row' : 'column'
		};"
	>
		${groups.map(
			(g, gi) => html`
				<div
					style="position:relative;flex:1 1 0;min-height:0;min-width:0;overflow:hidden;${
						gi ? `${horiz ? 'margin-left' : 'margin-top'}:${groupGap}%;` : ''
					}"
				>
					${
						g.label
							? html`<div
									style="position:absolute;top:1%;left:0;right:0;text-align:center;font-weight:bold;font-size:min(1.8vw,12px);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);z-index:3;pointer-events:none;"
								>
									${g.label}
								</div>`
							: ''
					}
					${(g.charts ?? (g.chart ? [g.chart] : [])).map(
						(d) =>
							html`<div
								style="position:absolute;left:0;right:0;top:${
									g.label ? '8%' : '0'
								};bottom:0;"
							>
								${renderPfgChart(d, c, hass, suppressLabel)}
							</div>`,
					)}
				</div>
			`,
		)}
	</div>`;
}
