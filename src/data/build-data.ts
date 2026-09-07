import { resolveEntities } from './entities';
import { resolveDefaults } from './defaults';
import { calcEnergyBalance } from './energy';
import { resolveFlow } from './flow';
import { resolveInverterProg } from './timer';
import {
	calcBatteryCapacity,
	formatBatteryRuntime,
	isBatteryFloating,
	pickBatteryColour,
} from './battery-calc';
import type { CustomEntity } from '../inverters/dto/custom-entity';
import { resolveStatuses } from './status';
import { DataDto, InverterModel } from '../types';
import { valid3phase } from '../const';
import { Utils } from '../helpers/utils';
import { InverterFactory } from '../inverters/inverter-factory';
import type { SunsynkPowerFlowCard } from '../index';

/**
 * Data preparation for all card variants: resolves entities, computes derived
 * values, and returns the DataDto consumed by the per-style renderers in
 * src/cards/*.ts. Extracted from index.ts render() (was ~2900 lines).
 */
export function buildData(card: SunsynkPowerFlowCard): {
	data: DataDto;
	inverterImg: string;
} {
	const config = card._config;

	const _e = resolveEntities(card);
	const {
		stateDayBatteryDischarge,
		stateDayBatteryCharge,
		stateDayBattery2Discharge,
		stateDayBattery2Charge,
		_stateDayBattery3Discharge,
		_stateDayBattery3Charge,
		_stateDayBattery4Discharge,
		_stateDayBattery4Charge,
		stateDayLoadEnergy,
		stateDayGridImport,
		stateDayPVEnergy,
		stateDayGridExport,
		stateDayAuxEnergy,
		stateInverterStatus,
		stateUseTimer,
		stateDCTransformerTemp,
		stateRadiatorTemp,
		stateEnvironmentTemp,
		stateBatterySoc,
		stateBatteryCurrent,
		stateBatteryTemp,
		stateBatteryStatus,
		stateBatteryRatedCapacity,
		stateShutdownSOC,
		stateShutdownSOCOffGrid,
		stateBatterySOH,
		stateSOCEndOfCharge,
		stateBattery2Soc,
		stateBattery2Current,
		stateBattery2Temp,
		stateBattery2Status,
		stateBattery2RatedCapacity,
		stateShutdownSOC2,
		stateShutdownSOCOffGrid2,
		stateBattery2SOH,
		stateSOCEndOfCharge2,
		stateBattery3Soc,
		stateBattery3Current,
		stateBattery3Temp,
		stateBattery3Status,
		_stateBattery3CurrentDirection,
		stateBattery3RatedCapacity,
		stateShutdownSOC3,
		stateShutdownSOCOffGrid3,
		stateBattery3SOH,
		stateSOCEndOfCharge3,
		stateBattery4Soc,
		stateBattery4Current,
		stateBattery4Temp,
		stateBattery4Status,
		_stateBattery4CurrentDirection,
		stateBattery4RatedCapacity,
		stateShutdownSOC4,
		stateShutdownSOCOffGrid4,
		stateBattery4SOH,
		stateSOCEndOfCharge4,
		stateEssentialPower,
		stateNonessentialPower,
		stateNonessentialLoad1,
		stateNonessentialLoad2,
		stateNonessentialLoad3,
		stateNonEssentialLoad1Extra,
		stateNonEssentialLoad2Extra,
		stateNonEssentialLoad3Extra,
		stateEssentialLoad1,
		stateEssentialLoad2,
		stateEssentialLoad3,
		stateEssentialLoad4,
		stateEssentialLoad5,
		stateEssentialLoad6,
		stateAuxLoad1,
		stateAuxLoad2,
		stateEssentialLoad1Extra,
		stateEssentialLoad2Extra,
		stateEssentialLoad3Extra,
		stateEssentialLoad4Extra,
		stateEssentialLoad5Extra,
		stateEssentialLoad6Extra,
		stateAuxLoad1Extra,
		stateAuxLoad2Extra,
		stateEnergyCostBuy,
		stateEnergyCostSell,
		statePrepaidUnits,
		stateMaxSellPower,
		statePV1Voltage,
		statePV1Current,
		statePV2Voltage,
		statePV2Current,
		statePV3Voltage,
		statePV3Current,
		statePV4Voltage,
		statePV4Current,
		statePV5Voltage,
		statePV5Current,
		statePV6Voltage,
		statePV6Current,
		statePV1Power,
		statePV2Power,
		statePV3Power,
		statePV4Power,
		statePV5Power,
		statePV6Power,
		stateSolarSell,
		statePVTotal,
	} = _e;

	const _defaults = resolveDefaults(card, config, _e);
	const {
		auxPower,
		gridPower,
		gridPowerL2,
		gridPowerL3,
		totalGridPower,
		gridVoltage,
		batteryCurrentDirection,
		battery2CurrentDirection,
		battery3CurrentDirection,
		battery4CurrentDirection,
		genericInverterImage,
		decimalPlaces,
		decimalPlacesEnergy,
		loadColour,
		auxDynamicColour,
		auxOffColour,
		auxDynamicColourLoad1,
		auxDynamicColourLoad2,
		dynamicColourEssentialLoad1,
		dynamicColourEssentialLoad2,
		dynamicColourEssentialLoad3,
		dynamicColourEssentialLoad4,
		dynamicColourEssentialLoad5,
		dynamicColourEssentialLoad6,
		loadShowDaily,
		showNonessential,
		auxStatus,
		loadFrequency,
		inverterVoltage,
		inverterVoltageL2,
		inverterVoltageL3,
		inverterCurrent,
		inverterCurrentL2,
		inverterCurrentL3,
		batteryVoltage,
		battery2Voltage,
		battery3Voltage,
		battery4Voltage,
		autoScaledInverterPower,
		autoScaledGridPower,
		invertLoad,
		loadPowerL1,
		loadPowerL2,
		loadPowerL3,
		dynamicColourNonEssentialLoad1,
		dynamicColourNonEssentialLoad2,
		dynamicColourNonEssentialLoad3,
		gridOffColour,
		gridColour,
		nonessentialLoads,
		gridShowDailyBuy,
		gridShowDailySell,
		batteryColourConfig,
		batteryChargeColour,
		battery2ColourConfig,
		battery3ColourConfig,
		battery4ColourConfig,
		battery2ChargeColour,
		battery3ChargeColour,
		battery4ChargeColour,
		batteryShowDaily,
		solarShowDaily,
		showAux,
		showDailyAux,
		additionalLoad,
		additionalAuxLoad,
		auxType,
		iconEssentialLoad1,
		iconEssentialLoad2,
		iconEssentialLoad3,
		iconEssentialLoad4,
		iconEssentialLoad5,
		iconEssentialLoad6,
		iconAuxLoad1,
		iconAuxLoad2,
		nonessentialIcon,
		iconNonessentialLoad1,
		iconNonessentialLoad2,
		iconNonessentialLoad3,
		iconGridImport,
		iconGridDisconnected,
		iconGridExport,
		remainingSolar,
		totalSolarGeneration,
		largeFont,
		inverterColour,
		enableAutarky,
		enableTimer,
		priorityLoad,
		cardHeight,
		cardWidth,
		energyCost,
	} = _defaults;
	let {
		gridStatus,
		batteryPower,
		battery2Power,
		battery3Power,
		battery4Power,
	} = _defaults;
	let inverterModel: InverterModel = _defaults.inverterModel as InverterModel;

	// Check if the userInputModel is a valid inverter model
	if (Object.values(InverterModel).includes(config.inverter.model)) {
		inverterModel = config.inverter.model as InverterModel;
	}

	let inverterImg = '';
	const inverterSettings = InverterFactory.getInstance(inverterModel);
	if (!genericInverterImage) {
		inverterImg = inverterSettings.image;
	}

	let compactMode = false;
	if (card.isCompactCard) {
		compactMode = true;
	}
	//totalsolar = pv1_power_186 + pv2_power_187 + pv3_power_188 + pv4_power_189

	const pv1PowerWatts = statePV1Power.toPower();
	const pv2PowerWatts = statePV2Power.toPower();
	const pv3PowerWatts = statePV3Power.toPower();
	const pv4PowerWatts = statePV4Power.toPower();
	const pv5PowerWatts = statePV5Power.toPower();
	const pv6PowerWatts = statePV6Power.toPower();

	const totalsolar =
		pv1PowerWatts +
		pv2PowerWatts +
		pv3PowerWatts +
		pv4PowerWatts +
		pv5PowerWatts +
		pv6PowerWatts;
	const totalPV = config.entities?.pv_total ? statePVTotal.toNum() : totalsolar;

	const solarColour = !config.solar.dynamic_colour
		? card.colourConvert(config.solar?.colour)
		: Utils.toNum(totalPV, 0) > Utils.toNum(config.solar?.off_threshold, 0)
			? card.colourConvert(config.solar?.colour)
			: 'grey';

	//essentialPower = inverter_power_175 + grid_power_169 - aux_power_166
	//nonessentialPower = grid_ct_power_172 - grid_power_169

	let threePhase = config.inverter?.three_phase;
	if (!valid3phase.includes(threePhase)) {
		threePhase = false;
	}

	let nonessentialPower: number;
	const { essential_power, nonessential_power } = config.entities;

	if (threePhase === false) {
		nonessentialPower =
			nonessential_power === 'none' || !nonessential_power
				? gridPower - autoScaledGridPower
				: stateNonessentialPower.toPower();
	} else {
		nonessentialPower =
			nonessential_power === 'none' || !nonessential_power
				? gridPower + gridPowerL2 + gridPowerL3 - autoScaledGridPower
				: stateNonessentialPower.toPower();
	}

	const essentialPower =
		essential_power === 'none' || !essential_power
			? threePhase === true &&
				config.entities.load_power_L1 &&
				config.entities.load_power_L2
				? Number(loadPowerL1) + Number(loadPowerL2) + Number(loadPowerL3)
				: autoScaledInverterPower + autoScaledGridPower - auxPower
			: stateEssentialPower.toPower(invertLoad);

	let batteryCount = config.battery?.count;
	if (
		!config.wide ||
		(batteryCount !== 1 &&
			batteryCount !== 2 &&
			batteryCount !== 3 &&
			batteryCount !== 4)
	) {
		batteryCount = 1;
	}

	const shutdownOffGrid = stateShutdownSOCOffGrid.toNum();
	const batteryShutdown = stateShutdownSOC.toNum();
	const shutdownOffGrid2 = stateShutdownSOCOffGrid2.toNum() || shutdownOffGrid;
	const shutdownOffGrid3 = stateShutdownSOCOffGrid3.toNum() || shutdownOffGrid;
	const shutdownOffGrid4 = stateShutdownSOCOffGrid4.toNum() || shutdownOffGrid;
	const batteryShutdown2 = stateShutdownSOC2.toNum() || batteryShutdown;
	const batteryShutdown3 = stateShutdownSOC3.toNum() || batteryShutdown;
	const batteryShutdown4 = stateShutdownSOC4.toNum() || batteryShutdown;

	const inverterProg = resolveInverterProg(
		card,
		config,
		stateUseTimer,
		enableTimer,
		batteryShutdown,
	);

	if (
		gridVoltage != null &&
		!Number.isNaN(gridVoltage) &&
		inverterModel == InverterModel.Solis
	) {
		// the grid voltage can sometimes read decimals like 0.1, in cases where there is power trickled back.
		gridStatus = gridVoltage > 50 ? 'on' : 'off';
	}

	// Apply explicit current-direction entity if available. +1 means discharging
	// (which the card represents as positive power), -1 means charging.
	if (batteryCurrentDirection !== null && batteryPower !== 0) {
		batteryPower = Math.abs(batteryPower) * batteryCurrentDirection;
	}
	if (battery2CurrentDirection !== null && battery2Power !== 0) {
		battery2Power = Math.abs(battery2Power) * battery2CurrentDirection;
	}
	if (battery3CurrentDirection !== null && battery3Power !== 0) {
		battery3Power = Math.abs(battery3Power) * battery3CurrentDirection;
	}
	if (battery4CurrentDirection !== null && battery4Power !== 0) {
		battery4Power = Math.abs(battery4Power) * battery4CurrentDirection;
	}

	let maximumSOC = stateSOCEndOfCharge.toNum();
	maximumSOC = Math.max(50, Math.min(maximumSOC, 100));

	let maximumSOC2 = stateSOCEndOfCharge2.toNum() || maximumSOC;
	const maximumSOC3 = stateSOCEndOfCharge3.toNum() || maximumSOC;
	const maximumSOC4 = stateSOCEndOfCharge4.toNum() || maximumSOC;
	maximumSOC2 = Math.max(50, Math.min(maximumSOC2, 100));

	const batteryPowerTotal =
		batteryCount === 2 ? batteryPower + battery2Power : batteryPower;

	const capCommon = {
		show: !!config.show_battery,
		gridStatus,
		inverterProg,
		inverterSettings,
	};
	const batteryCapacity = calcBatteryCapacity({
		...capCommon,
		power: batteryPower,
		invertFlow: config.battery.invert_flow === true,
		shutdown: batteryShutdown,
		offGridState: stateShutdownSOCOffGrid,
		offGridShutdown: shutdownOffGrid,
		maxSoc: maximumSOC,
		soc: stateBatterySoc,
	});
	const battery2Capacity = calcBatteryCapacity({
		...capCommon,
		power: battery2Power,
		invertFlow: config.battery2.invert_flow === true,
		shutdown: batteryShutdown2,
		offGridState: stateShutdownSOCOffGrid2,
		offGridShutdown: shutdownOffGrid2,
		maxSoc: maximumSOC2,
		soc: stateBattery2Soc,
	});
	const battery3Capacity = calcBatteryCapacity({
		...capCommon,
		power: battery3Power,
		invertFlow: config.battery3.invert_flow === true,
		shutdown: batteryShutdown3,
		offGridState: stateShutdownSOCOffGrid3,
		offGridShutdown: shutdownOffGrid3,
		maxSoc: maximumSOC3,
		soc: stateBattery3Soc,
	});
	const battery4Capacity = calcBatteryCapacity({
		...capCommon,
		power: battery4Power,
		invertFlow: config.battery4.invert_flow === true,
		shutdown: batteryShutdown4,
		offGridState: stateShutdownSOCOffGrid4,
		offGridShutdown: shutdownOffGrid4,
		maxSoc: maximumSOC4,
		soc: stateBattery4Soc,
	});

	//calculate remaining battery time to charge or discharge
	const battEnergyOf = (key: string, energy: unknown) =>
		card.getEntity(key, { state: energy?.toString() ?? '' }).toPower(false);
	let batteryEnergy = battEnergyOf('battery.energy', config.battery.energy);
	let battery2Energy = battEnergyOf('battery2.energy', config.battery2.energy);
	let battery3Energy = battEnergyOf('battery3.energy', config.battery3.energy);
	let battery4Energy = battEnergyOf('battery4.energy', config.battery4.energy);
	const rated = (voltage: number, cap: CustomEntity) =>
		voltage && cap.notEmpty() ? Utils.toNum(voltage * cap.toNum(0), 0) : 0;
	batteryEnergy =
		rated(batteryVoltage, stateBatteryRatedCapacity) || batteryEnergy;
	battery2Energy =
		rated(battery2Voltage, stateBattery2RatedCapacity) || battery2Energy;
	battery3Energy =
		rated(battery3Voltage, stateBattery3RatedCapacity) || battery3Energy;
	battery4Energy =
		rated(battery4Voltage, stateBattery4RatedCapacity) || battery4Energy;

	const batteryTotalEnergy = batteryEnergy + battery2Energy;

	let formattedResultTime = '';
	let formattedResultTime2 = '';
	let formattedResultTime3 = '';
	let formattedResultTime4 = '';
	let batteryDuration = '';
	let batteryDuration2 = '';
	let batteryDuration3 = '';
	let batteryDuration4 = '';

	if (config.show_battery || batteryEnergy !== 0 || battery2Energy !== 0) {
		const runtimes = [
			[
				stateBatterySoc,
				batteryShutdown,
				batteryCapacity,
				batteryEnergy,
				batteryPower,
				config.battery.invert_flow,
			],
			[
				stateBattery2Soc,
				batteryShutdown2,
				battery2Capacity,
				battery2Energy,
				battery2Power,
				config.battery2.invert_flow,
			],
			[
				stateBattery3Soc,
				batteryShutdown3,
				battery3Capacity,
				battery3Energy,
				battery3Power,
				config.battery3.invert_flow,
			],
			[
				stateBattery4Soc,
				batteryShutdown4,
				battery4Capacity,
				battery4Energy,
				battery4Power,
				config.battery4.invert_flow,
			],
		] as const;
		const results = runtimes.map(([soc, shutdown, cap, energy, power, inv]) =>
			energy !== 0
				? formatBatteryRuntime(soc, shutdown, cap, energy, power, inv)
				: { formattedTime: '', duration: '' },
		);
		[
			[results[0].formattedTime, results[0].duration],
			[results[1].formattedTime, results[1].duration],
			[results[2].formattedTime, results[2].duration],
			[results[3].formattedTime, results[3].duration],
		].forEach(([t, d], i) => {
			if (i === 0) {
				formattedResultTime = t;
				batteryDuration = d;
			}
			if (i === 1) {
				formattedResultTime2 = t;
				batteryDuration2 = d;
			}
			if (i === 2) {
				formattedResultTime3 = t;
				batteryDuration3 = d;
			}
			if (i === 3) {
				formattedResultTime4 = t;
				batteryDuration4 = d;
			}
		});
	}

	const isFloating = isBatteryFloating(
		stateBatteryCurrent.toNum(0),
		stateBatterySoc.toNum(0),
	);
	const isFloating2 = isBatteryFloating(
		stateBattery2Current.toNum(0),
		stateBattery2Soc.toNum(0),
	);
	const isFloating3 = isBatteryFloating(
		stateBattery3Current.toNum(0),
		stateBattery3Soc.toNum(0),
	);
	const isFloating4 = isBatteryFloating(
		stateBattery4Current.toNum(0),
		stateBattery4Soc.toNum(0),
	);
	const isFloatingCombined =
		batteryCount === 2 ? isFloating && isFloating2 : isFloating;

	// Determine battery colours
	const batteryColour = pickBatteryColour(
		config.battery.invert_flow,
		batteryPower,
		isFloating,
		batteryChargeColour,
		batteryColourConfig,
	);
	const battery2Colour = pickBatteryColour(
		config.battery2.invert_flow,
		battery2Power,
		isFloating2,
		battery2ChargeColour,
		battery2ColourConfig,
	);
	const battery3Colour = pickBatteryColour(
		config.battery3.invert_flow,
		battery3Power,
		isFloating3,
		battery3ChargeColour,
		battery3ColourConfig,
	);
	const battery4Colour = pickBatteryColour(
		config.battery4.invert_flow,
		battery4Power,
		isFloating4,
		battery4ChargeColour,
		battery4ColourConfig,
	);

	const {
		inverterStateColour,
		inverterStateMsg,
		batteryStateColour,
		batteryStateMsg,
		battery2StateColour,
		battery2StateMsg,
		battery3StateColour,
		battery3StateMsg,
		battery4StateColour,
		battery4StateMsg,
	} = resolveStatuses(
		config,
		inverterModel,
		stateInverterStatus,
		inverterSettings,
		[
			stateBatteryStatus,
			stateBattery2Status,
			stateBattery3Status,
			stateBattery4Status,
		],
	);

	const totalDayBatteryDischarge =
		stateDayBatteryDischarge.toNum() + stateDayBattery2Discharge.toNum();
	const totalDayBatteryCharge =
		stateDayBatteryCharge.toNum() + stateDayBattery2Charge.toNum();

	const { autarkyEnergy, ratioEnergy, autarkyPower, ratioPower } =
		calcEnergyBalance({
			config,
			stateDayPVEnergy,
			totalDayBatteryDischarge,
			stateDayLoadEnergy,
			totalDayBatteryCharge,
			totalPV,
			batteryPowerTotal,
			auxPower,
			essentialPower,
			nonessentialPower,
		});

	const _flow = resolveFlow(card, {
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
		config,
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
		priorityLoad: priorityLoad as string,
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
	});
	const {
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
	} = _flow;

	const data: DataDto = {
		timestamp_id: new Date().getTime(),
		config,
		compactMode,
		viewBoxYLite,
		viewBoxHeightLite,
		viewBoxXLite,
		viewBoxWidthLite,
		cardHeight,
		cardWidth,
		loadColour,
		load1Colour,
		load2Colour,
		batteryColour,
		battery2Colour,
		battery3Colour,
		battery4Colour,
		gridColour,
		isFloating,
		isFloating2,
		isFloating3,
		isFloating4,
		isFloatingCombined,
		inverterColour,
		solarColour,
		auxOffColour,
		batteryEnergy,
		battery2Energy,
		battery3Energy,
		battery4Energy,
		batteryTotalEnergy,
		largeFont,
		batteryPower,
		battery2Power,
		battery3Power,
		battery4Power,
		batteryPowerTotal,
		batteryDuration,
		batteryDuration2,
		batteryDuration3,
		batteryDuration4,
		batteryCapacity,
		battery2Capacity,
		battery3Capacity,
		battery4Capacity,
		additionalLoad,
		essIconSize,
		essIcon,
		stateUseTimer,
		batteryStateMsg,
		battery2StateMsg,
		battery3StateMsg,
		battery4StateMsg,
		stateBatterySoc,
		stateBattery2Soc,
		stateBattery3Soc,
		stateBattery4Soc,
		inverterProg,
		solarShowDaily,
		batteryPercentage,
		pvPercentage,
		loadShowDaily,
		stateEnergyCostSell,
		stateEnergyCostBuy,
		loadPowerL1,
		loadPowerL2,
		loadPowerL3,
		durationCur: card.durationCur,
		stateEssentialLoad1,
		stateEssentialLoad2,
		stateEssentialLoad3,
		stateEssentialLoad4,
		stateEssentialLoad5,
		stateEssentialLoad6,
		gridPower,
		gridPowerL2,
		gridPowerL3,
		decimalPlaces,
		decimalPlacesEnergy,
		stateEssentialLoad1Extra,
		stateEssentialLoad2Extra,
		stateEssentialLoad3Extra,
		stateEssentialLoad4Extra,
		stateEssentialLoad5Extra,
		stateEssentialLoad6Extra,
		stateNonEssentialLoad1Extra,
		stateNonEssentialLoad2Extra,
		stateNonEssentialLoad3Extra,
		loadFrequency,
		gridShowDailyBuy,
		gridShowDailySell,
		batteryShowDaily,
		inverterModel,
		batteryShutdown,
		batteryShutdown2,
		batteryShutdown3,
		batteryShutdown4,
		enableAutarky,
		autarkyPower,
		ratioPower,
		ratioEnergy,
		autarkyEnergy,
		shutdownOffGrid2,
		shutdownOffGrid3,
		shutdownOffGrid4,
		shutdownOffGrid,
		batteryOneShutdown,
		batteryTwoShutdown,
		batteryThreeShutdown,
		batteryFourShutdown,
		statePV1Current,
		statePV2Current,
		statePV3Current,
		statePV4Current,
		statePV5Current,
		statePV6Current,
		energyCost,
		inverterCurrent,
		inverterCurrentL2,
		inverterCurrentL3,
		stateRadiatorTemp,
		inverterVoltage,
		inverterVoltageL2,
		inverterVoltageL3,
		batteryVoltage,
		battery2Voltage,
		battery3Voltage,
		battery4Voltage,
		stateBatteryCurrent,
		stateBattery2Current,
		stateBattery3Current,
		stateBattery4Current,
		batLineWidth,
		totalGridPower,
		solarLineWidth,
		totalPV,
		loadLineWidth,
		pvPercentageBat,
		gridPercentageBat,
		genericInverterImage,
		battery0,
		battery20,
		battery30,
		battery40,
		essentialPower,
		pv1LineWidth,
		pv2LineWidth,
		pv3LineWidth,
		pv4LineWidth,
		pv5LineWidth,
		pv6LineWidth,
		gridLineWidth,
		pv1PowerWatts,
		pv2PowerWatts,
		pv3PowerWatts,
		pv4PowerWatts,
		pv5PowerWatts,
		pv6PowerWatts,
		stateEnvironmentTemp,
		statePV1Voltage,
		statePV2Voltage,
		statePV3Voltage,
		statePV4Voltage,
		statePV5Voltage,
		statePV6Voltage,
		batteryStateColour,
		battery2StateColour,
		battery3StateColour,
		battery4StateColour,
		inverterStateColour,
		stateBatteryTemp,
		stateBattery2Temp,
		stateBattery3Temp,
		stateBattery4Temp,
		statePrepaidUnits,
		stateDCTransformerTemp,
		iconEssentialLoad1,
		iconEssentialLoad2,
		iconEssentialLoad3,
		iconEssentialLoad4,
		iconEssentialLoad5,
		iconEssentialLoad6,
		enableTimer,
		stateSolarSell,
		priorityLoad,
		inverterImg,
		stateDayPVEnergy,
		remainingSolar,
		totalSolarGeneration,
		stateDayLoadEnergy,
		stateDayBatteryDischarge,
		stateDayGridImport,
		stateDayBatteryCharge,
		stateDayGridExport,
		statePVTotal,
		statePV1Power,
		statePV2Power,
		statePV3Power,
		statePV4Power,
		statePV5Power,
		statePV6Power,
		minLineWidth,
		stopColour,
		stop2Colour,
		stop3Colour,
		stop4Colour,
		gridStatus,
		batteryCharge,
		battery2Charge,
		battery3Charge,
		battery4Charge,
		gridOffColour,
		batteryIcon,
		battery2Icon,
		battery3Icon,
		battery4Icon,
		formattedResultTime,
		formattedResultTime2,
		formattedResultTime3,
		formattedResultTime4,
		showAux,
		nonessentialIcon,
		showNonessential,
		auxStatus,
		nonessentialLoads,
		additionalAuxLoad,
		stateAuxLoad1Extra,
		stateAuxLoad2Extra,
		iconNonessentialLoad1,
		iconNonessentialLoad2,
		iconNonessentialLoad3,
		inverterStateMsg,
		auxType,
		showDailyAux,
		nonessentialPower,
		auxPower,
		nonessLineWidth,
		grid169LineWidth,
		auxLineWidth,
		iconAuxLoad1,
		iconAuxLoad2,
		stateDayAuxEnergy,
		stateAuxLoad1,
		stateAuxLoad2,
		stateNonessentialLoad1,
		stateNonessentialLoad2,
		stateNonessentialLoad3,
		autoScaledInverterPower,
		autoScaledGridPower,
		auxDynamicColour,
		auxDynamicColourLoad1,
		auxDynamicColourLoad2,
		stateMaxSellPower,
		totalPVEfficiency,
		PV1Efficiency,
		PV2Efficiency,
		PV3Efficiency,
		PV4Efficiency,
		PV5Efficiency,
		PV6Efficiency,
		gridPercentage,
		flowColour,
		flowBatColour,
		flowInvColour,
		dynamicColourEssentialLoad1,
		dynamicColourEssentialLoad2,
		dynamicColourEssentialLoad3,
		dynamicColourEssentialLoad4,
		dynamicColourEssentialLoad5,
		dynamicColourEssentialLoad6,
		dynamicColourNonEssentialLoad1,
		dynamicColourNonEssentialLoad2,
		dynamicColourNonEssentialLoad3,
		stateBatterySOH,
		stateBattery2SOH,
		stateBattery3SOH,
		stateBattery4SOH,
		customGridIcon,
		customGridIconColour,
		maximumSOC,
		batteryCount,
	};
	return { data, inverterImg };
}
