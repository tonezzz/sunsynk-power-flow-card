/* eslint-disable no-useless-assignment -- block moved verbatim from index.ts render(); the flagged stores are pre-existing dead writes, not new logic */
import { resolveEntities } from './entities';
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
import {
	valid3phase,
	validaux,
	validauxLoads,
	validGridConnected,
	validGridDisconnected,
	validLoadValues,
	validnonLoadValues,
} from '../const';
import { Utils } from '../helpers/utils';
import { BatteryIconManager } from '../helpers/battery-icon-manager';
import { icons } from '../helpers/icons';
import { InverterFactory } from '../inverters/inverter-factory';
import type { SunsynkPowerFlowCard } from '../index';
import { getBatteryDirection } from './helpers';

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
		stateInverterVoltage,
		stateLoadFrequency,
		stateInverterCurrent,
		stateInverterStatus,
		stateInverterPower,
		statePriorityLoad,
		stateUseTimer,
		stateDCTransformerTemp,
		stateRadiatorTemp,
		stateInverterVoltageL2,
		stateInverterVoltageL3,
		stateInverterCurrentL2,
		stateInverterCurrentL3,
		stateEnvironmentTemp,
		stateBatteryVoltage,
		stateBatterySoc,
		stateBatteryPower,
		stateBatteryCurrent,
		stateBatteryTemp,
		stateBatteryStatus,
		stateBatteryCurrentDirection,
		stateBatteryRatedCapacity,
		stateShutdownSOC,
		stateShutdownSOCOffGrid,
		stateBatterySOH,
		stateSOCEndOfCharge,
		stateBattery2Voltage,
		stateBattery2Soc,
		stateBattery2Power,
		stateBattery2Current,
		stateBattery2Temp,
		stateBattery2Status,
		stateBattery2CurrentDirection,
		stateBattery2RatedCapacity,
		stateShutdownSOC2,
		stateShutdownSOCOffGrid2,
		stateBattery2SOH,
		stateSOCEndOfCharge2,
		stateBattery3Voltage,
		stateBattery3Soc,
		stateBattery3Power,
		stateBattery3Current,
		stateBattery3Temp,
		stateBattery3Status,
		_stateBattery3CurrentDirection,
		stateBattery3RatedCapacity,
		stateShutdownSOC3,
		stateShutdownSOCOffGrid3,
		stateBattery3SOH,
		stateSOCEndOfCharge3,
		stateBattery4Voltage,
		stateBattery4Soc,
		stateBattery4Power,
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
		stateAuxPower,
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
		stateAuxConnectedStatus,
		stateAuxLoad1,
		stateAuxLoad2,
		stateEssentialLoad1Extra,
		stateEssentialLoad2Extra,
		stateEssentialLoad3Extra,
		stateEssentialLoad4Extra,
		stateEssentialLoad5Extra,
		stateEssentialLoad6Extra,
		stateLoadPowerL1,
		stateLoadPowerL2,
		stateLoadPowerL3,
		stateAuxLoad1Extra,
		stateAuxLoad2Extra,
		stateGridCTPower,
		stateGridCTPowerL2,
		stateGridCTPowerL3,
		stateGridCTPowerTotal,
		stateGridConnectedStatus,
		stateGridPower,
		stateEnergyCostBuy,
		stateEnergyCostSell,
		stateGridVoltage,
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
		stateRemainingSolar,
		stateSolarSell,
		statePVTotal,
		stateTotalPVGeneration,
	} = resolveEntities(card);

	//Set defaults
	const invert_aux = config.load?.invert_aux ?? false;
	const auxPower = stateAuxPower.toPower(invert_aux);

	const invert_grid = config.grid?.invert_grid ?? false;
	const gridPower = stateGridCTPower.toPower(invert_grid);
	const gridPowerL2 = stateGridCTPowerL2.toPower(invert_grid);
	const gridPowerL3 = stateGridCTPowerL3.toPower(invert_grid);
	const gridPowerTotal = config.entities?.grid_ct_power_total
		? stateGridCTPowerTotal.toPower(invert_grid)
		: gridPower + gridPowerL2 + gridPowerL3;

	const totalGridPower = config.inverter.three_phase
		? gridPowerTotal
		: gridPower;

	const gridVoltage = !stateGridVoltage.isNaN()
		? stateGridVoltage.toNum(0)
		: null;
	const batteryCurrentDirection = getBatteryDirection(
		stateBatteryCurrentDirection,
	);
	const battery2CurrentDirection = getBatteryDirection(
		stateBattery2CurrentDirection,
	);
	const battery3CurrentDirection = getBatteryDirection(
		_stateBattery3CurrentDirection,
	);
	const battery4CurrentDirection = getBatteryDirection(
		_stateBattery4CurrentDirection,
	);
	const genericInverterImage = config.inverter?.modern;

	const decimalPlaces = config.decimal_places;
	const decimalPlacesEnergy = config.decimal_places_energy;

	const loadColour = card.colourConvert(config.load?.colour);
	const auxDynamicColour =
		card.calculateAuxLoadColour(
			stateAuxPower.toPower(false),
			Utils.toNum(config.load?.off_threshold, 0),
		) || loadColour;
	const auxOffColour = card.colourConvert(
		config.load?.aux_off_colour || auxDynamicColour,
	);
	const auxDynamicColourLoad1 =
		card.calculateAuxLoadColour(
			stateAuxLoad1.toPower(false),
			Utils.toNum(config.load?.off_threshold, 0),
		) || loadColour;
	const auxDynamicColourLoad2 =
		card.calculateAuxLoadColour(
			stateAuxLoad2.toPower(false),
			Utils.toNum(config.load?.off_threshold, 0),
		) || loadColour;
	const threshold = Utils.toNum(config.load?.off_threshold, 0);
	const Load1MaxThreshold =
		Utils.toNum(config.load?.load1_max_threshold, 0) || Infinity;
	const Load2MaxThreshold =
		Utils.toNum(config.load?.load2_max_threshold, 0) || Infinity;
	const Load3MaxThreshold =
		Utils.toNum(config.load?.load3_max_threshold, 0) || Infinity;
	const Load4MaxThreshold =
		Utils.toNum(config.load?.load4_max_threshold, 0) || Infinity;
	const Load5MaxThreshold =
		Utils.toNum(config.load?.load5_max_threshold, 0) || Infinity;
	const Load6MaxThreshold =
		Utils.toNum(config.load?.load6_max_threshold, 0) || Infinity;
	const dynamicColourEssentialLoad1 =
		card.calculateEssentialLoadColour(
			stateEssentialLoad1.toPower(false),
			threshold,
			Load1MaxThreshold,
		) || loadColour;
	const dynamicColourEssentialLoad2 =
		card.calculateEssentialLoadColour(
			stateEssentialLoad2.toPower(false),
			threshold,
			Load2MaxThreshold,
		) || loadColour;
	const dynamicColourEssentialLoad3 =
		card.calculateEssentialLoadColour(
			stateEssentialLoad3.toPower(false),
			threshold,
			Load3MaxThreshold,
		) || loadColour;
	const dynamicColourEssentialLoad4 =
		card.calculateEssentialLoadColour(
			stateEssentialLoad4.toPower(false),
			threshold,
			Load4MaxThreshold,
		) || loadColour;
	const dynamicColourEssentialLoad5 =
		card.calculateEssentialLoadColour(
			stateEssentialLoad5.toPower(false),
			threshold,
			Load5MaxThreshold,
		) || loadColour;
	const dynamicColourEssentialLoad6 =
		card.calculateEssentialLoadColour(
			stateEssentialLoad6.toPower(false),
			threshold,
			Load6MaxThreshold,
		) || loadColour;

	config.title_colour = card.colourConvert(config.title_colour);

	const loadShowDaily = config.load?.show_daily;
	const showNonessential = config.grid?.show_nonessential;
	let gridStatus = config.entities?.grid_connected_status_194
		? stateGridConnectedStatus.state
		: 'on';
	if (
		!validGridConnected.includes(gridStatus.toLowerCase()) &&
		!validGridDisconnected.includes(gridStatus.toLowerCase())
	) {
		gridStatus = 'on';
	}

	const auxStatus = config.entities?.aux_connected_status
		? stateAuxConnectedStatus.state
		: 'on';
	const loadFrequency = config.entities?.load_frequency_192
		? stateLoadFrequency.toNum(2)
		: 0;
	const inverterVoltage = config.entities?.inverter_voltage_154
		? config.inverter.three_phase && (card.isLiteCard || card.isCompactCard)
			? stateInverterVoltage.toNum(0)
			: stateInverterVoltage.toNum(1)
		: 0;
	const inverterVoltageL2 = config.entities?.inverter_voltage_L2
		? config.inverter.three_phase && (card.isLiteCard || card.isCompactCard)
			? stateInverterVoltageL2.toNum(0)
			: stateInverterVoltageL2.toNum(1)
		: '';
	const inverterVoltageL3 = config.entities?.inverter_voltage_L3
		? config.inverter.three_phase && (card.isLiteCard || card.isCompactCard)
			? stateInverterVoltageL3.toNum(0)
			: stateInverterVoltageL3.toNum(1)
		: '';
	const inverterCurrent = config.entities?.inverter_current_164
		? stateInverterCurrent.toNum(1)
		: 0;
	const inverterCurrentL2 = config.entities?.inverter_current_L2
		? stateInverterCurrentL2.toNum(1)
		: '';
	const inverterCurrentL3 = config.entities?.inverter_current_L3
		? stateInverterCurrentL3.toNum(1)
		: '';
	const batteryVoltage = config.entities?.battery_voltage_183
		? stateBatteryVoltage.toNum(1)
		: 0;
	const battery2Voltage = config.entities?.battery2_voltage_183
		? stateBattery2Voltage.toNum(1)
		: 0;
	const battery3Voltage = config.entities?.battery3_voltage_183
		? stateBattery3Voltage.toNum(1)
		: 0;
	const battery4Voltage = config.entities?.battery4_voltage_183
		? stateBattery4Voltage.toNum(1)
		: 0;

	const autoScaledInverterPower = config.entities?.inverter_power_175
		? stateInverterPower.toPower()
		: 0;
	const autoScaledGridPower = config.entities?.grid_power_169
		? stateGridPower.toPower()
		: 0;

	const invertLoad = card._computed.load.invertLoad;
	const loadPowerL1 = config.entities?.load_power_L1
		? stateLoadPowerL1.toPower(invertLoad)
		: '';
	const loadPowerL2 = config.entities?.load_power_L2
		? stateLoadPowerL2.toPower(invertLoad)
		: '';
	const loadPowerL3 = config.entities?.load_power_L3
		? stateLoadPowerL3.toPower(invertLoad)
		: '';

	const {
		importColour: gridImportColour,
		exportColour: gridExportColour,
		noGridColour,
		offThreshold: gridOffThreshold,
	} = card._computed.grid;

	let gridColour: string;
	switch (true) {
		case totalGridPower < -gridOffThreshold:
			gridColour = gridExportColour;
			break;
		case totalGridPower >= -gridOffThreshold &&
			totalGridPower <= gridOffThreshold:
			gridColour = noGridColour;
			break;
		default: // Import
			gridColour = gridImportColour;
			break;
	}

	const nonEss1On =
		Math.abs(stateNonessentialLoad1.toPower(false)) >
		card._computed.grid.offThreshold;
	const nonEss2On =
		Math.abs(stateNonessentialLoad2.toPower(false)) >
		card._computed.grid.offThreshold;
	const nonEss3On =
		Math.abs(stateNonessentialLoad3.toPower(false)) >
		card._computed.grid.offThreshold;
	const dynamicColourNonEssentialLoad1 = nonEss1On ? gridColour : 'grey';
	const dynamicColourNonEssentialLoad2 = nonEss2On ? gridColour : 'grey';
	const dynamicColourNonEssentialLoad3 = nonEss3On ? gridColour : 'grey';

	const gridOffColour = card.colourConvert(
		config.grid?.grid_off_colour || gridColour,
	);

	let nonessentialLoads = config.grid?.additional_loads;
	if (!validnonLoadValues.includes(nonessentialLoads)) {
		nonessentialLoads = 0;
	}

	let pvEfficiencyMode = config.solar?.efficiency;
	if (!validnonLoadValues.includes(pvEfficiencyMode)) {
		pvEfficiencyMode = 0;
	}

	const gridShowDailyBuy = config.grid?.show_daily_buy;
	const gridShowDailySell = config.grid?.show_daily_sell;

	const batteryColourConfig = card.colourConvert(config.battery?.colour);
	const batteryChargeColour = card.colourConvert(
		config.battery?.charge_colour || batteryColourConfig,
	);
	const battery2ColourConfig = card.colourConvert(config.battery2?.colour);
	const battery3ColourConfig = card.colourConvert(config.battery3?.colour);
	const battery4ColourConfig = card.colourConvert(config.battery4?.colour);
	const battery2ChargeColour = card.colourConvert(
		config.battery2?.charge_colour || battery2ColourConfig,
	);
	const battery3ChargeColour = card.colourConvert(
		config.battery3?.charge_colour || battery3ColourConfig,
	);
	const battery4ChargeColour = card.colourConvert(
		config.battery4?.charge_colour || battery4ColourConfig,
	);
	const batteryShowDaily = config.battery?.show_daily;

	const solarShowDaily = config.solar?.show_daily;
	let showAux = config.load?.show_aux;
	if (!validaux.includes(showAux)) {
		showAux = false;
	}

	const showDailyAux = config.load?.show_daily_aux;

	let additionalLoad = config.load?.additional_loads;
	const invalidLoad =
		!validLoadValues.includes(additionalLoad) ||
		(card.isFullCard && [3, 4, 5, 6].includes(additionalLoad) && showAux) ||
		(card.isFullCard && additionalLoad === 3) ||
		(card.isCompactCard &&
			!config.wide &&
			additionalLoad >= 5 &&
			[4, 5, 6].includes(config.solar.mppts));

	if (invalidLoad) {
		additionalLoad = 0;
	}

	let additionalAuxLoad = config.load?.aux_loads;
	if (!validauxLoads.includes(additionalAuxLoad)) {
		additionalAuxLoad = 0;
	}

	const auxType = config.load?.aux_type; //valid options are gen,inverter, default, gen, boiler, pump, aircon

	//Icons
	const iconEssentialLoad1 = card.getEntity('load.load1_icon', {
		state: config.load?.load1_icon?.toString() ?? '',
	}).state;
	const iconEssentialLoad2 = card.getEntity('load.load2_icon', {
		state: config.load?.load2_icon?.toString() ?? '',
	}).state;
	const iconEssentialLoad3 = card.getEntity('load.load3_icon', {
		state: config.load?.load3_icon?.toString() ?? '',
	}).state;
	const iconEssentialLoad4 = card.getEntity('load.load4_icon', {
		state: config.load?.load4_icon?.toString() ?? '',
	}).state;
	const iconEssentialLoad5 = card.getEntity('load.load5_icon', {
		state: config.load?.load5_icon?.toString() ?? '',
	}).state;
	const iconEssentialLoad6 = card.getEntity('load.load6_icon', {
		state: config.load?.load6_icon?.toString() ?? '',
	}).state;
	const iconAuxLoad1 = card.getEntity('load.aux_load1_icon', {
		state: config.load?.aux_load1_icon?.toString() ?? '',
	}).state;
	const iconAuxLoad2 = card.getEntity('load.aux_load2_icon', {
		state: config.load?.aux_load2_icon?.toString() ?? '',
	}).state;
	const nonessentialIcon = card.getEntity('grid.nonessential_icon', {
		state: config.grid?.nonessential_icon?.toString() ?? '',
	}).state;
	const iconNonessentialLoad1 = card.getEntity('grid.load1_icon', {
		state: config.grid?.load1_icon?.toString() ?? '',
	}).state;
	const iconNonessentialLoad2 = card.getEntity('grid.load2_icon', {
		state: config.grid?.load2_icon?.toString() ?? '',
	}).state;
	const iconNonessentialLoad3 = card.getEntity('grid.load3_icon', {
		state: config.grid?.load3_icon?.toString() ?? '',
	}).state;
	const iconGridImport = card.getEntity('grid.import_icon', {
		state: config.grid?.import_icon?.toString() ?? '',
	}).state;
	const iconGridDisconnected = card.getEntity('grid.disconnected_icon', {
		state: config.grid?.disconnected_icon?.toString() ?? '',
	}).state;
	const iconGridExport = card.getEntity('grid.export_icon', {
		state: config.grid?.export_icon?.toString() ?? '',
	}).state;

	const remainingSolar = config.entities.remaining_solar
		? Utils.convertValueNew(
				stateRemainingSolar.state,
				stateRemainingSolar.attributes?.unit_of_measurement,
				decimalPlaces,
			)
		: false;
	const totalSolarGeneration = config.entities.total_pv_generation
		? Utils.convertValueNew(
				stateTotalPVGeneration.state,
				stateTotalPVGeneration.attributes?.unit_of_measurement,
				2,
			)
		: false;
	const largeFont = config.large_font;
	const inverterColour = card.colourConvert(config.inverter?.colour);
	const enableAutarky = config.inverter?.autarky;
	const enableTimer = !config.entities.use_timer_248
		? false
		: stateUseTimer.state;
	const priorityLoad = !config.entities.priority_load_243
		? false
		: statePriorityLoad.state;
	let batteryPower = stateBatteryPower.toPower(config.battery?.invert_power);
	let battery2Power = stateBattery2Power.toPower(config.battery2?.invert_power);
	let battery3Power = stateBattery3Power.toPower(config.battery3?.invert_power);
	let battery4Power = stateBattery4Power.toPower(config.battery4?.invert_power);

	const cardHeight = card.getEntity('card_height', {
		state: config.card_height?.toString() ?? '',
	}).state;
	const cardWidth = card.getEntity('card_width', {
		state: config.card_width?.toString() ?? '',
	}).state;

	const energy_cost_decimals =
		config.grid?.energy_cost_decimals === 0
			? 0
			: config.grid?.energy_cost_decimals || 2;
	const energyCost =
		totalGridPower >= 0
			? stateEnergyCostBuy.toNum(energy_cost_decimals)
			: stateEnergyCostSell.toNum(energy_cost_decimals);

	let inverterModel = InverterModel.Sunsynk;

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

	//Autarky in Percent = Home Production / Home Consumption
	//Ratio in Percent = Home Consumption / Home Production
	const productionEnergy = stateDayPVEnergy.toNum() + totalDayBatteryDischarge;
	const consumptionEnergy = stateDayLoadEnergy.toNum() + totalDayBatteryCharge;
	const autarkyEnergy =
		consumptionEnergy != 0
			? Math.max(
					Math.min(
						Math.round((productionEnergy * 100) / consumptionEnergy),
						100,
					),
					0,
				)
			: 0;
	const ratioEnergy =
		productionEnergy != 0
			? Math.max(
					Math.min(
						Math.round((consumptionEnergy * 100) / productionEnergy),
						100,
					),
					0,
				)
			: 0;

	//const productionPower =
	//    totalPV +
	//    Utils.toNum(`${(config.battery.invert_flow === true ? batteryPowerTotal < 0 : batteryPowerTotal > 0) ? Math.abs(batteryPowerTotal) : 0}`) +
	//   Utils.toNum(`${auxPower < 0 ? auxPower * -1 : 0}`);

	const productionPower =
		totalPV +
		(config.battery.invert_flow === true
			? batteryPowerTotal < 0
				? Math.abs(batteryPowerTotal)
				: 0
			: batteryPowerTotal > 0
				? Math.abs(batteryPowerTotal)
				: 0) +
		(auxPower < 0 ? Math.abs(auxPower) : 0);

	//console.log(`Production Data`);
	//console.log(`P_Solar Power:${totalPV}`);
	//console.log(`P_Battery Power: ${(config.battery.invert_flow === true
	//        ? (batteryPowerTotal < 0 ? Math.abs(batteryPowerTotal) : 0)
	//        : (batteryPowerTotal > 0 ? Math.abs(batteryPowerTotal) : 0))}`);
	//console.log(`P_Aux Power:${(auxPower < 0 ? auxPower * -1 : 0)}`);
	//console.log(`Production Total:${productionPower}`);

	//const consumptionPower =
	//    essentialPower +
	//    Math.max(nonessentialPower, 0) +
	//    Utils.toNum(`${auxPower > 0 ? auxPower : 0}`) +
	//    Utils.toNum(`${(config.battery.invert_flow === true ? batteryPowerTotal > 0 : batteryPowerTotal < 0) ? Math.abs(batteryPowerTotal) : 0}`);

	const consumptionPower =
		essentialPower +
		Math.max(nonessentialPower, 0) +
		(auxPower > 0 ? auxPower : 0) +
		(config.battery.invert_flow === true
			? batteryPowerTotal > 0
				? Math.abs(batteryPowerTotal)
				: 0
			: batteryPowerTotal < 0
				? Math.abs(batteryPowerTotal)
				: 0);

	//console.log(`Consumption Data`);
	//console.log(`C_Essential Power:${essentialPower}`);
	//console.log(`C_NonEssential Power:${nonessentialPower}`);
	//console.log(`C_Battery Power:${(config.battery.invert_flow === true
	//    ? (batteryPowerTotal > 0 ? Math.abs(batteryPowerTotal) : 0)
	//    : (batteryPowerTotal < 0 ? Math.abs(batteryPowerTotal) : 0))}`);
	//console.log(`C_Aux Power:${(auxPower > 0 ? auxPower : 0)}`);
	//console.log(`Consumption Total:${consumptionPower}`);

	const autarkyPower =
		consumptionPower != 0
			? Math.max(
					Math.min(Math.round((productionPower * 100) / consumptionPower), 100),
					0,
				)
			: 0;
	const ratioPower =
		productionPower != 0
			? Math.max(
					Math.min(Math.round((consumptionPower * 100) / productionPower), 100),
					0,
				)
			: 0;

	//console.log(`Autarky: ${autarkyPower}`);
	//console.log(`Ratio: ${ratioPower}`);

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
