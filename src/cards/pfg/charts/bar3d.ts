import { html } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import type { PfgBar3dChartDef } from '../../../types';
import './pfg3d-chart';

export function renderBar3d(
	def: PfgBar3dChartDef,
	hass: HomeAssistant,
): unknown {
	return html`<pfg-3d-chart
		type="bar"
		.def=${def}
		.hass=${hass}
		style="display:block;width:100%;height:100%;pointer-events:auto;"
	></pfg-3d-chart>`;
}
