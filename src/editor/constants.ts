// Editor constants: colour-name map, helper-text map, label patterns —
// extracted from editor.ts to keep the class focused.

export const LABEL_CACHE = new Map<string, string>();

// Static color name mapping (avoid recreating on every call)
export const COLOR_NAME_MAP: Record<string, string> = {
	grey: '#9e9e9e',
	gray: '#9e9e9e',
	pink: '#ffc0cb',
	orange: '#ffa500',
	red: '#ff0000',
	green: '#008000',
	blue: '#0000ff',
	yellow: '#ffff00',
	purple: '#800080',
	black: '#000000',
	white: '#ffffff',
};

// Precompiled regex patterns for helper text matching (avoid recreating on every call)
export const PATTERN_LOAD_NAME = /^load\d+_name$/;
export const PATTERN_LOAD_ICON = /^load\d+_icon$/;
export const PATTERN_LOAD_SWITCH = /^load\d+_switch$/;
export const PATTERN_LOAD_THRESHOLD = /^load\d+_max_threshold$/;
export const PATTERN_AUX_LOAD_NAME = /^aux_load\d+_name$/;
export const PATTERN_AUX_LOAD_ICON = /^aux_load\d+_icon$/;
export const PATTERN_PV_NAME = /^pv[1-6]_name$/;
export const PATTERN_SHOW_SECTION =
	/^show_(inverter|battery|battery2|solar|load|grid)$/;
export const PATTERN_SHOW_DAILY = /^show_daily(_.*)?$/;
export const PATTERN_ANY_NAME = /^.*_name$/;
export const PATTERN_DYNAMIC_ICON = /dynamic_icon$/;
export const PATTERN_ANY_SWITCH = /^.*_switch$/;
export const PATTERN_MAX_THRESHOLD = /^.*_max_threshold$/;
export const PATTERN_DYNAMIC_COLOUR = /dynamic_colour$/;
export const PATTERN_ANY_COLOUR = /^.*_colour$/;
export const PATTERN_OFF_COLOUR = /^.*_off_colour$/;
export const PATTERN_MAX_POWER = /^.*_max_power$/;

// Precompiled regex for color normalization
export const PATTERN_COLOUR_SUFFIX = /colour$/i;
export const PATTERN_DYNAMIC_COLOUR_SUFFIX = /dynamic_colour$/i;

// Static lookup for help text (faster than switch-case)
export const HELP_TEXT: Record<string, string> = {
	large_font: 'Use a larger font for card entities.',
	wide: 'Use a wide layout for the card.',
	additional_loads: 'Number of additional loads to configure (0–6).',
	colour: 'Primary colour for this element.',
	efficiency:
		'Show the effeciency of the mppts strings based on their max power.',
	display_mode: 'Chose how to display solar information next to the sun icon.',
	custom_label: 'Custom label shown in the UI.',
	label_daily_grid_buy: 'Label for daily grid buy.',
	label_daily_grid_sell: 'Label for daily grid sell.',
	count: 'Number of batteries to display.',
	energy: 'Total available energy of the battery in Wh.',
	shutdown_soc: 'State of charge below which the battery is considered off.',
	shutdown_soc_offgrid:
		'State of charge below which the battery is considered off when off-grid.',
	soc_end_of_charge:
		'State of charge at which the battery is considered fully charged.',
	invert_power: 'Invert the direction of power flow animation.',
	hide_soc: 'Hide additional current program capacity (SOC) or shutdown SOC.',
	show_absolute: 'Show absolute values for power.',
	show_remaining_energy: 'Show remaining energy of the battery.',
	remaining_energy_to_shutdown:
		'Show remaining energy of the battery until it shuts down.',
	invert_flow: 'Invert the direction of power flow.',
	linear_gradient: 'Display battery SOC as a linear gradient.',
	invert_load:
		'Set to true if your sensor provides a negative number when the load is drawing power',
	modern: 'Change inverter icon.',
	invert_grid:
		'Enable if your sensor provides a negative number for grid import and positive number for grid export.',
	aux_loads: 'Number of auxiliary loads to configure (0–2).',
	show_nonessential: 'Show non-essential loads.',
	show_aux: 'Show the Aux subsection (separate auxiliary load configuration).',
	label_daily_load:
		'Alternate label for the daily load value displayed under Load.',
	label_daily_chrg:
		'Alternate label for the daily charge value displayed under Battery.',
	label_daily_dischrg:
		'Alternate label for the daily discharge value displayed under Battery.',
	label_autarky:
		'Alternate label for the autarky value displayed under Inverter.',
	label_ratio: 'Alternat label for the ratio value displayed under Inverter.',
	navigate: 'Optional navigation path to open when the icon is clicked.',
	import_icon:
		'Icon shown for the import flow. Can be set using a template sensor.',
	export_icon:
		'Icon shown for the export flow. Can be set using a template sensor.',
	disconnected_icon:
		'Icon shown when the grid is disconnected. Can be set using a template sensor.',
	aux_name: 'Aux group title shown in the UI.',
	aux_daily_name: 'Label used for daily Aux value.',
	aux_type: 'Icon shown for the Aux group.',
	invert_aux: 'Invert the direction of Aux flow arrows.',
	show_absolute_aux: 'Show Aux values as absolute (no sign) for clarity.',
	aux_dynamic_colour:
		'Aux elements on the card will be greyed out if aux power is 0.',
	aux_colour: 'Primary colour for Aux flow.',
	aux_off_colour: 'Colour used when Aux path is off/idle.',
	show_daily_aux: 'Display daily Aux energy beneath the Aux section.',
	decimal_places: 'Number of decimal places for power values (0-3).',
	decimal_places_energy: 'Number of decimal places for energy values (0-3).',
	soc_decimal_places: 'Decimal places for State of Charge display (0-3).',
	dynamic_line_width:
		'Animate line widths based on power level. Disable for a flatter look.',
	animation_speed: 'Adjusts the speed of flow animations. Higher = faster.',
	off_threshold: 'Below this power value the path is considered off/idle.',
	path_threshold:
		'The colour of the path will change to the source colour if the percentage supply by a single source equals or exceeds this value.',
	max_power: 'Optional cap used for scaling and progress calculations.',
	title_size: "CSS font-size for title, e.g. '1.2em' or '18px'.",
	card_height:
		'Card height: text value (e.g. 360) or an entity providing a numeric height.',
	card_width:
		'Card width: text value (e.g. 640) or an entity providing a numeric width.',
	center_no_grid:
		'When Grid is hidden, shift and narrow the view to center Solar/Battery/Loads.',
};
