// Inverter + battery status colour/message resolution, extracted and
// deduplicated from build-data.ts (was ~170 lines with 4x copy-paste for
// batteries 1-4).

import { InverterModel } from '../types';
import type { sunsynkPowerFlowCardConfig } from '../types';
import type { CustomEntity } from '../inverters/dto/custom-entity';
import type { InverterSettingsDto } from '../inverters/dto/inverter-settings.dto';

export interface StatusResult {
	inverterStateColour: string;
	inverterStateMsg: string;
	batteryStateColour: string;
	batteryStateMsg: string;
	battery2StateColour: string;
	battery2StateMsg: string;
	battery3StateColour: string;
	battery3StateMsg: string;
	battery4StateColour: string;
	battery4StateMsg: string;
}

export function resolveStatuses(
	config: sunsynkPowerFlowCardConfig,
	inverterModel: InverterModel,
	stateInverterStatus: CustomEntity,
	inverterSettings: InverterSettingsDto,
	batteryStatuses: CustomEntity[],
): StatusResult {
	// Inverter status
	let inverterStateColour = '';
	let inverterStateMsg = '';
	let inverterState = stateInverterStatus.state as string;

	// Status can be returned as decimals "3.0", so this is just to change it to an int
	if (inverterModel == InverterModel.Solis) {
		inverterState = !stateInverterStatus.isNaN()
			? stateInverterStatus.toNum(0).toString()
			: stateInverterStatus.toString();
	}

	let found = false;
	const typeStatusGroups = inverterSettings.statusGroups;
	if (typeStatusGroups)
		for (const groupKey of Object.keys(typeStatusGroups)) {
			const { states, color, message } = typeStatusGroups[groupKey];
			if (states.includes(inverterState.toLowerCase())) {
				inverterStateColour = color;
				inverterStateMsg = message;
				found = true;
				break;
			}
		}

	if (!found) {
		if (
			config.entities?.inverter_status_59 === 'none' ||
			!config.entities?.inverter_status_59
		) {
			inverterStateColour = 'transparent';
			inverterStateMsg = '';
		} else {
			inverterStateColour = 'transparent';
			inverterStateMsg = 'Status';
		}
	}

	// Battery statuses — indexed loop over batteries 1-4
	const result: StatusResult = {
		inverterStateColour,
		inverterStateMsg,
		batteryStateColour: 'transparent',
		batteryStateMsg: '',
		battery2StateColour: 'transparent',
		battery2StateMsg: '',
		battery3StateColour: 'transparent',
		battery3StateMsg: '',
		battery4StateColour: 'transparent',
		battery4StateMsg: '',
	};

	if (
		[
			InverterModel.GoodweGridMode,
			InverterModel.Goodwe,
			InverterModel.Huawei,
		].includes(inverterModel)
	) {
		const batStatusGroups = inverterSettings.batteryStatusGroups;
		const colourKey = (i: number) =>
			(i === 0
				? 'batteryStateColour'
				: `battery${i + 1}StateColour`) as keyof StatusResult;
		const msgKey = (i: number) =>
			(i === 0
				? 'batteryStateMsg'
				: `battery${i + 1}StateMsg`) as keyof StatusResult;
		const foundFlags = batteryStatuses.map(() => false);

		if (batStatusGroups) {
			for (const groupKey of Object.keys(batStatusGroups)) {
				const { states, color, message } = batStatusGroups[groupKey];
				batteryStatuses.forEach((st, i) => {
					if (
						!foundFlags[i] &&
						st.state &&
						states.includes(st.state.toLowerCase())
					) {
						result[colourKey(i)] = color;
						result[msgKey(i)] = message;
						foundFlags[i] = true;
					}
				});
				if (foundFlags.every(Boolean)) break;
			}
		}

		// Default logic per battery
		batteryStatuses.forEach((_st, i) => {
			if (foundFlags[i]) return;
			const entityKey = i === 0 ? 'battery_status' : `battery${i + 1}_status`;
			const entityCfg = (config.entities as Record<string, unknown>)?.[
				entityKey
			];
			if (entityCfg === 'none' || !entityCfg) {
				result[colourKey(i)] = 'transparent';
				result[msgKey(i)] = '';
			} else {
				result[colourKey(i)] = 'transparent';
				result[msgKey(i)] = 'Status';
			}
		});
	}

	return result;
}
