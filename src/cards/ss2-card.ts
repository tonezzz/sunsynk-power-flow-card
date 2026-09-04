import { html, svg } from 'lit';
import { DataDto, sunsynkPowerFlowCardConfig } from '../types';
import { renderPath } from '../helpers/render-path';
import { renderCircle } from '../helpers/render-circle';

const dotRadius = (lineWidth: number, minLineWidth: number) =>
	Math.min(2 + lineWidth + Math.max(minLineWidth - 2, 0), 8);

interface FlowSpec {
	id: string;
	d: string;
	color: (data: DataDto) => string;
	lineWidth: (data: DataDto) => number;
	power: (data: DataDto) => number;
	invert: (data: DataDto) => boolean;
	viewBox: string;
}

const specs: FlowSpec[] = [
	{
		id: 'pv1',
		d: 'M 187 84 L 187 122 Q 187 132 195 132 L 205 132.03',
		color: (data) => data.solarColour,
		lineWidth: (data) => data.pv1LineWidth,
		power: (data) => data.pv1PowerWatts,
		invert: () => false,
		viewBox: '175 78 40 60',
	},
	{
		id: 'pv2',
		d: 'M 289 84.5 L 289 125 Q 289 132 282 132 L 275 132',
		color: (data) => data.solarColour,
		lineWidth: (data) => data.pv2LineWidth,
		power: (data) => data.pv2PowerWatts,
		invert: () => false,
		viewBox: '265 78 35 60',
	},
	{
		id: 'solar',
		d: 'M 239 190 L 239 147',
		color: (data) => data.solarColour,
		lineWidth: (data) => data.solarLineWidth,
		power: (data) => data.totalPV,
		invert: () => false,
		viewBox: '230 140 20 60',
	},
	{
		id: 'grid-in',
		d: 'M 173 218 L 214 218',
		color: (data) => data.gridColour,
		lineWidth: (data) => data.gridLineWidth,
		power: (data) => data.gridPower,
		invert: (data) => data.gridPower < 0,
		viewBox: '165 210 60 20',
	},
	{
		id: 'grid-out',
		d: 'M 103 218 L 64.5 218',
		color: (data) => data.gridColour,
		lineWidth: (data) => data.gridLineWidth,
		power: (data) => data.gridPower,
		invert: (data) => data.gridPower > 0,
		viewBox: '55 210 60 20',
	},
	{
		id: 'battery',
		d: 'M 239 250 L 239 324',
		color: (data) => data.flowBatColour,
		lineWidth: (data) => data.batLineWidth,
		power: (data) => data.batteryPowerTotal,
		invert: (data) => data.batteryPowerTotal < 0,
		viewBox: '230 245 20 90',
	},
	{
		id: 'load',
		d: 'M 304 218.5 L 264.7 218.5',
		color: (data) => data.flowColour,
		lineWidth: (data) => data.loadLineWidth,
		power: (data) => data.essentialPower,
		invert: (data) => data.essentialPower < 0,
		viewBox: '260 210 50 20',
	},
	{
		id: 'noness',
		d: 'M 374 218.5 L 402.38 218.5',
		color: (data) => data.flowColour,
		lineWidth: (data) => data.loadLineWidth,
		power: (data) => data.nonessentialPower,
		invert: (data) => data.nonessentialPower < 0,
		viewBox: '365 210 45 20',
	},
];

interface Ss2Part {
	viewBox: string;
	render: (data: DataDto) => ReturnType<typeof renderPath>;
}

const parts: Record<string, Ss2Part> = {};

for (const spec of specs) {
	const { id, d, color, lineWidth, power, invert, viewBox } = spec;

	const renderFull = (data: DataDto) => {
		const c = color(data);
		const lw = lineWidth(data);
		const p = power(data);
		const fill = p !== 0 ? c : 'transparent';
		return svg`
			${renderPath(`${id}-line`, d, true, c, lw)}
			${renderCircle(
				`${id}-dot`,
				dotRadius(lw, data.minLineWidth),
				fill,
				data.durationCur,
				'0;1',
				`#${id}-line`,
				invert(data),
			)}
		`;
	};

	const renderPathOnly = (data: DataDto) =>
		renderPath(`${id}-line`, d, true, color(data), lineWidth(data));

	const renderDotOnly = (data: DataDto) => {
		const c = color(data);
		const lw = lineWidth(data);
		const p = power(data);
		const fill = p !== 0 ? c : 'transparent';
		return renderCircle(
			`${id}-dot`,
			dotRadius(lw, data.minLineWidth),
			fill,
			data.durationCur,
			'0;1',
			`#${id}-line`,
			invert(data),
		);
	};

	parts[id] = { viewBox, render: renderFull };
	parts[`${id}-path`] = { viewBox, render: renderPathOnly };
	parts[`${id}-dot`] = { viewBox, render: renderDotOnly };
}

const renderAll = (data: DataDto) => svg`
	${specs.map((spec) => parts[spec.id].render(data))}
`;

export const ss2Card = (
	config: sunsynkPowerFlowCardConfig,
	_inverterImg: string,
	data: DataDto,
) => {
	const part = config.part ? parts[config.part] : undefined;
	const viewBox = part
		? part.viewBox
		: `${data.viewBoxXLite} ${data.viewBoxYLite} ${data.viewBoxWidthLite} ${data.viewBoxHeightLite}`;
	const content = part ? part.render(data) : renderAll(data);

	return html`
		<ha-card>
			<div class="container card">
				${
					config.title
						? html`<h1 style="text-align:center;margin:0 0 12px 0;">
								${config.title}
							</h1>`
						: ''
				}
				<svg
					viewBox="${viewBox}"
					preserveAspectRatio="xMidYMid meet"
					height="${data.cardHeight}"
					width="${data.cardWidth}"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					style="background:#102040;"
				>
					${content}
				</svg>
			</div>
		</ha-card>
	`;
};
