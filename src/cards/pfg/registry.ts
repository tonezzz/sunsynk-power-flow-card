import { HomeAssistant } from 'custom-card-helpers';
import { PfgChartDef } from '../../types';

export type PfgCell = { row: number; col: number };
export type ChartRenderer = (
	def: PfgChartDef,
	c: PfgCell,
	hass: HomeAssistant,
	suppressLabel: boolean,
) => unknown;

/**
 * Chart-type registry — lives in its own module so composite charts
 * (group, cycle) can dispatch children without a circular import on
 * the module that registers all renderers.
 */
const RENDERERS: Record<string, ChartRenderer> = {};

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
