import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef, PfgCycleChartDef } from '../../../types';
import { renderPfgChart } from '../index';
import { chartOverlayStyle } from '../place';

export function renderCycle(
	def: PfgCycleChartDef,
	c: { row: number; col: number },
	hass: HomeAssistant,
): unknown {
	return html`<pfg-cycle
		.steps="${def.steps}"
		.c="${c}"
		.hass="${hass}"
		.interval="${def.interval ?? 3}"
	></pfg-cycle>`;
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
				// Cycle steps only support bottom/center overlays.
				const style = chartOverlayStyle({
					...chartDef,
					position: chartDef.position === 'bottom' ? 'bottom' : 'center',
				});
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
