import { html } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import type { PfgChartDef } from '../../../types';
import './pfg3d-chart';
import type { Pfg3dDef } from './pfg3d-chart';

export function renderSurface3d(
	chartDef: PfgChartDef,
	hass: HomeAssistant,
): unknown {
	const def = chartDef as Pfg3dDef;
	return html`<pfg-3d-chart
		type="surface"
		.def=${def}
		.hass=${hass}
		style="display:block;width:100%;height:100%;pointer-events:auto;"
	></pfg-3d-chart>`;
}
