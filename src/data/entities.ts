// Entity resolution extracted from build-data.ts.
// Every `state*`/`_state*` lookup lives here so buildData() stays readable.
// Returns are destructured by buildData() — keep names stable.

import { SunsynkPowerFlowCard } from '../index';
import { Percentage } from '../const';

export function resolveEntities(card: SunsynkPowerFlowCard) {
	const config = card._config;

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

	return {
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
	};
}
