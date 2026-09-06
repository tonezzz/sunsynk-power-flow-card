import {
	CSSResultGroup,
	LitElement,
	PropertyValues,
	TemplateResult,
} from 'lit';
import { cache } from 'lit/directives/cache.js';
import { keyed } from 'lit/directives/keyed.js';
import { customElement, property, query } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { styles } from './style';
import { CardStyle, sunsynkPowerFlowCardConfig } from './types';
import defaultConfig from './defaults';
import {
	CARD_VERSION,
	EDITOR_NAME,
	MAIN_NAME,
	Percentage,
	UnitOfElectricalCurrent,
	UnitOfEnergy,
	UnitOfPower,
} from './const';
import { localize } from './localize/localize';
import merge from 'lodash.merge';
import { Utils } from './helpers/utils';
import { fullCard } from './cards/full-card';
import { compactCard } from './cards/compact-card';
import { test2Card } from './cards/test2-card';
import { ss2Card } from './cards/ss2-card';
import { ss3Card } from './cards/ss3-card';
import { ss4Card } from './cards/ss4-card';
import { pfgCard } from './cards/pfg-card';
import { applyPreset } from './cards/pfg-presets';
import { buildData } from './data/build-data';
import { globalData } from './helpers/globals';
import {
	convertToCustomEntity,
	CustomEntity,
} from './inverters/dto/custom-entity';

console.groupCollapsed(
	`%c ⚡ SUNSYNK-POWER-FLOW-CARD %c ${localize('common.version')}: ${CARD_VERSION} `,
	'color: orange; font-weight: bold; background: black',
	'color: white; font-weight: bold; background: dimgray',
);
console.log('Readme:', 'https://github.com/slipx06/sunsynk-power-flow-card');
console.groupEnd();

@customElement(MAIN_NAME)
export class SunsynkPowerFlowCard extends LitElement {
	// Coalesced Home Assistant state: throttle updates to once per animation frame
	@property({ attribute: false })
	public get hass(): HomeAssistant {
		return this._hass!;
	}
	public set hass(value: HomeAssistant) {
		const old = this._hass;
		this._hass = value;
		// Schedule a single update in the next animation frame to coalesce bursts
		this._scheduleUpdateFromHass(old);
	}
	@property() _config!: sunsynkPowerFlowCardConfig;
	@query('#grid-flow') gridFlow?: SVGSVGElement;
	@query('#grid1-flow') grid1Flow?: SVGSVGElement;
	@query('#solar-flow') solarFlow?: SVGSVGElement;
	@query('#pv1-flow') pv1Flow?: SVGSVGElement;
	@query('#pv2-flow') pv2Flow?: SVGSVGElement;
	@query('#pv3-flow') pv3Flow?: SVGSVGElement;
	@query('#pv4-flow') pv4Flow?: SVGSVGElement;
	@query('#pv5-flow') pv5Flow?: SVGSVGElement;
	@query('#pv6-flow') pv6Flow?: SVGSVGElement;
	@query('#battery-flow') batteryFlow?: SVGSVGElement;
	@query('#load-flow') loadFlow?: SVGSVGElement;
	@query('#aux-flow') auxFlow?: SVGSVGElement;
	@query('#ne-flow') neFlow?: SVGSVGElement;
	@query('#ne1-flow') ne1Flow?: SVGSVGElement;

	// Visibility/animation management
	private _intersection?: IntersectionObserver;
	private _onVisibilityChange?: () => void;
	private _onResize?: () => void;
	private _animationsPaused = false;
	private _isVisible = true;

	// Internal backing field for hass and rAF-based coalescing state
	private _hass?: HomeAssistant;
	private _updateScheduled = false;
	private _rafId = 0;
	private _timeoutId: number | undefined;

	private durationPrev: { [name: string]: number } = {};
	durationCur: { [name: string]: number } = {};
	// Batch animation speed changes to minimize DOM work
	private _pendingSpeedUpdates: Map<string, number> = new Map();
	private _speedRafId: number | null = null;

	// Per-render memoization cache for dynamic line widths
	private _lineWidthCache: Map<string, number> = new Map();

	// Performance: track only entities we care about and last seen states
	private _trackedEntityIds: Set<string> = new Set();
	private _lastEntityStates: Map<string, string> = new Map();
	// Per-render cache to avoid repeated convertToCustomEntity work
	private _entityCache: Map<string, CustomEntity> = new Map();
	// Cache for colour conversions
	private _colorCache: Map<string, string> = new Map();

	// Track last seen HA theme to refresh theme-dependent colours
	private _lastTheme: string | undefined;

	// Store setConfig errors so they render in the card instead of "Configuration error"
	private _error?: string;

	// Precomputed config-derived constants for faster renders
	_computed: {
		grid: {
			importColour: string;
			exportColour: string;
			noGridColour: string;
			offThreshold: number;
		};
		load: {
			invertLoad: boolean;
		};
	} = {
		grid: {
			importColour: '#00ffff',
			exportColour: '#00ffff',
			noGridColour: '#00ffff',
			offThreshold: 0,
		},
		load: {
			invertLoad: false,
		},
	};

	static get styles(): CSSResultGroup {
		return styles;
	}

	// Schedule a requestUpdate on the next animation frame to batch rapid hass changes
	private _scheduleUpdateFromHass(old?: HomeAssistant): void {
		if (this._updateScheduled) return;
		this._updateScheduled = true;
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			this._updateScheduled = false;
			if (this._timeoutId !== undefined) {
				clearTimeout(this._timeoutId);
				this._timeoutId = undefined;
			}
			super.requestUpdate('hass', old);
		};
		this._rafId = window.requestAnimationFrame(() => {
			finish();
		});
		// Fallback: cap max delay when rAF is throttled (e.g., background tabs)
		this._timeoutId = window.setTimeout(() => {
			// Cancel pending rAF if any, we'll finish via timeout
			if (this._rafId) {
				cancelAnimationFrame(this._rafId);
				this._rafId = 0;
			}
			finish();
		}, 50);
	}

	// Only re-render when config changes or any tracked entity state changes
	protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
		// Always update if first render
		if (!this._lastEntityStates.size) {
			return true;
		}

		// If hass changed, compare tracked entity states
		if (changedProps.has('hass')) {
			// Skip hass-driven rerenders while the card is not visible
			if (!this._isVisible) return false;
			if (this._trackedEntityIds.size === 0) return true; // nothing tracked yet
			let changed = false;
			for (const id of this._trackedEntityIds) {
				const cur = this.hass?.states?.[id]?.state ?? '';
				const prev = this._lastEntityStates.get(id) ?? '';
				if (cur !== prev) {
					changed = true;
					break;
				}
			}
			return changed;
		}

		return true;
	}

	// Ensure we cancel any pending animation frame/timeout when detached
	public disconnectedCallback(): void {
		if (this._rafId) {
			cancelAnimationFrame(this._rafId);
			this._rafId = 0;
			this._updateScheduled = false;
		}
		if (this._timeoutId !== undefined) {
			clearTimeout(this._timeoutId);
			this._timeoutId = undefined;
		}
		// Clean up visibility listeners/observers
		if (this._intersection) {
			this._intersection.disconnect();
			this._intersection = undefined;
		}
		if (this._onVisibilityChange) {
			document.removeEventListener(
				'visibilitychange',
				this._onVisibilityChange,
			);
			this._onVisibilityChange = undefined;
		}
		if (this._onResize) {
			window.removeEventListener('resize', this._onResize);
			this._onResize = undefined;
		}
		super.disconnectedCallback();
	}

	public connectedCallback(): void {
		super.connectedCallback();
		// Re-render on resize so responsive pfg_spans re-resolve
		if (!this._onResize) {
			this._onResize = () => this.requestUpdate();
			window.addEventListener('resize', this._onResize);
		}
		// Observe visibility of the card element in the viewport
		if (this._intersection) this._intersection.disconnect();
		this._intersection = new IntersectionObserver(
			(entries) => {
				const visible = entries[0]?.isIntersecting ?? true;
				this._isVisible = visible;
				if (visible) {
					this._resumeAnimations();
					// Ensure we render any queued updates once visible again
					this.requestUpdate();
				} else {
					this._pauseAnimations();
				}
			},
			{ root: null, rootMargin: '0px', threshold: 0.01 },
		);
		this._intersection.observe(this);

		// Also react to page/tab visibility
		this._onVisibilityChange = () => {
			const visible = document.visibilityState === 'visible';
			this._isVisible = visible;
			if (visible) {
				this._resumeAnimations();
				this.requestUpdate();
			} else {
				this._pauseAnimations();
			}
		};
		document.addEventListener('visibilitychange', this._onVisibilityChange);
	}

	private _forEachFlow(fn: (el: SVGSVGElement) => void): void {
		const flows = [
			this.gridFlow,
			this.grid1Flow,
			this.solarFlow,
			this.pv1Flow,
			this.pv2Flow,
			this.pv3Flow,
			this.pv4Flow,
			this.pv5Flow,
			this.pv6Flow,
			this.batteryFlow,
			this.loadFlow,
			this.auxFlow,
			this.neFlow,
			this.ne1Flow,
		];
		for (const f of flows) {
			if (f) fn(f);
		}
	}

	private _pauseAnimations(): void {
		if (this._animationsPaused) return;
		this._forEachFlow((f) => {
			try {
				f.pauseAnimations();
			} catch {
				/* noop */
			}
		});
		this._animationsPaused = true;
	}

	private _resumeAnimations(): void {
		if (!this._animationsPaused) return;
		this._forEachFlow((f) => {
			try {
				f.unpauseAnimations();
			} catch {
				/* noop */
			}
		});
		this._animationsPaused = false;
		// Apply any pending speed updates immediately after resuming
		if (this._pendingSpeedUpdates.size > 0) {
			this._flushAnimationSpeedUpdates();
		}
	}

	// Safely read the current HA theme name without strict typing issues
	private getCurrentThemeName(): string {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const theme = (this.hass as any)?.themes?.theme;
		return typeof theme === 'string' ? theme : '';
	}

	public static async getConfigElement() {
		await import('./editor');
		return document.createElement(EDITOR_NAME) as LovelaceCardEditor;
	}

	static getStubConfig() {
		return {
			cardstyle: CardStyle.Lite,
			show_solar: true,
			battery: {
				energy: 0,
				shutdown_soc: 20,
				show_daily: true,
			},
			solar: {
				show_daily: true,
				mppts: 2,
			},
			load: {
				show_daily: true,
			},
			grid: {
				show_daily_buy: true,
				show_daily_sell: false,
				show_nonessential: true,
			},
			entities: {
				use_timer_248: 'switch.sunsynk_toggle_system_timer',
				priority_load_243: 'switch.sunsynk_toggle_priority_load',
				inverter_voltage_154: 'sensor.sunsynk_inverter_voltage',
				load_frequency_192: 'sensor.sunsynk_load_frequency',
				inverter_current_164: 'sensor.sunsynk_inverter_current',
				inverter_power_175: 'sensor.sunsynk_inverter_power',
				grid_connected_status_194:
					'binary_sensor.sunsynk_grid_connected_status',
				inverter_status_59: 'sensor.sunsynk_overall_state',
				day_battery_charge_70: 'sensor.sunsynk_day_battery_charge',
				day_battery_discharge_71: 'sensor.sunsynk_day_battery_discharge',
				battery_voltage_183: 'sensor.sunsynk_battery_voltage',
				battery_soc_184: 'sensor.sunsynk_battery_soc',
				battery_power_190: 'sensor.sunsynk_battery_power',
				battery_current_191: 'sensor.sunsynk_battery_current',
				grid_power_169: 'sensor.sunsynk_grid_power',
				day_grid_import_76: 'sensor.sunsynk_day_grid_import',
				day_grid_export_77: 'sensor.sunsynk_day_grid_export',
				grid_ct_power_172: 'sensor.sunsynk_grid_ct_power',
				day_load_energy_84: 'sensor.sunsynk_day_load_energy',
				essential_power: 'none',
				nonessential_power: 'none',
				aux_power_166: 'sensor.sunsynk_aux_power',
				day_pv_energy_108: 'sensor.sunsynk_day_pv_energy',
				pv1_power_186: 'sensor.sunsynk_pv1_power',
				pv2_power_187: 'sensor.sunsynk_pv2_power',
				pv1_voltage_109: 'sensor.sunsynk_pv1_voltage',
				pv1_current_110: 'sensor.sunsynk_pv1_current',
				pv2_voltage_111: 'sensor.sunsynk_pv2_voltage',
				pv2_current_112: 'sensor.sunsynk_pv2_current',
			},
		} as unknown as sunsynkPowerFlowCardConfig;
	}

	render() {
		if (this._error) {
			console.error('sunsynk config error:', this._error);
			return null;
		}
		try {
			// Clear per-render caches
			this._lineWidthCache.clear();
			// Clear per-render cache and rebuild tracked entities for this render
			this._entityCache.clear();
			this._trackedEntityIds.clear();
			globalData.hass = this.hass;
			const config = this._config;
			const { data, inverterImg } = buildData(this);

			let template: TemplateResult | null = null;
			let variantKey:
				| 'full'
				| 'compact'
				| 'test2'
				| 'ss2'
				| 'ss3'
				| 'ss4'
				| 'pfg'
				| 'pfg2'
				| undefined;
			if (this.isFullCard) {
				variantKey = 'full';
				template = fullCard(config, inverterImg, data);
			} else if (this.isTest2Card) {
				variantKey = 'test2';
				template = test2Card(config, inverterImg, data);
			} else if (this.isSs2Card) {
				variantKey = 'ss2';
				template = ss2Card(config, inverterImg, data);
			} else if (this.isSs3Card) {
				variantKey = 'ss3';
				template = ss3Card(config, inverterImg, data);
			} else if (this.isSs4Card) {
				variantKey = 'ss4';
				template = ss4Card(config, inverterImg, data);
			} else if (this.isPfgCard) {
				variantKey = 'pfg';
				template = pfgCard(config, inverterImg, data, this.hass);
			} else if (this.isPfg2Card) {
				variantKey = 'pfg2';
				template = pfgCard(
					{ ...config, pfg_grid_size: config.pfg_grid_size ?? 15 },
					inverterImg,
					data,
					this.hass,
				);
			} else if (this.isLiteCard || this.isCompactCard) {
				variantKey = 'compact';
				template = compactCard(config, inverterImg, data);
			}

			if (template && variantKey) {
				return cache(keyed(variantKey, template));
			}

			return template ?? null;
		} catch (err) {
			console.error('sunsynk render error:', err);
			return null;
		}
	}

	/**
	 * Fetches the entity object, returned the defaultValue when the entity is not found. Pass null for no default.
	 * @param entity
	 * @param defaultValue
	 * @param decimals used in toDisplay
	 * @param measurement used in toDisplay
	 */
	getEntity(
		entity: keyof sunsynkPowerFlowCardConfig,
		defaultValue: Partial<CustomEntity> | null = {
			state: '0',
			attributes: { unit_of_measurement: '' },
		},
		decimals = 0,
		measurement:
			| UnitOfPower
			| UnitOfEnergy
			| UnitOfElectricalCurrent
			| Percentage
			| 'NA' = 'NA',
	): CustomEntity {
		// Per-render cache key keeps conversion stable across multiple calls this render
		const cacheKey = `${String(entity)}|${decimals}|${String(measurement)}`;
		const cached = this._entityCache.get(cacheKey);
		if (cached) return cached;

		let entityString: string | undefined;
		const props = String(entity).split('.');
		if (props.length > 1) {
			const group = props[0];
			const key = props[1];
			const groupObj = (this._config as unknown as Record<string, unknown>)[
				group
			] as Record<string, unknown> | undefined;
			const value = groupObj ? (groupObj[key] as unknown) : undefined;
			entityString = typeof value === 'string' ? value : undefined;
		} else if (props.length > 0) {
			const group = props[0];
			const value = (this._config as unknown as Record<string, unknown>)[
				group
			] as unknown;
			entityString = typeof value === 'string' ? value : undefined;
		}

		// Track real HA entities only (ignore 'none' or empty)
		if (entityString && entityString !== 'none') {
			this._trackedEntityIds.add(entityString);
		}

		const haState = entityString ? this.hass.states[entityString] : undefined;

		// Track entity ids actually used during this render so shouldUpdate can be precise
		if (entityString) {
			this._trackedEntityIds.add(entityString);
		}
		const converted = (
			haState !== undefined
				? convertToCustomEntity(haState, measurement, decimals)
				: defaultValue
					? convertToCustomEntity(defaultValue, measurement, decimals)
					: convertToCustomEntity({ state: undefined }, measurement, decimals)
		) as CustomEntity;

		// Update last seen state for tracked entities
		if (entityString && haState !== undefined) {
			this._lastEntityStates.set(entityString, String(haState.state ?? ''));
		}

		this._entityCache.set(cacheKey, converted);
		return converted;
	}

	changeAnimationSpeed(el: string, speedRaw: number) {
		const speed = speedRaw >= 1 ? Utils.toNum(speedRaw, 3) : 1;
		this.durationCur[el] = speed;
		const prev = this.durationPrev[el] ?? 1;
		// If unchanged, avoid enqueueing work
		if (prev === speed) {
			this._pendingSpeedUpdates.delete(el);
			return;
		}
		// Defer DOM mutation: queue update and flush once per frame
		if (this._isVisible) {
			this._pendingSpeedUpdates.set(el, speed);
			if (this._speedRafId == null) {
				this._speedRafId = requestAnimationFrame(() => {
					this._flushAnimationSpeedUpdates();
				});
			}
		} else {
			// If hidden, just record the new duration; apply when visible
			this.durationPrev[el] = this.durationCur[el];
		}
	}

	private _flushAnimationSpeedUpdates() {
		this._speedRafId = null;
		if (!this._isVisible || this._pendingSpeedUpdates.size === 0) {
			this._pendingSpeedUpdates.clear();
			return;
		}
		for (const [el, speed] of this._pendingSpeedUpdates) {
			const flow = this[`${el}Flow`] as SVGSVGElement | undefined;
			const prev = this.durationPrev[el] ?? 1;
			if (flow && prev !== speed) {
				try {
					flow.setCurrentTime(flow.getCurrentTime() * (speed / prev));
				} catch {
					// ignore if SVG is not ready
				}
			}
			this.durationPrev[el] = this.durationCur[el];
		}
		this._pendingSpeedUpdates.clear();
	}

	get isCompactCard() {
		return this._config.cardstyle == CardStyle.Compact;
	}

	get isLiteCard() {
		return this._config.cardstyle == CardStyle.Lite;
	}

	get isFullCard() {
		return this._config.cardstyle == CardStyle.Full;
	}

	get isTest2Card() {
		return this._config.cardstyle == CardStyle.Test2;
	}

	get isSs2Card() {
		return this._config.cardstyle == CardStyle.Ss2;
	}

	get isSs3Card() {
		return this._config.cardstyle == CardStyle.Ss3;
	}

	get isSs4Card() {
		return this._config.cardstyle == CardStyle.Ss4;
	}

	get isPfgCard() {
		return this._config.cardstyle == CardStyle.PFG;
	}

	get isPfg2Card() {
		return this._config.cardstyle == CardStyle.PFG2;
	}

	colourConvert(colour: string) {
		const key = Array.isArray(colour) ? `arr:${colour}` : `str:${colour}`;
		const cached = this._colorCache.get(key);
		if (cached) return cached;
		let converted: string;
		if (colour && Array.isArray(colour)) {
			converted = Utils.toHexColor(`rgb(${colour})`);
		} else {
			converted = Utils.toHexColor(colour);
		}
		this._colorCache.set(key, converted);
		return converted;
	}

	dynamicLineWidth(
		power: number,
		maxpower: number,
		width: number,
		defaultLineWidth: number = 1,
	) {
		const key = `${power}|${maxpower}|${width}|${defaultLineWidth}|${this._config.dynamic_line_width ? 1 : 0}`;
		const cached = this._lineWidthCache.get(key);
		if (cached !== undefined) return cached;

		let lineWidth: number;
		// Check if dynamic_line_width is disabled in the config
		if (!this._config.dynamic_line_width) {
			lineWidth = Math.min(defaultLineWidth, 8);
		} else {
			lineWidth = Math.min(
				defaultLineWidth + Math.min(power / Math.max(maxpower, 1), 1) * width,
				8,
			);
		}

		this._lineWidthCache.set(key, lineWidth);
		return lineWidth;
	}

	calculateAuxLoadColour(state, threshold) {
		return !this._config.load.aux_dynamic_colour
			? this.colourConvert(this._config.load?.aux_colour)
			: Math.abs(state) > threshold
				? this.colourConvert(this._config.load?.aux_colour)
				: 'grey';
	}

	//calculateEssentialLoadColour(state, threshold) {
	//    return !this._config.load.dynamic_colour
	//        ? this.colourConvert(this._config.load?.colour)
	//        : Math.abs(state) > threshold
	//            ? this.colourConvert(this._config.load?.colour)
	//            : this.colourConvert(this._config.load?.off_colour) || 'grey';
	//}

	calculateEssentialLoadColour(
		state: number,
		threshold: number,
		maxThreshold: number,
	): string {
		if (!this._config.load.dynamic_colour) {
			// If dynamic colour is disabled, return the default colour
			return this.colourConvert(this._config.load?.colour);
		}

		if (Math.abs(state) > maxThreshold) {
			// If the state exceeds the max threshold, return the max colour
			return this.colourConvert(this._config.load?.max_colour);
		}

		if (Math.abs(state) > threshold) {
			// If the state exceeds the regular threshold, return the default colour
			return this.colourConvert(this._config.load?.colour);
		}

		// If the state is below the threshold, return the off colour or grey
		return this.colourConvert(this._config.load?.off_colour) || 'grey';
	}

	setConfig(config) {
		config = applyPreset(config);
		try {
			if (config.show_battery && !config.battery) {
				throw Error(localize('errors.battery.bat'));
			} else {
				if (config.show_battery && !config.battery.shutdown_soc) {
					throw new Error(localize('errors.battery.shutdown_soc'));
				}
				if (
					config.show_battery &&
					config.battery.show_daily &&
					(!config.entities.day_battery_charge_70 ||
						!config.entities.day_battery_discharge_71)
				) {
					throw Error(localize('errors.battery.show_daily'));
				}
			}
			if (config.show_solar && !config.solar) {
				throw Error(localize('errors.solar.sol'));
			} else {
				if (config.show_solar && !config.solar.mppts) {
					throw Error(localize('errors.solar.mppts'));
				}
				if (
					config &&
					config.solar &&
					config.show_solar &&
					config.solar.show_daily &&
					!config.entities.day_pv_energy_108
				) {
					throw Error(localize('errors.solar.show_daily'));
				}
			}

			if (
				(config &&
					config.grid &&
					config.grid.show_daily_buy &&
					!config.entities.day_grid_import_76) ||
				(config &&
					config.grid &&
					config.grid.show_daily_sell &&
					!config.entities.day_grid_export_77)
			) {
				throw Error(localize('errors.grid.show_daily'));
			}

			if (
				(config &&
					config.entities &&
					config.entities.essential_power === 'none' &&
					!config.entities.inverter_power_175) ||
				(config &&
					config.entities &&
					config.entities.essential_power === 'none' &&
					config.entities.inverter_power_175 === 'none')
			) {
				throw Error(localize('errors.essential_power'));
			}

			if (
				config &&
				config.entities &&
				config.entities.nonessential_power === 'none' &&
				!config.entities.grid_power_169
			) {
				throw Error(localize('errors.nonessential_power'));
			}

			const all_attributes = [
				'battery_soc_184',
				'battery_power_190',
				'battery_current_191',
				'grid_ct_power_172',
				'pv1_power_186',
			];

			for (const attr of all_attributes) {
				if (
					attr === 'pv1_power_186' &&
					config.show_solar &&
					!config.entities[attr] &&
					!config.entities[attr]
				) {
					throw new Error(
						`${localize('errors.missing_entity')} e.g: ${attr}: sensor.example`,
					);
				}
			}

			const customConfig: sunsynkPowerFlowCardConfig = config;

			this._config = merge({}, defaultConfig, customConfig);

			// Precompute frequently used config-derived values
			const cfg = this._config;
			const importColour = this.colourConvert(cfg.grid?.colour);
			const exportColour = this.colourConvert(
				cfg.grid?.export_colour || importColour,
			);
			const noGridColour = this.colourConvert(
				cfg.grid?.no_grid_colour || importColour,
			);
			const offThreshold = Utils.toNum(cfg.grid?.off_threshold, 0);
			const invertLoad = !!cfg.load?.invert_load;
			this._computed = {
				grid: { importColour, exportColour, noGridColour, offThreshold },
				load: { invertLoad },
			};

			// Record current theme so we can detect changes later
			this._lastTheme = this.getCurrentThemeName();

			// Reset runtime caches on config change
			this._lastEntityStates.clear();
			this._trackedEntityIds.clear();
			this._entityCache.clear();
			this._colorCache.clear();

			this.requestUpdate();
		} catch (err) {
			this._error = String(err);
			console.error(err);
			this._config = this._config ?? merge({}, defaultConfig);
			this.requestUpdate();
		}
	}

	getCardSize() {
		return this._config?.cardstyle === 'test2' ? 10 : 2;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).customCards.push({
	type: 'sunsynk-power-flow-card',
	name: 'Sunsynk Power Flow Card',
	preview: true,
	description: localize('common.description'),
	configurable: true,
});
