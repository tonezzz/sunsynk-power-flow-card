import { html } from 'lit';
import { DataDto, sunsynkPowerFlowCardConfig } from '../types';
import { renderGridElements } from '../components/compact/grid/grid-elements';

export const ss4Card = (
	config: sunsynkPowerFlowCardConfig,
	_inverterImg: string,
	data: DataDto,
) => {
	// Provide minimal defaults so renderGridElements does not throw on
	// a card config that omits inverter/grid settings.
	const safeConfig = {
		...config,
		inverter: { three_phase: false, ...(config.inverter || {}) },
		grid: {
			auto_scale: false,
			invert_flow: false,
			...(config.grid || {}),
		},
	};

	let gridTemplate;
	try {
		gridTemplate = renderGridElements(data, safeConfig);
	} catch (err) {
		gridTemplate = html`
			<text x="50" y="320" fill="red" font-size="14">
				grid render error: ${String(err)}
			</text>
		`;
	}

	return html`
		<ha-card>
			<div class="container card" style="padding:0; min-height:0;">
				<svg
					viewBox="0 0 490 405"
					height="405"
					width="100%"
					preserveAspectRatio="xMidYMid meet"
					xmlns="http://www.w3.org/2000/svg"
					style="background:#102040;"
				>
					${gridTemplate}
				</svg>
			</div>
		</ha-card>
	`;
};
