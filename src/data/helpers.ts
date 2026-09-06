import { CustomEntity } from '../inverters/dto/custom-entity';

/**
 * Convert a battery current-direction entity to a signed direction.
 * Returns +1 when discharging, -1 when charging, and null when unknown.
 */
export function getBatteryDirection(state: CustomEntity): number | null {
	const raw = state?.toString()?.toLowerCase().trim();
	if (!raw || raw === 'unknown' || raw === 'unavailable' || raw === 'none') {
		return null;
	}
	if (
		raw === 'discharging' ||
		raw === 'discharge' ||
		raw.includes('discharg') ||
		raw === 'empty'
	) {
		return 1;
	}
	if (
		raw === 'charging' ||
		raw === 'charge' ||
		raw.includes('charg') ||
		raw === 'full'
	) {
		return -1;
	}
	return null;
}

/**
 * Seconds until the battery hits shutdown/capacity given current power.
 * Extracted verbatim from buildData (was an inline closure).
 */
export function calculateTotalSeconds(
	soc: CustomEntity,
	shutdown: number,
	capacity: number,
	energy: number,
	power: number,
	invertFlow: boolean,
): number {
	if (power === 0) {
		return ((soc.toNum(0) - shutdown) / 100) * energy * 60 * 60;
	} else if (invertFlow ? power < 0 : power > 0) {
		return (
			((((soc.toNum(0) - capacity) / 100) * energy) / Math.abs(power)) * 60 * 60
		);
	} else if (invertFlow ? power > 0 : power < 0) {
		return (
			((((capacity - soc.toNum(0)) / 100) * energy) / Math.abs(power)) * 60 * 60
		);
	}
	return 0; // Default case
}
