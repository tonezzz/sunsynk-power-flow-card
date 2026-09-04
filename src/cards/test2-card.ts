import { html } from 'lit';
import { cache } from 'lit/directives/cache.js';
import { keyed } from 'lit/directives/keyed.js';
import { DataDto, sunsynkPowerFlowCardConfig } from '../types';
import { getDynamicStyles } from '../style';
import { renderSolarElements } from '../components/compact/pv/pv-elements';
import { renderBatteryElements } from '../components/compact/bat/bat-elements';
import { renderGridElements } from '../components/compact/grid/grid-elements';
import { renderLoadElements } from '../components/compact/load/load-elements';
import { renderInverterElements } from '../components/compact/inverter/inverter-elements';

const fmtNum = (v: unknown, digits = 0) =>
	v !== undefined && v !== null && Number.isFinite(Number(v))
		? Number(v).toFixed(digits)
		: '--';

const test2HtmlPanel = (data: DataDto) => html`
	<div
		style="width:100%;box-sizing:border-box;padding:6px 8px;background:rgba(0,0,0,0.4);color:#fff;font-family:Roboto,sans-serif;font-size:13px;"
	>
		<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">
			<div>
				<div style="font-weight:500;">Pack 1</div>
				<div>SOC: ${data.stateBatterySoc.toNum(0)}%</div>
				<div>Power: ${fmtNum(data.batteryPower)} W</div>
				<div>Energy: ${fmtNum(data.batteryEnergy)} Wh</div>
			</div>
			<div>
				<div style="font-weight:500;">Pack 2</div>
				<div>SOC: ${data.stateBattery2Soc.toNum(0)}%</div>
				<div>Power: ${fmtNum(data.battery2Power)} W</div>
				<div>Energy: ${fmtNum(data.battery2Energy)} Wh</div>
			</div>
			<div>
				<div style="font-weight:500;">Pack 3</div>
				<div>SOC: ${data.stateBattery3Soc.toNum(0)}%</div>
				<div>Power: ${fmtNum(data.battery3Power)} W</div>
				<div>Energy: ${fmtNum(data.battery3Energy)} Wh</div>
			</div>
			<div>
				<div style="font-weight:500;">Pack 4</div>
				<div>SOC: ${data.stateBattery4Soc.toNum(0)}%</div>
				<div>Power: ${fmtNum(data.battery4Power)} W</div>
				<div>Energy: ${fmtNum(data.battery4Energy)} Wh</div>
			</div>
		</div>
	</div>
`;

export const test2Card = (
	config: sunsynkPowerFlowCardConfig,
	inverterImg: string,
	data: DataDto,
) => {
	const titleKey = config.title
		? `${config.title}|${config.title_colour ?? ''}|${config.title_size ?? ''}`
		: 'no-title';
	const titleTemplate = config.title
		? cache(
				keyed(
					titleKey,
					html`<h1
						style="text-align: center; color: ${
							config.title_colour || 'inherit'
						}; font-size: ${config.title_size || '32px'};"
					>
						${config.title}
					</h1>`,
				),
			)
		: '';
	return html`
		<ha-card>
			${getDynamicStyles(data)}
			<div class="container card">
				${titleTemplate}
				<svg
					viewBox="${
						config.wide
							? '0 0 720 405'
							: `${data.viewBoxXLite} ${data.viewBoxYLite} ${data.viewBoxWidthLite} ${data.viewBoxHeightLite}`
					}"
					preserveAspectRatio="xMidYMid meet"
					height="${data.cardHeight}"
					width="${data.cardWidth}"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
				>
					<!-- Solar Elements -->
					${renderSolarElements(data, config)}

					<!-- Battery Elements -->
					${renderBatteryElements(data, config)}

					<!-- Grid Elements -->
					${renderGridElements(data, config)}

					<!-- Load Elements -->
					${renderLoadElements(data, config)}

					<!-- Inverter Elements -->
					${renderInverterElements(data, inverterImg, config)}
				</svg>

				<!-- Test2 HTML Pack Panel -->
				${test2HtmlPanel(data)}
			</div>
		</ha-card>
	`;
};
