import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef } from '../../types';
import { renderBars } from './charts/bars';
import { renderBar } from './charts/bar';
import { renderHistory } from './charts/history';
import { renderGauge } from './charts/gauge';
import { renderGroup } from './charts/group';
import { renderCycle } from './charts/cycle';
import { renderSurface3d } from './charts/surface3d';

export type PfgCell = { row: number; col: number };
export type ChartRenderer = (
	def: PfgChartDef,
	c: PfgCell,
	hass: HomeAssistant,
	suppressLabel: boolean,
) => unknown;

/**
 * Chart-type registry — add a renderer here (or via registerChart) and it
 * becomes available to tiles, groups, and cycle steps.
 */
const RENDERERS: Record<string, ChartRenderer> = {
	bar: (d, _c, h, s) => renderBar(d as never, h, s),
	bars: (d, _c, h) => renderBars(d as never, h),
	history: (d, _c, h) => renderHistory(d as never, h),
	area: (d, _c, h) => renderHistory(d as never, h),
	gauge: (d, c, h, s) => renderGauge(d as never, c, h, s),
	group: (d, c, h, s) => renderGroup(d as never, c, h, s),
	cycle: (d, c, h) => renderCycle(d as never, c, h),
	surface3d: (d, _c, h) => renderSurface3d(d as never, h),
};

export function registerChart(type: string, fn: ChartRenderer): void {
	RENDERERS[type] = fn;
}

export function renderPfgChart(
	chartDef: PfgChartDef,
	c: PfgCell,
	hass?: HomeAssistant,
	suppressLabel = false,
): unknown {
	if (!chartDef || !hass) return undefined;
	return RENDERERS[chartDef.type]?.(chartDef, c, hass, suppressLabel);
}

// Re-exports — pfg-card.ts keeps a single import site.
export { STATUS_COLORS, hexToRgba, stateToStatus } from './shared';
export { chartOverlayStyle } from './place';
export { historyCache } from './history';
