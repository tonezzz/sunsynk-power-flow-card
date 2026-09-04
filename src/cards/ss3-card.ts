import { html } from 'lit';
import { DataDto, sunsynkPowerFlowCardConfig } from '../types';
import { renderGridElements } from '../components/compact/grid/grid-elements';

export const ss3Card = (
	config: sunsynkPowerFlowCardConfig,
	_inverterImg: string,
	data: DataDto,
) => {
	let gridTemplate;
	try {
		gridTemplate = renderGridElements(data, config);
	} catch (err) {
		gridTemplate = html`
			<text x="50" y="320" fill="red" font-size="14">
				grid render error: ${String(err)}
			</text>
		`;
	}

	return html`
		<ha-card>
			<div class="container card" style="padding:16px; min-height:200px;">
				${
					config.title
						? html`<h1 style="text-align:center;margin:0 0 12px 0;">
								${config.title}
							</h1>`
						: ''
				}
				<svg
					viewBox="0 0 490 405"
					height="405"
					width="100%"
					xmlns="http://www.w3.org/2000/svg"
					style="background:#102040;"
				>
					<text x="50" y="260" fill="white" font-size="20">
						cardstyle = ${config.cardstyle}
					</text>
					<text x="50" y="290" fill="white" font-size="16">
						grid power = ${data.totalGridPower}
					</text>
					${gridTemplate}
				</svg>
			</div>
		</ha-card>
	`;
};
