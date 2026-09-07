/* eslint-disable no-useless-assignment -- block moved verbatim from build-data.ts; the flagged stores are pre-existing dead writes, not new logic */
// Flow/animation math extracted from build-data.ts: line widths,
// animation speeds, dynamic colours, load icon mapping, PV efficiency.
// Inputs arrive via the `o` bag; returns everything the DataDto needs.

import { validGridConnected, validGridDisconnected } from '../const';
import { Utils } from '../helpers/utils';
import { icons } from '../helpers/icons';
import { BatteryIconManager } from '../helpers/battery-icon-manager';
import type { CustomEntity } from '../inverters/dto/custom-entity';
import type { sunsynkPowerFlowCardConfig } from '../types';
import type { SunsynkPowerFlowCard } from '../index';

export interface FlowInput {
	additionalLoad: number;
	autoScaledGridPower: number;
	auxPower: number;
	batteryColour: string;
	batteryPower: number;
	batteryPowerTotal: number;
	batteryShutdown: number;
	batteryShutdown2: number;
	batteryShutdown3: number;
	batteryShutdown4: number;
	config: sunsynkPowerFlowCardConfig;
	essentialPower: number;
	gridColour: string;
	gridOffColour: string;
	gridStatus: string;
	iconGridDisconnected: string;
	iconGridExport: string;
	iconGridImport: string;
	inverterColour: string;
	loadColour: string;
	nonessentialPower: number;
	priorityLoad: string;
	pv1PowerWatts: number;
	pv2PowerWatts: number;
	pv3PowerWatts: number;
	pv4PowerWatts: number;
	pv5PowerWatts: number;
	pv6PowerWatts: number;
	shutdownOffGrid: number;
	shutdownOffGrid2: number;
	solarColour: string;
	stateBattery2Soc: CustomEntity;
	stateBattery3Soc: CustomEntity;
	stateBattery4Soc: CustomEntity;
	stateBatterySoc: CustomEntity;
	stateEssentialLoad1: CustomEntity;
	stateEssentialLoad2: CustomEntity;
	stateEssentialLoad3: CustomEntity;
	stateEssentialLoad4: CustomEntity;
	stateEssentialLoad5: CustomEntity;
	stateEssentialLoad6: CustomEntity;
	stateShutdownSOCOffGrid: CustomEntity;
	stateShutdownSOCOffGrid2: CustomEntity;
	threePhase: boolean;
	totalGridPower: number;
	totalPV: number;
}

export function resolveFlow(card: SunsynkPowerFlowCard, o: FlowInput) {
	const config = o.config;
	const {
		additionalLoad,
		autoScaledGridPower,
		auxPower,
		batteryColour,
		batteryPower,
		batteryPowerTotal,
		batteryShutdown,
		batteryShutdown2,
		batteryShutdown3,
		batteryShutdown4,
		essentialPower,
		gridColour,
		gridOffColour,
		gridStatus,
		iconGridDisconnected,
		iconGridExport,
		iconGridImport,
		inverterColour,
		loadColour,
		nonessentialPower,
		priorityLoad,
		pv1PowerWatts,
		pv2PowerWatts,
		pv3PowerWatts,
		pv4PowerWatts,
		pv5PowerWatts,
		pv6PowerWatts,
		shutdownOffGrid,
		shutdownOffGrid2,
		solarColour,
		stateBattery2Soc,
		stateBattery3Soc,
		stateBattery4Soc,
		stateBatterySoc,
		stateEssentialLoad1,
		stateEssentialLoad2,
		stateEssentialLoad3,
		stateEssentialLoad4,
		stateEssentialLoad5,
		stateEssentialLoad6,
		stateShutdownSOCOffGrid,
		stateShutdownSOCOffGrid2,
		threePhase,
		totalGridPower,
		totalPV,
	} = o;

	const maxLineWidth =
		(Utils.toNum(config.max_line_width) < 1 ? 1 : config.max_line_width) - 1;
	const minLineWidth = Utils.toNum(config.min_line_width) || 1;

	const batteryMaxPower = card.getEntity('battery.max_power', {
		state: config.battery.max_power?.toString() ?? '',
	});
	const BattMaxPower = batteryMaxPower.toNum(0);
	const solarMaxPower = card.getEntity('solar.max_power', {
		state: config.solar.max_power?.toString() ?? '',
	});
	const loadMaxPower = card.getEntity('load.max_power', {
		state: config.load.max_power?.toString() ?? '',
	});
	const gridMaxPower = card.getEntity('grid.max_power', {
		state: config.grid.max_power?.toString() ?? '',
	});

	//Calculate line width depending on power usage
	const pv1LineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				pv1PowerWatts,
				solarMaxPower.toNum() || pv1PowerWatts,
				maxLineWidth,
				minLineWidth,
			);
	const pv2LineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				pv2PowerWatts,
				solarMaxPower.toNum() || pv2PowerWatts,
				maxLineWidth,
				minLineWidth,
			);
	const pv3LineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				pv3PowerWatts,
				solarMaxPower.toNum() || pv3PowerWatts,
				maxLineWidth,
				minLineWidth,
			);
	const pv4LineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				pv4PowerWatts,
				solarMaxPower.toNum() || pv4PowerWatts,
				maxLineWidth,
				minLineWidth,
			);
	const pv5LineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				pv5PowerWatts,
				solarMaxPower.toNum() || pv5PowerWatts,
				maxLineWidth,
				minLineWidth,
			);
	const pv6LineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				pv6PowerWatts,
				solarMaxPower.toNum() || pv6PowerWatts,
				maxLineWidth,
				minLineWidth,
			);
	const batLineWidth = !config.battery.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				Math.abs(batteryPowerTotal),
				BattMaxPower || Math.abs(batteryPowerTotal),
				maxLineWidth,
				minLineWidth,
			);
	const loadLineWidth = !config.load.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				Math.abs(essentialPower),
				loadMaxPower.toNum() || Math.abs(essentialPower),
				maxLineWidth,
				minLineWidth,
			);
	const auxLineWidth = !config.load.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				Math.abs(auxPower),
				loadMaxPower.toNum() || Math.abs(auxPower),
				maxLineWidth,
				minLineWidth,
			);
	const gridLineWidth = !config.grid.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				Math.abs(totalGridPower),
				gridMaxPower.toNum() || Math.abs(totalGridPower),
				maxLineWidth,
				minLineWidth,
			);
	const grid169LineWidth = !config.grid.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				Math.abs(autoScaledGridPower),
				gridMaxPower.toNum() || Math.abs(autoScaledGridPower),
				maxLineWidth,
				minLineWidth,
			);
	const nonessLineWidth = !config.grid.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				Math.abs(nonessentialPower),
				gridMaxPower.toNum() || Math.abs(nonessentialPower),
				maxLineWidth,
				minLineWidth,
			);
	const solarLineWidth = !config.solar.max_power
		? minLineWidth
		: card.dynamicLineWidth(
				totalPV,
				solarMaxPower.toNum() || totalPV,
				maxLineWidth,
				minLineWidth,
			);

	//Calculate power use animation speeds depending on Inverter size
	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(totalPV / (solarMaxPower.toNum() || totalPV));
		card.changeAnimationSpeed(`solar`, speed);
	}

	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(pv1PowerWatts / (solarMaxPower.toNum() || pv1PowerWatts));
		card.changeAnimationSpeed(`pv1`, speed);
	}

	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(pv2PowerWatts / (solarMaxPower.toNum() || pv2PowerWatts));
		card.changeAnimationSpeed(`pv2`, speed);
	}

	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(pv3PowerWatts / (solarMaxPower.toNum() || pv3PowerWatts));
		card.changeAnimationSpeed(`pv3`, speed);
	}

	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(pv4PowerWatts / (solarMaxPower.toNum() || pv4PowerWatts));
		card.changeAnimationSpeed(`pv4`, speed);
	}

	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(pv5PowerWatts / (solarMaxPower.toNum() || pv5PowerWatts));
		card.changeAnimationSpeed(`pv5`, speed);
	}

	if (config && config.solar && config.solar.animation_speed) {
		const speed =
			config.solar.animation_speed -
			(config.solar.animation_speed - 1) *
				(pv6PowerWatts / (solarMaxPower.toNum() || pv6PowerWatts));
		card.changeAnimationSpeed(`pv6`, speed);
	}

	if (config && config.battery && config.battery.animation_speed) {
		const speed =
			config.battery.animation_speed -
			(config.battery.animation_speed - 1) *
				(Math.abs(batteryPowerTotal) /
					(BattMaxPower || Math.abs(batteryPowerTotal)));
		card.changeAnimationSpeed(`battery`, speed);
	}

	if (config && config.load && config.load.animation_speed) {
		const speed =
			config.load.animation_speed -
			(config.load.animation_speed - 1) *
				(Math.abs(essentialPower) /
					(loadMaxPower.toNum() || Math.abs(essentialPower)));
		card.changeAnimationSpeed(`load`, speed);
		card.changeAnimationSpeed(`load1`, speed);
	}

	if (config && config.load && config.load.animation_speed) {
		const speed =
			config.load.animation_speed -
			(config.load.animation_speed - 1) *
				(Math.abs(auxPower) / (loadMaxPower.toNum() || Math.abs(auxPower)));
		card.changeAnimationSpeed(`aux`, speed);
		card.changeAnimationSpeed(`aux1`, speed);
	}

	if (config && config.grid && config.grid.animation_speed) {
		const speed =
			config.grid.animation_speed -
			(config.grid.animation_speed - 1) *
				(Math.abs(totalGridPower) /
					(gridMaxPower.toNum() || Math.abs(totalGridPower)));
		card.changeAnimationSpeed(`grid1`, speed);
		card.changeAnimationSpeed(`grid`, speed);
		card.changeAnimationSpeed(`grid2`, speed);
	}

	if (config && config.grid && config.grid.animation_speed) {
		const speed =
			config.grid.animation_speed -
			(config.grid.animation_speed - 1) *
				(Math.abs(nonessentialPower) /
					(gridMaxPower.toNum() || Math.abs(nonessentialPower)));
		card.changeAnimationSpeed(`ne`, speed);
	}

	//Calculate dynamic colour for load icon based on the contribution of the power source (battery, grid, solar) supplying the load

	const pvPercentageRaw =
		totalPV === 0
			? 0
			: priorityLoad === 'off' || !priorityLoad
				? config.battery.invert_flow === true
					? batteryPowerTotal < 0
						? (totalPV /
								(threePhase
									? essentialPower + Math.max(auxPower, 0)
									: essentialPower)) *
							100
						: ((totalPV - Math.abs(batteryPowerTotal)) /
								(threePhase
									? essentialPower + Math.max(auxPower, 0)
									: essentialPower)) *
							100
					: batteryPowerTotal > 0
						? (totalPV /
								(threePhase
									? essentialPower + Math.max(auxPower, 0)
									: essentialPower)) *
							100
						: ((totalPV - Math.abs(batteryPowerTotal)) /
								(threePhase
									? essentialPower + Math.max(auxPower, 0)
									: essentialPower)) *
							100
				: (totalPV /
						(threePhase
							? essentialPower + Math.max(auxPower, 0)
							: essentialPower)) *
					100;

	const batteryPercentageRaw =
		config.battery.invert_flow === true
			? batteryPowerTotal >= 0
				? 0
				: (Math.abs(batteryPowerTotal) /
						(threePhase
							? essentialPower + Math.max(auxPower, 0)
							: essentialPower)) *
					100
			: batteryPowerTotal <= 0
				? 0
				: (Math.abs(batteryPowerTotal) /
						(threePhase
							? essentialPower + Math.max(auxPower, 0)
							: essentialPower)) *
					100;

	//console.log(`${pvPercentageRaw} % RAW PV to load, ${batteryPercentageRaw} % RAW Bat to load`);

	// Normalize percentages
	const totalPercentage = pvPercentageRaw + batteryPercentageRaw;
	const normalizedPvPercentage =
		totalPercentage === 0 ? 0 : (pvPercentageRaw / totalPercentage) * 100;
	const normalizedBatteryPercentage =
		totalPercentage === 0 ? 0 : (batteryPercentageRaw / totalPercentage) * 100;

	//console.log(`${normalizedPvPercentage} % normalizedPVPercentage to load, ${normalizedBatteryPercentage} % normalizedBatteryPercentage to load`);

	let pvPercentage = 0;
	let batteryPercentage = 0;
	let gridPercentage = 0;
	if (totalPercentage > 100) {
		pvPercentage = Utils.toNum(normalizedPvPercentage, 0);
		batteryPercentage = Utils.toNum(normalizedBatteryPercentage, 0);
	} else {
		pvPercentage = Utils.toNum(Math.min(pvPercentageRaw, 100), 0);
		batteryPercentage = Utils.toNum(Math.min(batteryPercentageRaw, 100), 0);
		gridPercentage =
			totalGridPower > 0 ? 100 - (pvPercentage + batteryPercentage) : 0;
	}

	//console.log(`${pvPercentage} % PVPercentage, ${batteryPercentage} % BatteryPercentage, ${gridPercentage} % GridPercentage`);

	//Calculate dynamic colour for battery icon based on the contribution of the power source (grid, solar) supplying the battery
	const pvPercentageRawBat =
		totalPV === 0 ||
		(config.battery.invert_flow === true
			? batteryPowerTotal <= 0
			: batteryPowerTotal >= 0)
			? 0
			: priorityLoad === 'off' || !priorityLoad
				? (totalPV / Math.abs(batteryPowerTotal)) * 100
				: ((totalPV - essentialPower) / Math.abs(batteryPowerTotal)) * 100;
	const gridPercentageRawBat =
		(config.battery.invert_flow === true
			? batteryPower <= 0
			: batteryPower >= 0) || totalGridPower <= 0
			? 0
			: priorityLoad === 'on'
				? totalPV - essentialPower >= Math.abs(batteryPowerTotal)
					? 0
					: ((totalGridPower - Math.max(essentialPower - totalPV, 0)) /
							Math.abs(batteryPowerTotal)) *
						100
				: totalPV >= Math.abs(batteryPowerTotal)
					? 0
					: ((Math.abs(batteryPowerTotal) - totalPV) /
							Math.abs(batteryPowerTotal)) *
						100;

	//console.log(`${pvPercentageRawBat} % RAW PV to charge battery, ${gridPercentageRawBat} % RAW Grid to charge battery`);
	// Normalize percentages
	const totalPercentageBat = pvPercentageRawBat + gridPercentageRawBat;
	const normalizedPvPercentage_bat =
		totalPercentageBat === 0
			? 0
			: (pvPercentageRawBat / totalPercentageBat) * 100;
	const normalizedGridPercentage =
		totalPercentageBat === 0
			? 0
			: (gridPercentageRawBat / totalPercentageBat) * 100;

	let pvPercentageBat = 0;
	let gridPercentageBat = 0;
	if (totalPercentageBat > 100) {
		pvPercentageBat = Utils.toNum(normalizedPvPercentage_bat, 0);
		gridPercentageBat = Utils.toNum(normalizedGridPercentage, 0);
	} else {
		pvPercentageBat = Utils.toNum(Math.min(pvPercentageRawBat, 100), 0);
		gridPercentageBat = Utils.toNum(Math.min(gridPercentageRawBat, 100), 0);
	}

	let flowBatColour: string;
	switch (true) {
		case pvPercentageBat >= Utils.toNum(config.battery?.path_threshold, 0):
			flowBatColour = Utils.toHexColor(solarColour);
			break;
		case gridPercentageBat >= Utils.toNum(config.battery?.path_threshold, 0):
			flowBatColour = Utils.toHexColor(gridColour);
			break;
		default:
			flowBatColour = Utils.toHexColor(batteryColour);
			break;
	}

	// console.log({flowBatColour, solarColour, gridColour, batteryColour});

	let flowColour: string;
	switch (true) {
		case pvPercentage >= Utils.toNum(config.load?.path_threshold, 0):
			flowColour = Utils.toHexColor(solarColour);
			break;
		case batteryPercentage >= Utils.toNum(config.load?.path_threshold, 0):
			flowColour = Utils.toHexColor(batteryColour);
			break;
		case gridPercentage >= Utils.toNum(config.load?.path_threshold, 0):
			flowColour = Utils.toHexColor(gridColour);
			break;
		default:
			flowColour = Utils.toHexColor(loadColour);
			break;
	}

	let flowInvColour: string;
	switch (true) {
		case pvPercentage >= Utils.toNum(config.load?.path_threshold, 0):
			flowInvColour = Utils.toHexColor(solarColour);
			break;
		case batteryPercentage >= Utils.toNum(config.load?.path_threshold, 0):
			flowInvColour = Utils.toHexColor(batteryColour);
			break;
		case gridPercentage >= Utils.toNum(config.load?.path_threshold, 0):
			flowInvColour = Utils.toHexColor(gridColour);
			break;
		case gridPercentageBat >= Utils.toNum(config.battery?.path_threshold, 0):
			flowInvColour = Utils.toHexColor(gridColour);
			break;
		default:
			flowInvColour = Utils.toHexColor(inverterColour);
			break;
	}

	//console.log(`${pvPercentageBat} % PV to charge battery, ${gridPercentageBat} % Grid to charge battery`);

	let essIcon: string;
	let essIconSize: number;

	switch (true) {
		case pvPercentageRaw >= 100 &&
			batteryPercentageRaw <= 5 &&
			totalGridPower - nonessentialPower < 50 &&
			config.load.dynamic_icon:
			essIcon = icons.essPv;
			essIconSize = 1;
			break;
		case batteryPercentageRaw >= 100 &&
			pvPercentageRaw <= 5 &&
			totalGridPower - nonessentialPower < 50 &&
			config.load.dynamic_icon:
			essIcon = icons.essBat;
			essIconSize = 0;
			break;
		case pvPercentageRaw < 5 &&
			batteryPercentageRaw < 5 &&
			gridPercentage > 0 &&
			config.load.dynamic_icon:
			essIcon = icons.essGrid;
			essIconSize = 0;
			break;
		default:
			essIcon = icons.ess;
			essIconSize = 0;
			break;
	}

	const { batteryIcon, batteryCharge, stopColour, battery0 } =
		BatteryIconManager.convert(stateBatterySoc);
	const {
		batteryIcon: battery2Icon,
		batteryCharge: battery2Charge,
		stopColour: stop2Colour,
		battery0: battery20,
	} = BatteryIconManager.convert(stateBattery2Soc);
	const {
		batteryIcon: battery3Icon,
		batteryCharge: battery3Charge,
		stopColour: stop3Colour,
		battery0: battery30,
	} = BatteryIconManager.convert(stateBattery3Soc);
	const {
		batteryIcon: battery4Icon,
		batteryCharge: battery4Charge,
		stopColour: stop4Colour,
		battery0: battery40,
	} = BatteryIconManager.convert(stateBattery4Soc);

	//Calculate pv efficiency
	const pv1MaxPower = card.getEntity('solar.pv1_max_power', {
		state: config.solar.pv1_max_power?.toString() ?? '',
	});
	const pv2MaxPower = card.getEntity('solar.pv2_max_power', {
		state: config.solar.pv2_max_power?.toString() ?? '',
	});
	const pv3MaxPower = card.getEntity('solar.pv3_max_power', {
		state: config.solar.pv3_max_power?.toString() ?? '',
	});
	const pv4MaxPower = card.getEntity('solar.pv4_max_power', {
		state: config.solar.pv4_max_power?.toString() ?? '',
	});
	const pv5MaxPower = card.getEntity('solar.pv5_max_power', {
		state: config.solar.pv5_max_power?.toString() ?? '',
	});
	const pv6MaxPower = card.getEntity('solar.pv6_max_power', {
		state: config.solar.pv6_max_power?.toString() ?? '',
	});

	const totalPVEfficiency =
		!config.solar.max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(Math.min((totalPV / solarMaxPower.toNum()) * 100, 200), 0);
	const PV1Efficiency =
		!config.solar.pv1_max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(
					Math.min((pv1PowerWatts / pv1MaxPower.toNum()) * 100, 200),
					0,
				);
	const PV2Efficiency =
		!config.solar.pv2_max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(
					Math.min((pv2PowerWatts / pv2MaxPower.toNum()) * 100, 200),
					0,
				);
	const PV3Efficiency =
		!config.solar.pv3_max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(
					Math.min((pv3PowerWatts / pv3MaxPower.toNum()) * 100, 200),
					0,
				);
	const PV4Efficiency =
		!config.solar.pv4_max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(
					Math.min((pv4PowerWatts / pv4MaxPower.toNum()) * 100, 200),
					0,
				);
	const PV5Efficiency =
		!config.solar.pv5_max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(
					Math.min((pv5PowerWatts / pv5MaxPower.toNum()) * 100, 200),
					0,
				);
	const PV6Efficiency =
		!config.solar.pv6_max_power || config.solar.efficiency === 0
			? 100
			: Utils.toNum(
					Math.min((pv6PowerWatts / pv6MaxPower.toNum()) * 100, 200),
					0,
				);

	let customGridIcon: string;
	let customGridIconColour: string;
	switch (true) {
		case totalGridPower < 0 &&
			validGridConnected.includes(gridStatus.toLowerCase()):
			customGridIcon = iconGridExport;
			customGridIconColour = Utils.toHexColor(gridColour);
			break;
		case totalGridPower >= 0 &&
			validGridConnected.includes(gridStatus.toLowerCase()):
			customGridIcon = iconGridImport;
			customGridIconColour = Utils.toHexColor(gridColour);
			break;
		case totalGridPower === 0 &&
			validGridDisconnected.includes(gridStatus.toLowerCase()):
			customGridIcon = iconGridDisconnected;
			customGridIconColour = Utils.toHexColor(gridOffColour);
			break;
		default:
			customGridIcon = iconGridImport;
			customGridIconColour = Utils.toHexColor(gridColour);
			break;
	}

	let viewBoxYLite: string;
	let viewBoxHeightLite: string;
	let viewBoxXLite: string = '-2';
	let viewBoxWidthLite: string = '490';
	switch (true) {
		case !config.show_solar && config.show_battery && additionalLoad === 0:
			viewBoxYLite = '138';
			viewBoxHeightLite = '280';
			break;
		case !config.show_solar &&
			config.show_battery &&
			[1, 2, 3, 4].includes(additionalLoad):
			viewBoxYLite = '70';
			viewBoxHeightLite = '350';
			break;
		case config.show_solar &&
			!config.show_battery &&
			[2, 3, 4].includes(additionalLoad):
			viewBoxYLite = '0';
			viewBoxHeightLite = '350';
			break;
		case config.show_solar &&
			!config.show_battery &&
			[0, 1].includes(additionalLoad):
			viewBoxYLite = '0';
			viewBoxHeightLite = '315';
			break;
		case !config.show_solar && !config.show_battery && additionalLoad === 0:
			viewBoxYLite = '115';
			viewBoxHeightLite = '225';
			break;
		case !config.show_solar && !config.show_battery && additionalLoad === 1:
			viewBoxYLite = '85';
			viewBoxHeightLite = '230';
			break;
		case !config.show_solar &&
			!config.show_battery &&
			[2, 3, 4].includes(additionalLoad):
			viewBoxYLite = '65';
			viewBoxHeightLite = '285';
			break;
		default:
			viewBoxYLite = '0';
			viewBoxHeightLite = '408';
	}

	// Center content when grid is hidden (Compact/Lite)
	if (!config.show_grid && config?.center_no_grid) {
		let defX = 50;
		let defW = 460;
		// Apply only to compact/lite styles as this affects the Lite/Compact viewBox
		if (config.cardstyle === 'compact') {
			const mppts = Utils.toNum(config.solar?.mppts, 0);
			[defX, defW] = mppts > 2 ? [50, 460] : [70, 460];
		} else if (config.cardstyle === 'lite') {
			[defX, defW] = [50, 460];
		}
		//const x = config.center_no_grid_x ?? defX;
		//const w = config.center_no_grid_width ?? defW;
		viewBoxXLite = String(defX);
		viewBoxWidthLite = String(defW);
	}

	const loadOffThreshold = Utils.toNum(config.load?.off_threshold, 0);
	const offColourTransparent = config.load?.off_colour === 'transparent';

	// Helper function to check if all given loads are <= loadOffThreshold
	const areLoadsBelowThreshold = (...loads) =>
		loads.every((load) => load.toPower(false) <= loadOffThreshold);

	// Initialize colours
	let load1Colour = Utils.toHexColor(loadColour);
	let load2Colour = Utils.toHexColor(loadColour);

	// Mapping for Lite and Compact cards
	const liteCompactLoads = {
		1: [stateEssentialLoad1],
		2: [stateEssentialLoad1],
		3: [stateEssentialLoad1],
		4: [stateEssentialLoad1, stateEssentialLoad2],
		5: [stateEssentialLoad1, stateEssentialLoad2, stateEssentialLoad5],
		6: [stateEssentialLoad1, stateEssentialLoad2, stateEssentialLoad5],
	};
	const liteCompactLoads2 = {
		2: [stateEssentialLoad2],
		3: [stateEssentialLoad2, stateEssentialLoad3],
		4: [stateEssentialLoad3, stateEssentialLoad4],
		5: [stateEssentialLoad3, stateEssentialLoad4],
		6: [stateEssentialLoad3, stateEssentialLoad4, stateEssentialLoad6],
	};

	// Mapping for Full cards
	const fullCardLoads = {
		1: [stateEssentialLoad1],
		2: [stateEssentialLoad1, stateEssentialLoad2],
		4: [stateEssentialLoad1, stateEssentialLoad2],
		5: [stateEssentialLoad1, stateEssentialLoad2, stateEssentialLoad5],
		6: [stateEssentialLoad1, stateEssentialLoad2, stateEssentialLoad5],
	};
	const fullCardLoads2 = {
		4: [stateEssentialLoad3, stateEssentialLoad4],
		5: [stateEssentialLoad3, stateEssentialLoad4],
		6: [stateEssentialLoad3, stateEssentialLoad4, stateEssentialLoad6],
	};

	// Function to determine load color
	const getLoadColour = (essentialLoads, defaultColour) =>
		areLoadsBelowThreshold(...essentialLoads) ? 'transparent' : defaultColour;

	// Logic for Lite and Compact cards
	if (offColourTransparent && (card.isLiteCard || card.isCompactCard)) {
		load1Colour = getLoadColour(
			liteCompactLoads[additionalLoad] || [],
			load1Colour,
		);
		load2Colour = getLoadColour(
			liteCompactLoads2[additionalLoad] || [],
			load2Colour,
		);
	}

	// Logic for Full cards
	if (offColourTransparent && card.isFullCard) {
		load1Colour = getLoadColour(
			fullCardLoads[additionalLoad] || [],
			load1Colour,
		);
		load2Colour = getLoadColour(
			fullCardLoads2[additionalLoad] || [],
			load2Colour,
		);
	}

	const gridStatusLower = gridStatus.toLowerCase();
	let batteryOneShutdown = batteryShutdown;
	let batteryTwoShutdown = batteryShutdown2;
	let batteryThreeShutdown = batteryShutdown3;
	let batteryFourShutdown = batteryShutdown4;
	switch (true) {
		case ['on', '1', 'on-grid'].includes(gridStatusLower):
			batteryOneShutdown = batteryShutdown;
			batteryTwoShutdown = batteryShutdown2;
			batteryThreeShutdown = batteryShutdown3;
			batteryFourShutdown = batteryShutdown4;
			break;

		case ['off', '0', 'off-grid'].includes(gridStatusLower):
			batteryOneShutdown = stateShutdownSOCOffGrid.notEmpty()
				? shutdownOffGrid
				: batteryShutdown;
			batteryTwoShutdown = stateShutdownSOCOffGrid2.notEmpty()
				? shutdownOffGrid2
				: batteryShutdown2;
			break;
	}
	/**
	 * The current structure of this data object is intentional, but it is considered temporary.
	 * There is a need to evaluate the data being passed, as there might be duplication.
	 * Future improvements should focus on optimizing the data structure and ensuring a unified naming standard.
	 */

	return {
		PV1Efficiency,
		PV2Efficiency,
		PV3Efficiency,
		PV4Efficiency,
		PV5Efficiency,
		PV6Efficiency,
		auxLineWidth,
		batLineWidth,
		battery0,
		battery20,
		battery2Charge,
		battery2Icon,
		battery30,
		battery3Charge,
		battery3Icon,
		battery40,
		battery4Charge,
		battery4Icon,
		batteryCharge,
		batteryFourShutdown,
		batteryIcon,
		batteryOneShutdown,
		batteryPercentage,
		batteryThreeShutdown,
		batteryTwoShutdown,
		customGridIcon,
		customGridIconColour,
		essIcon,
		essIconSize,
		flowBatColour,
		flowColour,
		flowInvColour,
		grid169LineWidth,
		gridLineWidth,
		gridPercentage,
		gridPercentageBat,
		load1Colour,
		load2Colour,
		loadLineWidth,
		minLineWidth,
		nonessLineWidth,
		pv1LineWidth,
		pv2LineWidth,
		pv3LineWidth,
		pv4LineWidth,
		pv5LineWidth,
		pv6LineWidth,
		pvPercentage,
		pvPercentageBat,
		solarLineWidth,
		stop2Colour,
		stop3Colour,
		stop4Colour,
		stopColour,
		totalPVEfficiency,
		viewBoxHeightLite,
		viewBoxWidthLite,
		viewBoxXLite,
		viewBoxYLite,
	};
}
