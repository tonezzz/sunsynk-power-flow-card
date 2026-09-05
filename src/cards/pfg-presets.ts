import { sunsynkPowerFlowCardConfig } from '../types';

// Standard entity/section defaults shared by the pfg test views (pf3/pfg family).
// Use `preset: pfg` in a card config to inherit these; per-section keys in the
// card config override the preset (shallow merge per section).
export const PFG_PRESETS: Record<string, Record<string, unknown>> = {
	pfg: {
		inverter: {
			model: 'solis',
			modern: false,
			colour: '#FFFFFF',
			autarky: 'no',
		},
		solar: {
			mppts: 2,
			show_daily: false,
			colour: '#FFD700',
			animation_speed: 9,
			max_power: 9600,
			pv1_name: 'West',
			pv2_name: 'North',
		},
		battery: {
			energy: 14280,
			shutdown_soc: 20,
			show_daily: true,
			colour: '#00E676',
			animation_speed: 6,
			max_power: 10000,
			count: 4,
			invert_power: true,
			show_absolute: true,
		},
		battery2: {
			energy: 14280,
			shutdown_soc: 20,
			show_daily: false,
			show_remaining_energy: false,
			colour: '#00E676',
			invert_power: true,
			show_absolute: true,
		},
		battery3: {
			energy: 14280,
			shutdown_soc: 20,
			show_daily: false,
			show_remaining_energy: true,
			colour: '#00E676',
			invert_power: true,
			show_absolute: true,
		},
		battery4: {
			energy: 14280,
			shutdown_soc: 20,
			show_daily: false,
			show_remaining_energy: true,
			colour: '#00E676',
			invert_power: true,
			show_absolute: true,
		},
		load: {
			show_aux: false,
			show_daily: true,
			animation_speed: 8,
			max_power: 6000,
			additional_loads: 2,
			load2_name: 'Geyser',
			load2_icon: 'mdi:heating-coil',
			load1_name: 'Pool',
			load1_icon: 'mdi:pool',
			colour: '#FFFFFF',
		},
		grid: {
			show_daily_buy: true,
			no_grid_colour: '#FF1744',
			animation_speed: 8,
			max_power: 6000,
			invert_grid: true,
		},
		entities: {
			dc_transformer_temp_90: 'sensor.inverters_1_temperature',
			day_battery_charge_70:
				'sensor.solis_s6_eh3p10k_h_zp_today_battery_charge_energy',
			day_battery_discharge_71:
				'sensor.solis_s6_eh3p10k_h_zp_today_battery_discharge_energy',
			day_load_energy_84:
				'sensor.solis_s6_eh3p10k_h_zp_today_energy_consumption',
			day_grid_import_76: 'none',
			day_grid_export_77: 'none',
			day_pv_energy_108: 'none',
			inverter_voltage_154: 'sensor.inverters_1_ac_output_voltage',
			load_frequency_192: 'sensor.inverters_1_grid_frequency',
			inverter_current_164: 'sensor.inverters_1_load_current_essential_1',
			inverter_power_175: 'sensor.inverters_1_load_power',
			grid_power_169: 'sensor.inverters_1_grid_power',
			battery_voltage_183: 'sensor.totals_battery_voltage',
			battery_soc_184: 'sensor.totals_battery_state_of_charge',
			battery_power_190: 'sensor.totals_battery_power',
			battery_current_191: 'sensor.totals_battery_current',
			battery_current_direction: 'sensor.inverters_1_battery_direction',
			essential_power: 'sensor.inverters_1_load_power_essential',
			grid_ct_power_172: 'sensor.inverters_1_grid_power_ld',
			pv1_voltage_109: 'sensor.inverters_1_pv_voltage_1',
			pv1_current_110: 'sensor.inverters_1_pv_current_1',
			pv1_power_186: 'sensor.inverters_1_pv_power_1',
			pv2_voltage_111: 'sensor.inverters_1_pv_voltage_2',
			pv2_current_112: 'sensor.inverters_1_pv_current_2',
			pv2_power_187: 'sensor.inverters_1_pv_power_2',
			pv_total: 'sensor.inverters_1_pv_power',
			grid_voltage: 'sensor.inverters_1_grid_voltage',
			inverter_status_59: 'sensor.inverters_1_inverter_mode',
			remaining_solar: 'none',
			battery1_voltage_183: 'sensor.batteries_1_voltage',
			battery1_soc_184: 'sensor.batteries_1_state_of_charge',
			battery1_power_190: 'sensor.batteries_1_power',
			battery1_current_191: 'sensor.batteries_1_current',
			battery2_voltage_183: 'sensor.batteries_1_voltage',
			battery2_soc_184: 'sensor.batteries_1_state_of_charge',
			battery2_power_190: 'sensor.battery_1_calculated_power',
			battery2_current_191: 'sensor.battery_1_calculated_current',
			battery3_voltage_183: 'sensor.batteries_2_voltage',
			battery3_soc_184: 'sensor.batteries_2_state_of_charge',
			battery3_power_190: 'sensor.batteries_2_power',
			battery3_current_191: 'sensor.batteries_2_current',
			battery4_voltage_183: 'sensor.batteries_3_voltage',
			battery4_soc_184: 'sensor.batteries_3_state_of_charge',
			battery4_power_190: 'sensor.batteries_3_power',
			battery4_current_191: 'sensor.batteries_3_current',
		},
		large_font: true,
		show_solar: true,
	},
};

const SECTION_KEYS = [
	'inverter',
	'solar',
	'battery',
	'battery2',
	'battery3',
	'battery4',
	'load',
	'grid',
	'entities',
];

export function applyPreset(
	config: sunsynkPowerFlowCardConfig,
): sunsynkPowerFlowCardConfig {
	const preset = (config as unknown as Record<string, unknown>).preset as
		string | undefined;
	if (!preset || !PFG_PRESETS[preset]) return config;
	const p = PFG_PRESETS[preset] as Record<string, unknown>;
	const merged: Record<string, unknown> = {
		...p,
		...(config as unknown as Record<string, unknown>),
	};
	for (const k of SECTION_KEYS) {
		merged[k] = {
			...((p[k] as Record<string, unknown>) || {}),
			...(((config as unknown as Record<string, unknown>)[k] as Record<
				string,
				unknown
			>) || {}),
		};
	}
	return merged as unknown as sunsynkPowerFlowCardConfig;
}
