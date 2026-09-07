/* eslint-disable no-useless-assignment -- block moved verbatim from build-data.ts; flagged stores are pre-existing dead writes */
// Derived config/colour/icon defaults extracted from build-data.ts.
// Consumes the resolved entities; returns scalars/colours/icons used
// downstream by flow math and DataDto assembly.

import { Utils } from '../helpers/utils';
import { InverterModel, sunsynkPowerFlowCardConfig } from '../types';
import {
	validaux,
	validauxLoads,
	validGridConnected,
	validGridDisconnected,
	validLoadValues,
	validnonLoadValues,
} from '../const';
import type { SunsynkPowerFlowCard } from '../index';
import { getBatteryDirection } from './helpers';
import { resolveEntities } from './entities';

export function resolveDefaults(
	card: SunsynkPowerFlowCard,
	config: sunsynkPowerFlowCardConfig,
	e: ReturnType<typeof resolveEntities>,
) {
	const {
		_stateBattery3CurrentDirection,
		_stateBattery4CurrentDirection,
		stateAuxConnectedStatus,
		stateAuxLoad1,
		stateAuxLoad2,
		stateAuxPower,
		stateBattery2CurrentDirection,
		stateBattery2Power,
		stateBattery2Voltage,
		stateBattery3Power,
		stateBattery3Voltage,
		stateBattery4Power,
		stateBattery4Voltage,
		stateBatteryCurrentDirection,
		stateBatteryPower,
		stateBatteryVoltage,
		stateEnergyCostBuy,
		stateEnergyCostSell,
		stateEssentialLoad1,
		stateEssentialLoad2,
		stateEssentialLoad3,
		stateEssentialLoad4,
		stateEssentialLoad5,
		stateEssentialLoad6,
		stateGridCTPower,
		stateGridCTPowerL2,
		stateGridCTPowerL3,
		stateGridCTPowerTotal,
		stateGridConnectedStatus,
		stateGridPower,
		stateGridVoltage,
		stateInverterCurrent,
		stateInverterCurrentL2,
		stateInverterCurrentL3,
		stateInverterPower,
		stateInverterVoltage,
		stateInverterVoltageL2,
		stateInverterVoltageL3,
		stateLoadFrequency,
		stateLoadPowerL1,
		stateLoadPowerL2,
		stateLoadPowerL3,
		stateNonessentialLoad1,
		stateNonessentialLoad2,
		stateNonessentialLoad3,
		statePriorityLoad,
		stateRemainingSolar,
		stateTotalPVGeneration,
		stateUseTimer,
	} = e;

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
	const batteryPower = stateBatteryPower.toPower(config.battery?.invert_power);
	const battery2Power = stateBattery2Power.toPower(
		config.battery2?.invert_power,
	);
	const battery3Power = stateBattery3Power.toPower(
		config.battery3?.invert_power,
	);
	const battery4Power = stateBattery4Power.toPower(
		config.battery4?.invert_power,
	);

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

	const inverterModel: InverterModel = InverterModel.Sunsynk;

	return {
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
		gridStatus,
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
		batteryPower,
		battery2Power,
		battery3Power,
		battery4Power,
		cardHeight,
		cardWidth,
		energyCost,
		inverterModel,
	};
}
