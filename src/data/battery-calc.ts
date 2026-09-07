// Battery capacity calculation — deduplicated from four identical blocks
// that lived in build-data.ts (battery 1-4).

import type { CustomEntity } from '../inverters/dto/custom-entity';
import type { InverterSettings } from '../types';
import type { InverterSettingsDto } from '../inverters/dto/inverter-settings.dto';

export interface BatteryCapacityInput {
	show: boolean;
	power: number;
	invertFlow: boolean;
	gridStatus: string;
	shutdown: number;
	offGridState: CustomEntity;
	offGridShutdown: number;
	maxSoc: number;
	soc: CustomEntity;
	inverterProg: InverterSettings;
	inverterSettings: InverterSettingsDto;
}

export function calcBatteryCapacity(o: BatteryCapacityInput): number {
	if (!o.show) return 0;
	if (!o.inverterProg.show) {
		const discharging = o.invertFlow ? o.power < 0 : o.power > 0;
		if (discharging) {
			const gs = o.gridStatus.toLowerCase();
			const offGrid = gs === 'off' || o.gridStatus === '0' || gs === 'off-grid';
			if (offGrid && o.offGridState.notEmpty()) return o.offGridShutdown;
			return o.shutdown;
		}
		const charging = o.invertFlow ? o.power > 0 : o.power < 0;
		return charging ? o.maxSoc : 0;
	}
	return o.inverterSettings.getBatteryCapacity(
		o.power,
		o.gridStatus,
		o.shutdown,
		o.inverterProg,
		o.soc,
		o.maxSoc,
		o.invertFlow,
	);
}

import { calculateTotalSeconds } from './helpers';
import { localize } from '../localize/localize';

export interface BatteryRuntime {
	formattedTime: string;
	duration: string;
}

// Remaining charge/discharge time + human duration for one battery.
// Replaces four copy-pasted blocks in buildData().
export function formatBatteryRuntime(
	soc: CustomEntity,
	shutdown: number,
	capacity: number,
	energy: number,
	power: number,
	invertFlow: boolean | undefined,
): BatteryRuntime {
	const totalSeconds = calculateTotalSeconds(
		soc,
		shutdown,
		capacity,
		energy,
		power,
		invertFlow,
	);
	const t = new Date(Date.now() + totalSeconds * 1000);
	const formattedTime = `${t.getHours().toString().padStart(2, '0')}:${t
		.getMinutes()
		.toString()
		.padStart(2, '0')}`;
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	let duration = '';
	if (days > 0) duration += `${days} ${localize('common.days')}, `;
	if (hours > 0 || days > 0) duration += `${hours} ${localize('common.hrs')}, `;
	duration += `${minutes} ${localize('common.min')}`;
	return { formattedTime, duration };
}

export const isBatteryFloating = (cur: number, soc: number) =>
	-2 <= cur && cur <= 2 && soc >= 99;

// Charge colour when actively charging (not floating), else the configured colour.
export function pickBatteryColour(
	invertFlow: boolean | undefined,
	power: number,
	floating: boolean,
	chargeColour: string,
	baseColour: string,
): string {
	const charging =
		invertFlow === true ? power > 0 && !floating : power < 0 && !floating;
	return charging ? chargeColour : baseColour;
}
