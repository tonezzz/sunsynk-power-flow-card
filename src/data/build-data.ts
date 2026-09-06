/* eslint-disable no-useless-assignment -- block moved verbatim from index.ts render(); the flagged stores are pre-existing dead writes, not new logic */
import { DataDto, InverterModel, InverterSettings } from '../types';
import {
	Percentage,
	valid3phase,
	validaux,
	validauxLoads,
	validGridConnected,
	validGridDisconnected,
	validLoadValues,
	validnonLoadValues,
} from '../const';
import { localize } from '../localize/localize';
import { Utils } from '../helpers/utils';
import { BatteryIconManager } from '../helpers/battery-icon-manager';
import { CustomEntity } from '../inverters/dto/custom-entity';
import { icons } from '../helpers/icons';
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

	// Helper: convert a battery current-direction entity to a signed direction.
	// Returns +1 when discharging, -1 when charging, and null when unknown.
	const getBatteryDirection = (state: CustomEntity): number | null => {
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
	};

	//Energy
	const stateDayBatteryDischarge = card.getEntity(
		'entities.day_battery_discharge_71',
	);
	const stateDayBatteryCharge = card.getEntity(
		'entities.day_battery_charge_70',
	);
	const stateDayBattery2Discharge = card.getEntity(
		'entities.day_battery2_discharge_71',
	);
	const stateDayBattery2Charge = card.getEntity(
		'entities.day_battery2_charge_70',
	);
	const _stateDayBattery3Discharge = card.getEntity(
		'entities.day_battery3_discharge_71',
	);
	const _stateDayBattery3Charge = card.getEntity(
		'entities.day_battery3_charge_70',
	);
	const _stateDayBattery4Discharge = card.getEntity(
		'entities.day_battery4_discharge_71',
	);
	const _stateDayBattery4Charge = card.getEntity(
		'entities.day_battery4_charge_70',
	);
	const stateDayLoadEnergy = card.getEntity('entities.day_load_energy_84');
	const stateDayGridImport = card.getEntity('entities.day_grid_import_76');
	const stateDayPVEnergy = card.getEntity('entities.day_pv_energy_108');
	const stateDayGridExport = card.getEntity('entities.day_grid_export_77');
	const stateDayAuxEnergy = card.getEntity('entities.day_aux_energy');

	//Inverter
	const stateInverterVoltage = card.getEntity('entities.inverter_voltage_154');
	const stateLoadFrequency = card.getEntity('entities.load_frequency_192');
	const stateInverterCurrent = card.getEntity('entities.inverter_current_164');
	const stateInverterStatus = card.getEntity('entities.inverter_status_59', {
		state: '',
	});
	const stateInverterPower = card.getEntity('entities.inverter_power_175');
	const statePriorityLoad = card.getEntity('entities.priority_load_243', {
		state: config.entities.priority_load_243?.toString() ?? 'false',
	});
	const stateUseTimer = card.getEntity('entities.use_timer_248', {
		state: config.entities.use_timer_248?.toString() ?? 'false',
	});
	const stateDCTransformerTemp = card.getEntity(
		'entities.dc_transformer_temp_90',
		{ state: '' },
	);
	const stateRadiatorTemp = card.getEntity('entities.radiator_temp_91', {
		state: '',
	});
	const stateInverterVoltageL2 = card.getEntity(
		'entities.inverter_voltage_L2',
		{ state: '' },
	);
	const stateInverterVoltageL3 = card.getEntity(
		'entities.inverter_voltage_L3',
		{ state: '' },
	);
	const stateInverterCurrentL2 = card.getEntity(
		'entities.inverter_current_L2',
		{ state: '' },
	);
	const stateInverterCurrentL3 = card.getEntity(
		'entities.inverter_current_L3',
		{ state: '' },
	);
	const stateEnvironmentTemp = card.getEntity('entities.environment_temp', {
		state: '',
	});

	//Battery 1
	const stateBatteryVoltage = card.getEntity('entities.battery_voltage_183');
	const stateBatterySoc = card.getEntity(
		'entities.battery_soc_184',
		null,
		config.battery.soc_decimal_places,
		Percentage.PERCENTAGE,
	);
	const stateBatteryPower = card.getEntity('entities.battery_power_190');
	const stateBatteryCurrent = card.getEntity('entities.battery_current_191');
	const stateBatteryTemp = card.getEntity('entities.battery_temp_182', {
		state: '',
	});
	const stateBatteryStatus = card.getEntity('entities.battery_status', {
		state: '',
	});
	const stateBatteryCurrentDirection = card.getEntity(
		'entities.battery_current_direction',
		{ state: '' },
	);
	const stateBatteryRatedCapacity = card.getEntity(
		'entities.battery_rated_capacity',
		{ state: '' },
	);
	const stateShutdownSOC = card.getEntity('battery.shutdown_soc', {
		state: config.battery.shutdown_soc?.toString() ?? '',
	});
	const stateShutdownSOCOffGrid = card.getEntity(
		'battery.shutdown_soc_offgrid',
		{
			state: config.battery.shutdown_soc_offgrid?.toString() ?? '',
		},
	);
	const stateBatterySOH = card.getEntity('entities.battery_soh', {
		state: '',
	});
	const stateSOCEndOfCharge = card.getEntity('battery.soc_end_of_charge', {
		state: config.battery.soc_end_of_charge?.toString() ?? '',
	});

	//Battery 2
	const stateBattery2Voltage = card.getEntity('entities.battery2_voltage_183');
	const stateBattery2Soc = card.getEntity(
		'entities.battery2_soc_184',
		null,
		config.battery2.soc_decimal_places,
		Percentage.PERCENTAGE,
	);
	const stateBattery2Power = card.getEntity('entities.battery2_power_190');
	const stateBattery2Current = card.getEntity('entities.battery2_current_191');
	const stateBattery2Temp = card.getEntity('entities.battery2_temp_182', {
		state: '',
	});
	const stateBattery2Status = card.getEntity('entities.battery2_status', {
		state: '',
	});
	const stateBattery2CurrentDirection = card.getEntity(
		'entities.battery2_current_direction',
		{ state: '' },
	);
	const stateBattery2RatedCapacity = card.getEntity(
		'entities.battery2_rated_capacity',
		{ state: '' },
	);
	const stateShutdownSOC2 = card.getEntity('battery2.shutdown_soc', {
		state: config.battery2.shutdown_soc?.toString() ?? '',
	});
	const stateShutdownSOCOffGrid2 = card.getEntity(
		'battery2.shutdown_soc_offgrid',
		{
			state: config.battery2.shutdown_soc_offgrid?.toString() ?? '',
		},
	);
	const stateBattery2SOH = card.getEntity('entities.battery2_soh', {
		state: '',
	});
	const stateSOCEndOfCharge2 = card.getEntity('battery2.soc_end_of_charge', {
		state: config.battery2.soc_end_of_charge?.toString() ?? '',
	});

	//Battery 3
	const stateBattery3Voltage = card.getEntity('entities.battery3_voltage_183');
	const stateBattery3Soc = card.getEntity(
		'entities.battery3_soc_184',
		null,
		config.battery3.soc_decimal_places,
		Percentage.PERCENTAGE,
	);
	const stateBattery3Power = card.getEntity('entities.battery3_power_190');
	const stateBattery3Current = card.getEntity('entities.battery3_current_191');
	const stateBattery3Temp = card.getEntity('entities.battery3_temp_182', {
		state: '',
	});
	const stateBattery3Status = card.getEntity('entities.battery3_status', {
		state: '',
	});
	const _stateBattery3CurrentDirection = card.getEntity(
		'entities.battery3_current_direction',
		{ state: '' },
	);
	const stateBattery3RatedCapacity = card.getEntity(
		'entities.battery3_rated_capacity',
		{ state: '' },
	);
	const stateShutdownSOC3 = card.getEntity('battery3.shutdown_soc', {
		state: config.battery3.shutdown_soc?.toString() ?? '',
	});
	const stateShutdownSOCOffGrid3 = card.getEntity(
		'battery3.shutdown_soc_offgrid',
		{
			state: config.battery3.shutdown_soc_offgrid?.toString() ?? '',
		},
	);
	const stateBattery3SOH = card.getEntity('entities.battery3_soh', {
		state: '',
	});
	const stateSOCEndOfCharge3 = card.getEntity('battery3.soc_end_of_charge', {
		state: config.battery3.soc_end_of_charge?.toString() ?? '',
	});

	//Battery 4
	const stateBattery4Voltage = card.getEntity('entities.battery4_voltage_183');
	const stateBattery4Soc = card.getEntity(
		'entities.battery4_soc_184',
		null,
		config.battery4.soc_decimal_places,
		Percentage.PERCENTAGE,
	);
	const stateBattery4Power = card.getEntity('entities.battery4_power_190');
	const stateBattery4Current = card.getEntity('entities.battery4_current_191');
	const stateBattery4Temp = card.getEntity('entities.battery4_temp_182', {
		state: '',
	});
	const stateBattery4Status = card.getEntity('entities.battery4_status', {
		state: '',
	});
	const _stateBattery4CurrentDirection = card.getEntity(
		'entities.battery4_current_direction',
		{ state: '' },
	);
	const stateBattery4RatedCapacity = card.getEntity(
		'entities.battery4_rated_capacity',
		{ state: '' },
	);
	const stateShutdownSOC4 = card.getEntity('battery4.shutdown_soc', {
		state: config.battery4.shutdown_soc?.toString() ?? '',
	});
	const stateShutdownSOCOffGrid4 = card.getEntity(
		'battery4.shutdown_soc_offgrid',
		{
			state: config.battery4.shutdown_soc_offgrid?.toString() ?? '',
		},
	);
	const stateBattery4SOH = card.getEntity('entities.battery4_soh', {
		state: '',
	});
	const stateSOCEndOfCharge4 = card.getEntity('battery4.soc_end_of_charge', {
		state: config.battery4.soc_end_of_charge?.toString() ?? '',
	});

	//Load
	const stateEssentialPower = card.getEntity('entities.essential_power');
	const stateAuxPower = card.getEntity('entities.aux_power_166');
	const stateNonessentialPower = card.getEntity('entities.nonessential_power');
	const stateNonessentialLoad1 = card.getEntity('entities.non_essential_load1');
	const stateNonessentialLoad2 = card.getEntity('entities.non_essential_load2');
	const stateNonessentialLoad3 = card.getEntity('entities.non_essential_load3');
	const stateNonEssentialLoad1Extra = card.getEntity(
		'entities.non_essential_load1_extra',
	);
	const stateNonEssentialLoad2Extra = card.getEntity(
		'entities.non_essential_load2_extra',
	);
	const stateNonEssentialLoad3Extra = card.getEntity(
		'entities.non_essential_load3_extra',
	);
	const stateEssentialLoad1 = card.getEntity('entities.essential_load1');
	const stateEssentialLoad2 = card.getEntity('entities.essential_load2');
	const stateEssentialLoad3 = card.getEntity('entities.essential_load3');
	const stateEssentialLoad4 = card.getEntity('entities.essential_load4');
	const stateEssentialLoad5 = card.getEntity('entities.essential_load5');
	const stateEssentialLoad6 = card.getEntity('entities.essential_load6');
	const stateAuxConnectedStatus = card.getEntity(
		'entities.aux_connected_status',
		{ state: 'on' },
	);
	const stateAuxLoad1 = card.getEntity('entities.aux_load1');
	const stateAuxLoad2 = card.getEntity('entities.aux_load2');
	const stateEssentialLoad1Extra = card.getEntity(
		'entities.essential_load1_extra',
	);
	const stateEssentialLoad2Extra = card.getEntity(
		'entities.essential_load2_extra',
	);
	const stateEssentialLoad3Extra = card.getEntity(
		'entities.essential_load3_extra',
	);
	const stateEssentialLoad4Extra = card.getEntity(
		'entities.essential_load4_extra',
	);
	const stateEssentialLoad5Extra = card.getEntity(
		'entities.essential_load5_extra',
	);
	const stateEssentialLoad6Extra = card.getEntity(
		'entities.essential_load6_extra',
	);
	const stateLoadPowerL1 = card.getEntity('entities.load_power_L1');
	const stateLoadPowerL2 = card.getEntity('entities.load_power_L2');
	const stateLoadPowerL3 = card.getEntity('entities.load_power_L3');
	const stateAuxLoad1Extra = card.getEntity('entities.aux_load1_extra');
	const stateAuxLoad2Extra = card.getEntity('entities.aux_load2_extra');

	//Grid
	const stateGridCTPower = card.getEntity('entities.grid_ct_power_172');
	const stateGridCTPowerL2 = card.getEntity('entities.grid_ct_power_L2');
	const stateGridCTPowerL3 = card.getEntity('entities.grid_ct_power_L3');
	const stateGridCTPowerTotal = card.getEntity('entities.grid_ct_power_total');
	const stateGridConnectedStatus = card.getEntity(
		'entities.grid_connected_status_194',
		{ state: 'on' },
	);
	const stateGridPower = card.getEntity('entities.grid_power_169');
	const stateEnergyCostBuy = card.getEntity('entities.energy_cost_buy', {
		state: '',
		attributes: { unit_of_measurement: '' },
	});
	const stateEnergyCostSell = card.getEntity('entities.energy_cost_sell', {
		state: '',
		attributes: { unit_of_measurement: '' },
	});
	const stateGridVoltage = card.getEntity('entities.grid_voltage', null);
	const statePrepaidUnits = card.getEntity('entities.prepaid_units');
	const stateMaxSellPower = card.getEntity('entities.max_sell_power');

	//Solar
	const statePV1Voltage = card.getEntity('entities.pv1_voltage_109');
	const statePV1Current = card.getEntity('entities.pv1_current_110');
	const statePV2Voltage = card.getEntity('entities.pv2_voltage_111');
	const statePV2Current = card.getEntity('entities.pv2_current_112');
	const statePV3Voltage = card.getEntity('entities.pv3_voltage_113');
	const statePV3Current = card.getEntity('entities.pv3_current_114');
	const statePV4Voltage = card.getEntity('entities.pv4_voltage_115');
	const statePV4Current = card.getEntity('entities.pv4_current_116');
	const statePV5Voltage = card.getEntity('entities.pv5_voltage');
	const statePV5Current = card.getEntity('entities.pv5_current');
	const statePV6Voltage = card.getEntity('entities.pv6_voltage');
	const statePV6Current = card.getEntity('entities.pv6_current');
	const statePV1Power = card.getEntity('entities.pv1_power_186');
	const statePV2Power = card.getEntity('entities.pv2_power_187');
	const statePV3Power = card.getEntity('entities.pv3_power_188');
	const statePV4Power = card.getEntity('entities.pv4_power_189');
	const statePV5Power = card.getEntity('entities.pv5_power');
	const statePV6Power = card.getEntity('entities.pv6_power');
	const stateRemainingSolar = card.getEntity('entities.remaining_solar');
	const stateSolarSell = card.getEntity('entities.solar_sell_247', {
		state: 'undefined',
	});
	const statePVTotal = card.getEntity('entities.pv_total');
	const stateTotalPVGeneration = card.getEntity('entities.total_pv_generation');

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

	//Timer entities
	const prog1 = {
		time: card.getEntity('entities.prog1_time', {
			state: config.entities.prog1_time ?? '',
		}),
		capacity: card.getEntity('entities.prog1_capacity', {
			state: config.entities.prog1_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog1_charge', {
			state: config.entities.prog1_charge ?? '',
		}),
	};
	const prog2 = {
		time: card.getEntity('entities.prog2_time', {
			state: config.entities.prog2_time ?? '',
		}),
		capacity: card.getEntity('entities.prog2_capacity', {
			state: config.entities.prog2_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog2_charge', {
			state: config.entities.prog2_charge ?? '',
		}),
	};
	const prog3 = {
		time: card.getEntity('entities.prog3_time', {
			state: config.entities.prog3_time ?? '',
		}),
		capacity: card.getEntity('entities.prog3_capacity', {
			state: config.entities.prog3_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog3_charge', {
			state: config.entities.prog3_charge ?? '',
		}),
	};
	const prog4 = {
		time: card.getEntity('entities.prog4_time', {
			state: config.entities.prog4_time ?? '',
		}),
		capacity: card.getEntity('entities.prog4_capacity', {
			state: config.entities.prog4_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog4_charge', {
			state: config.entities.prog4_charge ?? '',
		}),
	};
	const prog5 = {
		time: card.getEntity('entities.prog5_time', {
			state: config.entities.prog5_time ?? '',
		}),
		capacity: card.getEntity('entities.prog5_capacity', {
			state: config.entities.prog5_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog5_charge', {
			state: config.entities.prog5_charge ?? '',
		}),
	};
	const prog6 = {
		time: card.getEntity('entities.prog6_time', {
			state: config.entities.prog6_time ?? '',
		}),
		capacity: card.getEntity('entities.prog6_capacity', {
			state: config.entities.prog6_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog6_charge', {
			state: config.entities.prog6_charge ?? '',
		}),
	};

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

	const inverterProg: InverterSettings = {
		capacity: batteryShutdown,
		entityID: '',
	};

	switch (true) {
		case stateUseTimer.state === 'off':
		case !enableTimer:
		case !config.entities.prog1_time:
		case !config.entities.prog2_time:
		case !config.entities.prog3_time:
		case !config.entities.prog4_time:
		case !config.entities.prog5_time:
		case !config.entities.prog6_time:
			inverterProg.show = false;
			break;

		default: {
			inverterProg.show = true;

			const timer_now = new Date(); // Create a new Date object representing the current time
			//console.log(`Current date and time: ${timer_now.toLocaleString()}`);

			assignInverterProgramBasedOnTime(timer_now);

			function assignInverterProgramBasedOnTime(timer_now: Date) {
				const progTimes: { start: Date; end: Date }[] = [];

				// Populate the progTimes array with Date objects based on the current time
				[prog1, prog2, prog3, prog4, prog5, prog6].forEach((prog, index) => {
					if (!prog || !prog.time || !prog.time.state) {
						console.error(
							`Program ${index + 1} is not defined or has no valid time.`,
						);
						return; // Skip this program
					}

					const [hours, minutes] = prog.time.state
						.split(':')
						.map((item) => parseInt(item, 10));
					const progStartTime = new Date(timer_now.getTime());
					progStartTime.setHours(hours);
					progStartTime.setMinutes(minutes);

					// Determine the end time for each program (next program's start time)
					const nextIndex =
						(index + 1) % [prog1, prog2, prog3, prog4, prog5, prog6].length;
					const nextProg = [prog1, prog2, prog3, prog4, prog5, prog6][
						nextIndex
					];
					const progEndTime =
						nextProg && nextProg.time && nextProg.time.state
							? new Date(timer_now.getTime())
							: new Date(timer_now.getTime());

					if (nextProg && nextProg.time && nextProg.time.state) {
						const [nextHours, nextMinutes] = nextProg.time.state
							.split(':')
							.map((item) => parseInt(item, 10));
						progEndTime.setHours(nextHours);
						progEndTime.setMinutes(nextMinutes);
					} else {
						console.warn(
							`Next program ${nextIndex + 1} is not defined or has no valid time.`,
						);
					}

					//console.log(`Program ${index + 1} time (before adjustment): Start: ${progStartTime.toLocaleString()}, End: ${progEndTime.toLocaleString()}`);

					// Add to the progTimes array
					progTimes[index] = { start: progStartTime, end: progEndTime };
				});

				// Adjust times for the next day if necessary
				adjustProgramTimes(progTimes, timer_now);

				// Time comparison logic to determine the active program
				for (let i = 0; i < progTimes.length; i++) {
					const { start: currentProgStartTime, end: currentProgEndTime } =
						progTimes[i];

					// Check for normal case (start < end)
					if (
						currentProgStartTime <= timer_now &&
						timer_now < currentProgEndTime
					) {
						//console.log(`Assigning Program ${i + 1}`);
						assignInverterProgValues(
							[prog1, prog2, prog3, prog4, prog5, prog6][i],
							config.entities[`prog${i + 1}_charge`],
						);
						break; // Exit once the correct program is assigned
					}
					// Check for wrap-around case (start > end)
					else if (currentProgStartTime > currentProgEndTime) {
						if (
							timer_now >= currentProgStartTime ||
							timer_now < currentProgEndTime
						) {
							//console.log(`Assigning Program ${i + 1} (wrap-around)`);
							assignInverterProgValues(
								[prog1, prog2, prog3, prog4, prog5, prog6][i],
								config.entities[`prog${i + 1}_charge`],
							);
							break; // Exit once the correct program is assigned
						}
					}
				}
			}

			function adjustProgramTimes(
				progTimes: { start: Date; end: Date }[],
				timer_now: Date,
			) {
				const currentTime = timer_now.getTime();
				// Adjust for times that roll over into the next day
				progTimes.forEach((progTime) => {
					// If the start time is before current time and the end time is after the current time, adjust to the next day
					if (
						progTime.start.getTime() < currentTime &&
						progTime.end.getTime() < currentTime
					) {
						progTime.start.setDate(progTime.start.getDate() + 1);
						progTime.end.setDate(progTime.end.getDate() + 1);
						//console.log(`Adjusted Program ${index + 1} to next day: Start: ${progTime.start.toLocaleString()}, End: ${progTime.end.toLocaleString()}`);
					}
				});
				return progTimes;
			}

			function assignInverterProgValues(prog, entityID) {
				if (
					prog.charge.state === 'No Grid or Gen' ||
					prog.charge.state === '0' ||
					prog.charge.state === 'off'
				) {
					inverterProg.charge = 'none';
				} else {
					inverterProg.charge = 'both';
				}

				inverterProg.capacity = parseInt(prog.capacity.state);
				inverterProg.entityID = entityID;
			}

			break;
		}
	}

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

	//calculate battery capacity
	let batteryCapacity: number = 0;
	if (config.show_battery) {
		switch (true) {
			case !inverterProg.show:
				if (
					config.battery.invert_flow === true
						? batteryPower < 0
						: batteryPower > 0
				) {
					if (
						(gridStatus === 'on' ||
							gridStatus === '1' ||
							gridStatus.toLowerCase() === 'on-grid') &&
						!inverterProg.show
					) {
						batteryCapacity = batteryShutdown;
					} else if (
						(gridStatus === 'off' ||
							gridStatus === '0' ||
							gridStatus.toLowerCase() === 'off-grid') &&
						stateShutdownSOCOffGrid.notEmpty() &&
						!inverterProg.show
					) {
						batteryCapacity = shutdownOffGrid;
					} else {
						batteryCapacity = batteryShutdown;
					}
				} else if (
					config.battery.invert_flow === true
						? batteryPower > 0
						: batteryPower < 0
				) {
					batteryCapacity = maximumSOC;
				}
				break;

			default:
				batteryCapacity = inverterSettings.getBatteryCapacity(
					batteryPower,
					gridStatus,
					batteryShutdown,
					inverterProg,
					stateBatterySoc,
					maximumSOC,
					config.battery.invert_flow,
				);
		}
	}

	//calculate battery2 capacity
	let battery2Capacity: number = 0;
	if (config.show_battery) {
		switch (true) {
			case !inverterProg.show:
				if (
					config.battery2.invert_flow === true
						? battery2Power < 0
						: battery2Power > 0
				) {
					if (
						(gridStatus === 'on' ||
							gridStatus === '1' ||
							gridStatus.toLowerCase() === 'on-grid') &&
						!inverterProg.show
					) {
						battery2Capacity = batteryShutdown2;
					} else if (
						(gridStatus === 'off' ||
							gridStatus === '0' ||
							gridStatus.toLowerCase() === 'off-grid') &&
						stateShutdownSOCOffGrid2.notEmpty() &&
						!inverterProg.show
					) {
						battery2Capacity = shutdownOffGrid2;
					} else {
						battery2Capacity = batteryShutdown2;
					}
				} else if (
					config.battery2.invert_flow === true
						? battery2Power > 0
						: battery2Power < 0
				) {
					battery2Capacity = maximumSOC2;
				}
				break;

			default:
				battery2Capacity = inverterSettings.getBatteryCapacity(
					battery2Power,
					gridStatus,
					batteryShutdown2,
					inverterProg,
					stateBattery2Soc,
					maximumSOC2,
					config.battery2.invert_flow,
				);
		}
	}

	//calculate battery3 capacity
	let battery3Capacity: number = 0;
	if (config.show_battery) {
		switch (true) {
			case !inverterProg.show:
				if (
					config.battery3.invert_flow === true
						? battery3Power < 0
						: battery3Power > 0
				) {
					if (
						(gridStatus === 'on' ||
							gridStatus === '1' ||
							gridStatus.toLowerCase() === 'on-grid') &&
						!inverterProg.show
					) {
						battery3Capacity = batteryShutdown3;
					} else if (
						(gridStatus === 'off' ||
							gridStatus === '0' ||
							gridStatus.toLowerCase() === 'off-grid') &&
						stateShutdownSOCOffGrid3.notEmpty() &&
						!inverterProg.show
					) {
						battery3Capacity = shutdownOffGrid3;
					} else {
						battery3Capacity = batteryShutdown3;
					}
				} else if (
					config.battery3.invert_flow === true
						? battery3Power > 0
						: battery3Power < 0
				) {
					battery3Capacity = maximumSOC3;
				}
				break;

			default:
				battery3Capacity = inverterSettings.getBatteryCapacity(
					battery3Power,
					gridStatus,
					batteryShutdown3,
					inverterProg,
					stateBattery3Soc,
					maximumSOC3,
					config.battery3.invert_flow,
				);
		}
	}

	//calculate battery4 capacity
	let battery4Capacity: number = 0;
	if (config.show_battery) {
		switch (true) {
			case !inverterProg.show:
				if (
					config.battery4.invert_flow === true
						? battery4Power < 0
						: battery4Power > 0
				) {
					if (
						(gridStatus === 'on' ||
							gridStatus === '1' ||
							gridStatus.toLowerCase() === 'on-grid') &&
						!inverterProg.show
					) {
						battery4Capacity = batteryShutdown4;
					} else if (
						(gridStatus === 'off' ||
							gridStatus === '0' ||
							gridStatus.toLowerCase() === 'off-grid') &&
						stateShutdownSOCOffGrid4.notEmpty() &&
						!inverterProg.show
					) {
						battery4Capacity = shutdownOffGrid4;
					} else {
						battery4Capacity = batteryShutdown4;
					}
				} else if (
					config.battery4.invert_flow === true
						? battery4Power > 0
						: battery4Power < 0
				) {
					battery4Capacity = maximumSOC4;
				}
				break;

			default:
				battery4Capacity = inverterSettings.getBatteryCapacity(
					battery4Power,
					gridStatus,
					batteryShutdown4,
					inverterProg,
					stateBattery4Soc,
					maximumSOC4,
					config.battery4.invert_flow,
				);
		}
	}

	//calculate remaining battery time to charge or discharge

	let formattedResultTime = '';
	let formattedResultTime2 = '';
	let formattedResultTime3 = '';
	let formattedResultTime4 = '';
	let batteryDuration = '';
	let batteryDuration2 = '';
	let batteryDuration3 = '';
	let batteryDuration4 = '';

	const battenergy = card.getEntity('battery.energy', {
		state: config.battery.energy?.toString() ?? '',
	});
	const batt2energy = card.getEntity('battery2.energy', {
		state: config.battery2.energy?.toString() ?? '',
	});
	const batt3energy = card.getEntity('battery3.energy', {
		state: config.battery3.energy?.toString() ?? '',
	});
	const batt4energy = card.getEntity('battery4.energy', {
		state: config.battery4.energy?.toString() ?? '',
	});
	let batteryEnergy = battenergy.toPower(false);
	let battery2Energy = batt2energy.toPower(false);
	let battery3Energy = batt3energy.toPower(false);
	let battery4Energy = batt4energy.toPower(false);

	if (batteryVoltage && stateBatteryRatedCapacity.notEmpty()) {
		batteryEnergy = Utils.toNum(
			batteryVoltage * stateBatteryRatedCapacity.toNum(0),
			0,
		);
	}
	if (battery2Voltage && stateBattery2RatedCapacity.notEmpty()) {
		battery2Energy = Utils.toNum(
			battery2Voltage * stateBattery2RatedCapacity.toNum(0),
			0,
		);
	}
	if (battery3Voltage && stateBattery3RatedCapacity.notEmpty()) {
		battery3Energy = Utils.toNum(
			battery3Voltage * stateBattery3RatedCapacity.toNum(0),
			0,
		);
	}
	if (battery4Voltage && stateBattery4RatedCapacity.notEmpty()) {
		battery4Energy = Utils.toNum(
			battery4Voltage * stateBattery4RatedCapacity.toNum(0),
			0,
		);
	}

	const batteryTotalEnergy = batteryEnergy + battery2Energy;

	if (config.show_battery || batteryEnergy !== 0 || battery2Energy !== 0) {
		const calculateTotalSeconds = (
			soc,
			shutdown,
			capacity,
			energy,
			power,
			invertFlow,
		) => {
			if (power === 0) {
				return ((soc.toNum(0) - shutdown) / 100) * energy * 60 * 60;
			} else if (invertFlow ? power < 0 : power > 0) {
				return (
					((((soc.toNum(0) - capacity) / 100) * energy) / Math.abs(power)) *
					60 *
					60
				);
			} else if (invertFlow ? power > 0 : power < 0) {
				return (
					((((capacity - soc.toNum(0)) / 100) * energy) / Math.abs(power)) *
					60 *
					60
				);
			}
			return 0; // Default case
		};

		let totalSeconds = 0;
		if (batteryEnergy !== 0) {
			totalSeconds = calculateTotalSeconds(
				stateBatterySoc,
				batteryShutdown,
				batteryCapacity,
				batteryEnergy,
				batteryPower,
				config.battery.invert_flow,
			);

			const currentTime = new Date();
			const resultTime = new Date(currentTime.getTime() + totalSeconds * 1000);
			const resultHours = resultTime.getHours(); // Get the hours component of the resulting time
			const resultMinutes = resultTime.getMinutes(); // Get the minutes component of the resulting time
			const formattedMinutes = resultMinutes.toString().padStart(2, '0');
			const formattedHours = resultHours.toString().padStart(2, '0');
			formattedResultTime = `${formattedHours}:${formattedMinutes}`;

			// Calculate duration in days, hours, and minutes
			const days = Math.floor(totalSeconds / (60 * 60 * 24));
			const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
			const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

			if (days > 0) {
				batteryDuration += `${days} ${localize('common.days')}, `;
			}
			if (hours > 0 || days > 0) {
				batteryDuration += `${hours} ${localize('common.hrs')}, `;
			}
			batteryDuration += `${minutes} ${localize('common.min')}`;
		}

		let totalSeconds2 = 0;
		if (battery2Energy !== 0) {
			totalSeconds2 = calculateTotalSeconds(
				stateBattery2Soc,
				batteryShutdown2,
				battery2Capacity,
				battery2Energy,
				battery2Power,
				config.battery2.invert_flow,
			);

			const currentTime2 = new Date();
			const resultTime2 = new Date(
				currentTime2.getTime() + totalSeconds2 * 1000,
			);
			const resultHours2 = resultTime2.getHours(); // Get the hours component of the resulting time
			const resultMinutes2 = resultTime2.getMinutes(); // Get the minutes component of the resulting time
			const formattedMinutes2 = resultMinutes2.toString().padStart(2, '0');
			const formattedHours2 = resultHours2.toString().padStart(2, '0');
			formattedResultTime2 = `${formattedHours2}:${formattedMinutes2}`;

			// Calculate duration in days, hours, and minutes
			const days2 = Math.floor(totalSeconds2 / (60 * 60 * 24));
			const hours2 = Math.floor((totalSeconds2 % (60 * 60 * 24)) / (60 * 60));
			const minutes2 = Math.floor((totalSeconds2 % (60 * 60)) / 60);

			if (days2 > 0) {
				batteryDuration2 += `${days2} ${localize('common.days')}, `;
			}
			if (hours2 > 0 || days2 > 0) {
				batteryDuration2 += `${hours2} ${localize('common.hrs')}, `;
			}
			batteryDuration2 += `${minutes2} ${localize('common.min')}`;
		}

		let totalSeconds3 = 0;
		if (battery3Energy !== 0) {
			totalSeconds3 = calculateTotalSeconds(
				stateBattery3Soc,
				batteryShutdown3,
				battery3Capacity,
				battery3Energy,
				battery3Power,
				config.battery3.invert_flow,
			);

			const currentTime3 = new Date();
			const resultTime3 = new Date(
				currentTime3.getTime() + totalSeconds3 * 1000,
			);
			const resultHours3 = resultTime3.getHours();
			const resultMinutes3 = resultTime3.getMinutes();
			const formattedMinutes3 = resultMinutes3.toString().padStart(2, '0');
			const formattedHours3 = resultHours3.toString().padStart(2, '0');
			formattedResultTime3 = `${formattedHours3}:${formattedMinutes3}`;

			const days3 = Math.floor(totalSeconds3 / (60 * 60 * 24));
			const hours3 = Math.floor((totalSeconds3 % (60 * 60 * 24)) / (60 * 60));
			const minutes3 = Math.floor((totalSeconds3 % (60 * 60)) / 60);

			if (days3 > 0) {
				batteryDuration3 += `${days3} ${localize('common.days')}, `;
			}
			if (hours3 > 0 || days3 > 0) {
				batteryDuration3 += `${hours3} ${localize('common.hrs')}, `;
			}
			batteryDuration3 += `${minutes3} ${localize('common.min')}`;
		}

		let totalSeconds4 = 0;
		if (battery4Energy !== 0) {
			totalSeconds4 = calculateTotalSeconds(
				stateBattery4Soc,
				batteryShutdown4,
				battery4Capacity,
				battery4Energy,
				battery4Power,
				config.battery4.invert_flow,
			);

			const currentTime4 = new Date();
			const resultTime4 = new Date(
				currentTime4.getTime() + totalSeconds4 * 1000,
			);
			const resultHours4 = resultTime4.getHours();
			const resultMinutes4 = resultTime4.getMinutes();
			const formattedMinutes4 = resultMinutes4.toString().padStart(2, '0');
			const formattedHours4 = resultHours4.toString().padStart(2, '0');
			formattedResultTime4 = `${formattedHours4}:${formattedMinutes4}`;

			const days4 = Math.floor(totalSeconds4 / (60 * 60 * 24));
			const hours4 = Math.floor((totalSeconds4 % (60 * 60 * 24)) / (60 * 60));
			const minutes4 = Math.floor((totalSeconds4 % (60 * 60)) / 60);

			if (days4 > 0) {
				batteryDuration4 += `${days4} ${localize('common.days')}, `;
			}
			if (hours4 > 0 || days4 > 0) {
				batteryDuration4 += `${hours4} ${localize('common.hrs')}, `;
			}
			batteryDuration4 += `${minutes4} ${localize('common.min')}`;
		}
	}

	const isFloating =
		-2 <= stateBatteryCurrent.toNum(0) &&
		stateBatteryCurrent.toNum(0) <= 2 &&
		stateBatterySoc.toNum(0) >= 99;

	const isFloating2 =
		-2 <= stateBattery2Current.toNum(0) &&
		stateBattery2Current.toNum(0) <= 2 &&
		stateBattery2Soc.toNum(0) >= 99;
	const isFloating3 =
		-2 <= stateBattery3Current.toNum(0) &&
		stateBattery3Current.toNum(0) <= 2 &&
		stateBattery3Soc.toNum(0) >= 99;
	const isFloating4 =
		-2 <= stateBattery4Current.toNum(0) &&
		stateBattery4Current.toNum(0) <= 2 &&
		stateBattery4Soc.toNum(0) >= 99;

	const isFloatingCombined =
		batteryCount === 2 ? isFloating && isFloating2 : isFloating;

	// Determine battery colours
	let batteryColour: string;
	if (
		config.battery.invert_flow === true
			? batteryPower > 0 && !isFloating
			: batteryPower < 0 && !isFloating
	) {
		batteryColour = batteryChargeColour;
	} else {
		batteryColour = batteryColourConfig;
	}

	let battery2Colour = battery2ColourConfig;
	if (
		config.battery2.invert_flow === true
			? battery2Power > 0 && !isFloating2
			: battery2Power < 0 && !isFloating2
	) {
		battery2Colour = battery2ChargeColour;
	}
	let battery3Colour = battery3ColourConfig;
	if (
		config.battery3.invert_flow === true
			? battery3Power > 0 && !isFloating3
			: battery3Power < 0 && !isFloating3
	) {
		battery3Colour = battery3ChargeColour;
	}
	let battery4Colour = battery4ColourConfig;
	if (
		config.battery4.invert_flow === true
			? battery4Power > 0 && !isFloating4
			: battery4Power < 0 && !isFloating4
	) {
		battery4Colour = battery4ChargeColour;
	}

	//Set Inverter Status Message and dot
	let inverterStateColour = '';
	let inverterStateMsg = '';
	let inverterState = stateInverterStatus.state as string;

	let found = false;

	/**
	 * Status can be returned as decimals "3.0", so this is just to change it to an int
	 */
	if (inverterModel == InverterModel.Solis) {
		inverterState = !stateInverterStatus.isNaN()
			? stateInverterStatus.toNum(0).toString()
			: stateInverterStatus.toString();
	}

	const typeStatusGroups = inverterSettings.statusGroups;
	if (typeStatusGroups)
		for (const groupKey of Object.keys(typeStatusGroups)) {
			const info = typeStatusGroups[groupKey];
			const { states, color, message } = info;
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

	//Set Battery Status Message and dot for goodwe
	let batteryStateColour = 'transparent';
	let batteryStateMsg = '';
	let battery2StateColour = 'transparent';
	let battery2StateMsg = '';
	let battery3StateColour = 'transparent';
	let battery3StateMsg = '';
	let battery4StateColour = 'transparent';
	let battery4StateMsg = '';
	let battery1Found = false;
	let battery2Found = false;
	let battery3Found = false;
	let battery4Found = false;

	if (
		[
			InverterModel.GoodweGridMode,
			InverterModel.Goodwe,
			InverterModel.Huawei,
		].includes(inverterModel)
	) {
		const batStatusGroups = inverterSettings.batteryStatusGroups;

		if (batStatusGroups) {
			for (const groupKey of Object.keys(batStatusGroups)) {
				const info = batStatusGroups[groupKey];
				const { states, color, message } = info;

				// Check for stateBatteryStatus
				if (
					!battery1Found &&
					states.includes(stateBatteryStatus.state.toLowerCase())
				) {
					batteryStateColour = color;
					batteryStateMsg = message;
					battery1Found = true;
				}

				// Check for stateBattery2Status
				if (
					!battery2Found &&
					states.includes(stateBattery2Status.state.toLowerCase())
				) {
					battery2StateColour = color;
					battery2StateMsg = message;
					battery2Found = true;
				}
				// Check for stateBattery3Status
				if (
					!battery3Found &&
					states.includes(stateBattery3Status.state.toLowerCase())
				) {
					battery3StateColour = color;
					battery3StateMsg = message;
					battery3Found = true;
				}
				// Check for stateBattery4Status
				if (
					!battery4Found &&
					states.includes(stateBattery4Status.state.toLowerCase())
				) {
					battery4StateColour = color;
					battery4StateMsg = message;
					battery4Found = true;
				}

				// Break the loop if both batteries are found
				if (battery1Found && battery2Found && battery3Found && battery4Found)
					break;
			}
		}

		// Default logic for battery 1
		if (!battery1Found) {
			if (
				config.entities?.battery_status === 'none' ||
				!config.entities?.battery_status
			) {
				batteryStateColour = 'transparent';
				batteryStateMsg = '';
			} else {
				batteryStateColour = 'transparent';
				batteryStateMsg = 'Status';
			}
		}

		// Default logic for battery 2
		if (!battery2Found) {
			if (
				config.entities?.battery2_status === 'none' ||
				!config.entities?.battery2_status
			) {
				battery2StateColour = 'transparent';
				battery2StateMsg = '';
			} else {
				battery2StateColour = 'transparent';
				battery2StateMsg = 'Status';
			}
		}
		// Default logic for battery 2
		if (!battery3Found) {
			if (
				config.entities?.battery3_status === 'none' ||
				!config.entities?.battery3_status
			) {
				battery3StateColour = 'transparent';
				battery3StateMsg = '';
			} else {
				battery3StateColour = 'transparent';
				battery3StateMsg = 'Status';
			}
		}
		// Default logic for battery 2
		if (!battery4Found) {
			if (
				config.entities?.battery4_status === 'none' ||
				!config.entities?.battery4_status
			) {
				battery4StateColour = 'transparent';
				battery4StateMsg = '';
			} else {
				battery4StateColour = 'transparent';
				battery4StateMsg = 'Status';
			}
		}
	}

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
