import { HomeAssistant } from 'custom-card-helpers';
import { PfgBaseChartDef } from '../../types';

export const STATUS_COLORS: Record<string, string> = {
	online: '#00E676',
	offline: '#FF1744',
	running: '#00E676',
	stopped: '#FF1744',
	warning: '#FF9100',
	unknown: '#9E9E9E',
};

export function hexToRgba(hex: string, alpha: number): string {
	const clean = hex.replace('#', '');
	const r = parseInt(clean.substring(0, 2), 16);
	const g = parseInt(clean.substring(2, 4), 16);
	const b = parseInt(clean.substring(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

export function stateToStatus(state?: string): string {
	if (!state) return 'unknown';
	const s = state.toLowerCase();
	if (
		[
			'on',
			'home',
			'running',
			'connected',
			'up',
			'open',
			'detected',
			'available',
			'ok',
			'true',
			'active',
		].includes(s)
	) {
		return 'online';
	}
	if (
		[
			'off',
			'away',
			'not_home',
			'disconnected',
			'down',
			'closed',
			'false',
			'inactive',
		].includes(s)
	) {
		return 'offline';
	}
	if (['stopped', 'not_running'].includes(s)) return 'stopped';
	if (['unavailable', 'unknown', 'none', 'null'].includes(s)) return 'unknown';
	return 'warning';
}

/** Shared entity/value resolution for scalar charts (bar, gauge, history). */
export interface ResolvedChartValue {
	ents: string[];
	rawVal: number;
	min: number;
	max: number;
	scale: number;
	scaledVal: number;
	pct: number;
	displayVal: string;
	getAngle: (v: number) => number;
	sortedSegs: { from: number; color: string }[];
	activeColor: string;
}

export function resolveChartValue(
	def: PfgBaseChartDef,
	hass: HomeAssistant,
): ResolvedChartValue {
	const ents: string[] =
		def.entities && def.entities.length
			? def.entities
			: def.entity
				? [def.entity]
				: [];
	const rawVal = ents.length
		? ents.reduce((sum, e) => sum + (parseFloat(hass.states[e]?.state) || 0), 0)
		: parseFloat(String(def.value ?? 0)) || 0;
	const min = def.min ?? 0;
	const max = def.max ?? 100;
	const scale = def.scale ?? 1;
	const scaledVal = rawVal * scale;
	const pct = Math.min(
		Math.max(max > min ? (rawVal - min) / (max - min) : 0, 0),
		1,
	);
	const decimals = def.decimals ?? 0;
	const displayVal = `${scaledVal.toFixed(decimals)}${def.unit ? ` ${def.unit}` : ''}`;
	const getAngle = (v: number) =>
		((Math.max(min, Math.min(v, max)) - min) / (max - min)) * 180;
	const sortedSegs = [...(def.segments || [])].sort((a, b) => a.from - b.from);
	const activeColor = sortedSegs.reduce(
		(color, seg) => (rawVal >= seg.from ? seg.color : color),
		def.color ?? '#00E676',
	);
	return {
		ents,
		rawVal,
		min,
		max,
		scale,
		scaledVal,
		pct,
		displayVal,
		getAngle,
		sortedSegs,
		activeColor,
	};
}
