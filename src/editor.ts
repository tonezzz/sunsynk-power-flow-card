import {
	COLOR_NAME_MAP,
	HELP_TEXT,
	LABEL_CACHE,
	PATTERN_ANY_COLOUR,
	PATTERN_ANY_NAME,
	PATTERN_ANY_SWITCH,
	PATTERN_AUX_LOAD_ICON,
	PATTERN_AUX_LOAD_NAME,
	PATTERN_COLOUR_SUFFIX,
	PATTERN_DYNAMIC_COLOUR,
	PATTERN_DYNAMIC_COLOUR_SUFFIX,
	PATTERN_DYNAMIC_ICON,
	PATTERN_LOAD_ICON,
	PATTERN_LOAD_NAME,
	PATTERN_LOAD_SWITCH,
	PATTERN_LOAD_THRESHOLD,
	PATTERN_MAX_POWER,
	PATTERN_MAX_THRESHOLD,
	PATTERN_OFF_COLOUR,
	PATTERN_PV_NAME,
	PATTERN_SHOW_DAILY,
	PATTERN_SHOW_SECTION,
} from './editor/constants';
import { _toFiniteNum, _clamp255, _getStr } from './editor/utils';
import { buildEditorSchema } from './editor/schema';
import { html, css, LitElement, TemplateResult } from 'lit';
import {
	fireEvent,
	HomeAssistant,
	LovelaceCardEditor,
} from 'custom-card-helpers';

import { sunsynkPowerFlowCardConfig } from './types';
import { customElement, property } from 'lit/decorators.js';
import { localize } from './localize/localize';
import defaults from './defaults';
import { EDITOR_NAME } from './const';
import { LovelaceConfig } from 'custom-card-helpers/src/types';

@customElement(EDITOR_NAME)
export class SunSynkCardEditor
	extends LitElement
	implements LovelaceCardEditor
{
	@property() public hass!: HomeAssistant;
	@property() private _config!: sunsynkPowerFlowCardConfig;
	@property() lovelace?: LovelaceConfig;

	// Cache for performance
	private _cachedSanitizedConfig?: sunsynkPowerFlowCardConfig;
	private _configVersion = 0;
	private _lastCachedVersion = -1;

	// Utility: Parse unknown to finite number

	// Utility: Clamp to 0-255 range

	static get styles() {
		return css`
			:host {
				display: block;
				box-sizing: border-box;
				width: 100%;
				max-width: 100%;
			}
			ha-form {
				width: 100%;
			}
			/* No global grid column override; Entities section is scoped via schema */
		`;
	}

	// Provide helper text hints in the editor form
	private _computeHelperCallback = (data: unknown): string | undefined => {
		// ha-form may call this for group/expandable items or items without a name
		if (!data || typeof data !== 'object') return undefined;
		const name = (data as { name?: string }).name;
		if (!name) return undefined;

		/*
		// Localization (commented out until help text is added to language files)
		const key = `config.helper.${name}`;
		try {
			const localized = localize(key);
			if (localized && localized !== key) return localized;
		} catch {
			// fall through to defaults below when localization lookup fails
		}
		*/

		// Pattern-based helper hints for dynamic load/aux subfields
		if (PATTERN_LOAD_NAME.test(name)) return 'Label for additional load.';
		if (PATTERN_LOAD_ICON.test(name))
			return 'Additional load icon (Can be set via template sensor).';
		if (PATTERN_LOAD_SWITCH.test(name))
			return 'Switch entity to control this additional load (optional).';
		if (PATTERN_LOAD_THRESHOLD.test(name))
			return 'Set the threshold that will activate the Max Colour.';
		if (PATTERN_AUX_LOAD_NAME.test(name)) return 'Label for auxiliary load.';
		if (PATTERN_AUX_LOAD_ICON.test(name))
			return 'Icon will be used for this auxiliary load.';

		// Global patterns across sections (safe and generic)
		if (PATTERN_PV_NAME.test(name)) return 'Custom label for a PV input.';
		if (name === 'mppts')
			return 'Number of MPPT inputs available on your inverter.';
		if (name === 'three_phase')
			return 'Enable if your system/card should display in three-phase mode.';
		if (PATTERN_SHOW_SECTION.test(name))
			return 'Show or hide this section in the card.';
		if (PATTERN_SHOW_DAILY.test(name))
			return 'Display daily energy on the card.';
		if (name === 'auto_scale')
			return 'Automatically scale values based on recent ranges.';
		if (PATTERN_ANY_NAME.test(name)) return 'Custom label shown in the UI.';
		if (PATTERN_DYNAMIC_ICON.test(name))
			return 'The icon will change to represent power source.';
		if (PATTERN_ANY_SWITCH.test(name))
			return 'Optional switch entity to control this element.';
		if (PATTERN_MAX_THRESHOLD.test(name))
			return 'Maximum threshold used for progress/flow scaling.';
		// Must come before the generic *_colour rule; match both 'dynamic_colour' and '*_dynamic_colour'
		if (PATTERN_DYNAMIC_COLOUR.test(name))
			return 'Change colour dynamically based on power level.';
		if (PATTERN_ANY_COLOUR.test(name))
			return 'Primary colour for this element.';
		if (PATTERN_OFF_COLOUR.test(name))
			return 'Colour used when the element is off/idle.';
		if (PATTERN_MAX_POWER.test(name))
			return 'Optional cap used for scaling and progress calculations.';

		// Static lookups (O(1))
		if (name === 'max_line_width' || name === 'min_line_width') {
			const min = Number(this._config?.min_line_width ?? 1);
			const max = Number(this._config?.max_line_width ?? 1);
			if (min > max)
				return 'Warning: min_line_width is greater than max_line_width.';
			return name === 'max_line_width'
				? 'Maximum dynamic line width (1-8).'
				: 'Minimum dynamic line width (1-8).';
		}

		return HELP_TEXT[name];
	};

	// Humanize a schema name like "inverter_voltage_154" -> "Inverter Voltage 154"
	private _prettyLabel(name: string): string {
		const cached = LABEL_CACHE.get(name);
		if (cached) return cached;
		const result = name
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
		LABEL_CACHE.set(name, result);
		return result;
	}

	// Safe localize with fallback (treat 'unknown'/'undefined' as missing)
	private _t(key: string, fallback: string): string {
		try {
			const v = localize(key);
			if (typeof v === 'string') {
				const lower = v.toLowerCase();
				if (v && v !== key && lower !== 'unknown' && lower !== 'undefined') {
					return v;
				}
			}
		} catch {
			// fall through to fallback
		}
		return fallback;
	}

	// Map common CSS color names to hex; accept string, {r,g,b} object, or [r,g,b] array; return undefined if invalid
	private _normalizeColor(value?: unknown): string | undefined {
		if (value == null) return undefined;
		// If provided as an object or array with r,g,b channels (numbers or numeric strings)
		if (typeof value === 'object') {
			let r: unknown;
			let g: unknown;
			let b: unknown;
			if (Array.isArray(value) && value.length >= 3) {
				[r, g, b] = value as unknown[];
			} else {
				const v = value as Record<string, unknown>;
				r = v.r;
				g = v.g;
				b = v.b;
			}
			const rr = _toFiniteNum(r);
			const gg = _toFiniteNum(g);
			const bb = _toFiniteNum(b);
			if (rr === undefined || gg === undefined || bb === undefined)
				return undefined;
			const toHex = (n: number) => _clamp255(n).toString(16).padStart(2, '0');
			return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
		}
		if (typeof value !== 'string') return undefined;
		const hex = value.trim();
		const lower = hex.toLowerCase();
		const fromMap = COLOR_NAME_MAP[lower];
		let candidate = fromMap ?? hex;
		// Expand #rgb shorthand to #rrggbb
		const m = /^#([0-9a-f]{3})$/i.exec(candidate);
		if (m) {
			const [r, g, b] = m[1].split('');
			candidate = `#${r}${r}${g}${g}${b}${b}`;
		}
		return /^#([0-9a-f]{6})$/i.test(candidate) ? candidate : undefined;
	}

	// Convert supported inputs into [r, g, b] array for ha-form color_rgb
	private _toRgb(value?: unknown): [number, number, number] | undefined {
		if (value == null) return undefined;

		// Array [r,g,b]
		if (Array.isArray(value) && value.length >= 3) {
			const [r, g, b] = value as unknown[];
			const rr = _toFiniteNum(r);
			const gg = _toFiniteNum(g);
			const bb = _toFiniteNum(b);
			if (rr == null || gg == null || bb == null) return undefined;
			return [_clamp255(rr), _clamp255(gg), _clamp255(bb)];
		}

		// Object { r,g,b }
		if (typeof value === 'object') {
			const v = value as Record<string, unknown>;
			const rr = _toFiniteNum(v.r);
			const gg = _toFiniteNum(v.g);
			const bb = _toFiniteNum(v.b);
			if (rr != null && gg != null && bb != null) {
				return [_clamp255(rr), _clamp255(gg), _clamp255(bb)];
			}
		}

		// String: hex name or rgb(..)
		if (typeof value === 'string') {
			const s = value.trim();
			// rgb(a) pattern
			const m =
				/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(s);
			if (m) {
				return [
					_clamp255(Number(m[1])),
					_clamp255(Number(m[2])),
					_clamp255(Number(m[3])),
				];
			}
			const hex = this._normalizeColor(s);
			if (!hex) return undefined;
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return [r, g, b];
		}
		return undefined;
	}

	// Produce a safe CSS color for preview chips from any input
	private _toCssColor(value?: unknown): string | undefined {
		if (value == null) return undefined;
		// Allow CSS variables directly
		if (typeof value === 'string' && value.trim().startsWith('var(')) {
			return value.trim();
		}
		// Prefer hex if we can normalize
		const hex = this._normalizeColor(value);
		if (hex) return hex;
		// Fallback: if it's a string (named color), let the browser try it
		if (typeof value === 'string') return value;
		return undefined;
	}

	// Safely extract a string value from an object by key

	// Shared color normalization visitor - recursively converts colour values to hex strings
	private _normalizeColorsInObject(obj: unknown): unknown {
		if (Array.isArray(obj)) return obj;
		if (!obj || typeof obj !== 'object') return obj;
		const rec = obj as Record<string, unknown>;
		for (const [k, val] of Object.entries(rec)) {
			if (
				typeof k === 'string' &&
				PATTERN_COLOUR_SUFFIX.test(k) &&
				!PATTERN_DYNAMIC_COLOUR_SUFFIX.test(k)
			) {
				rec[k] = this._normalizeColor(val) ?? undefined;
			} else if (val && typeof val === 'object') {
				rec[k] = this._normalizeColorsInObject(val) as unknown;
			}
		}
		return rec;
	}

	// Helper to convert colour fields in a section to RGB format for ha-form
	private _convertSectionColours(
		section: Record<string, unknown> | undefined,
		colourFields: string[],
	): Record<string, unknown> | undefined {
		if (!section) return undefined;
		const result = { ...section };
		for (const field of colourFields) {
			result[field] = this._toRgb(section[field]) ?? undefined;
		}
		return result;
	}

	// Return a sanitized config so ha-form color_rgb selectors receive proper [r,g,b] values
	private _sanitizedConfig(): sunsynkPowerFlowCardConfig {
		// Return cached version if config hasn't changed
		if (
			this._cachedSanitizedConfig &&
			this._lastCachedVersion === this._configVersion
		) {
			return this._cachedSanitizedConfig;
		}

		const c = this._config;
		const copy: Record<string, unknown> = {
			...(this._config as unknown as Record<string, unknown>),
		};

		// top-level title colour as RGB object
		copy.title_colour =
			this._toRgb((c as unknown as Record<string, unknown>)['title_colour']) ??
			undefined;

		// Convert section colours to RGB format
		copy.inverter = this._convertSectionColours(
			c.inverter as Record<string, unknown>,
			['colour'],
		);
		copy.solar = this._convertSectionColours(
			c.solar as Record<string, unknown>,
			['colour'],
		);
		copy.battery = this._convertSectionColours(
			c.battery as Record<string, unknown>,
			['colour', 'charge_colour'],
		);
		copy.battery2 = this._convertSectionColours(
			c.battery2 as Record<string, unknown>,
			['colour', 'charge_colour'],
		);
		copy.battery3 = this._convertSectionColours(
			c.battery3 as Record<string, unknown>,
			['colour', 'charge_colour'],
		);
		copy.battery4 = this._convertSectionColours(
			c.battery4 as Record<string, unknown>,
			['colour', 'charge_colour'],
		);
		copy.load = this._convertSectionColours(c.load as Record<string, unknown>, [
			'colour',
			'off_colour',
			'max_colour',
			'aux_colour',
			'aux_off_colour',
		]);
		copy.grid = this._convertSectionColours(c.grid as Record<string, unknown>, [
			'colour',
			'no_grid_colour',
			'export_colour',
			'grid_off_colour',
		]);

		// Cache the result
		this._cachedSanitizedConfig = copy as unknown as sunsynkPowerFlowCardConfig;
		this._lastCachedVersion = this._configVersion;

		return this._cachedSanitizedConfig;
	}

	public setConfig(config: sunsynkPowerFlowCardConfig): void {
		// Migrate any existing *_colour arrays/objects in incoming config to hex strings
		const clone = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
		this._normalizeColorsInObject(clone);
		this._config = {
			...defaults,
			...this._config,
			...(clone as unknown as sunsynkPowerFlowCardConfig),
		};
		this._configVersion++;
	}

	protected render(): TemplateResult | void {
		if (!this._config || !this.hass) {
			return html``;
		}

		// Build General section schema with conditional fields
		const generalGridSchema: Array<Record<string, unknown>> = [
			{ name: 'large_font', selector: { boolean: {} } },
			{ name: 'wide', selector: { boolean: {} } },
			{ name: 'card_height', selector: { text: {} } },
			{ name: 'card_width', selector: { text: {} } },
			{ name: 'show_solar', selector: { boolean: {} } },
			{ name: 'show_battery', selector: { boolean: {} } },
			{ name: 'show_grid', selector: { boolean: {} } },
			{ name: 'center_no_grid', selector: { boolean: {} } },
			{
				name: 'decimal_places',
				selector: { number: { min: 0, max: 3, step: 1, mode: 'box' } },
			},
			{
				name: 'decimal_places_energy',
				selector: { number: { min: 0, max: 3, step: 1, mode: 'box' } },
			},
			{ name: 'dynamic_line_width', selector: { boolean: {} } },
		];
		if (this._config.dynamic_line_width) {
			generalGridSchema.push(
				{
					name: 'max_line_width',
					selector: { number: { min: 1, max: 8, step: 1, mode: 'box' } },
				},
				{
					name: 'min_line_width',
					selector: { number: { min: 1, max: 8, step: 1, mode: 'box' } },
				},
			);
		}

		return html`
			<ha-form
				.hass=${this.hass}
				.data=${this._sanitizedConfig()}
				.computeLabel=${this._computeLabelCallback.bind(this)}
				.computeHelper=${this._computeHelperCallback.bind(this)}
				.schema=${buildEditorSchema({
					config: this._config,
					title: (o) => this._title(o),
					generalGridSchema,
				})}
				]}
				@value-changed=${this._valueChanged.bind(this)}
			></ha-form>
		`;
	}

	// (header removed)

	private _emitConfig(config: sunsynkPowerFlowCardConfig): void {
		this._config = config;
		this._configVersion++;
		// Clear cache when config changes
		this._cachedSanitizedConfig = undefined;
		this._lastCachedVersion = -1;
		fireEvent(this, 'config-changed', { config });
	}

	// (header reset actions removed)

	private _withSuffix(base: string, condition: boolean): string {
		const key = condition ? 'config.inline.shown' : 'config.inline.hidden';
		const fallback = condition ? 'shown' : 'hidden';
		return `${base} (${this._t(key, fallback)})`;
	}

	private _computeLabelCallback = (data: {
		name?: string;
		label?: string;
		title?: string;
	}): string => {
		// For group/expandable items, prefer provided label/title if exists
		if (typeof data?.label === 'string' && data.label.trim()) return data.label;
		if (typeof data?.title === 'string' && data.title.trim()) return data.title;

		const name = typeof data?.name === 'string' ? data.name : '';
		if (!name) return '';
		// Base label from i18n with graceful fallback
		const base = this._t(`config.${name}`, this._prettyLabel(name));

		const cfg = this._config as unknown as Record<string, unknown>;
		switch (name) {
			case 'show_solar':
				return this._withSuffix(base, Boolean(cfg.show_solar));
			case 'show_battery':
				return this._withSuffix(base, Boolean(cfg.show_battery));
			case 'show_grid':
				return this._withSuffix(base, Boolean(cfg.show_grid));
			case 'dynamic_line_width': {
				const on = Boolean(cfg.dynamic_line_width);
				if (!on) {
					return `${base} (${this._t('config.inline.disabled', 'disabled')})`;
				}
				const max = cfg.max_line_width as number | undefined;
				const min = cfg.min_line_width as number | undefined;
				if (typeof max === 'number' && typeof min === 'number') {
					return `${base} (min ${min} – max ${max})`;
				}
				return `${base} (${this._t('config.inline.enabled', 'enabled')})`;
			}
			case 'three_phase': {
				const on = Boolean(
					cfg?.inverter &&
					(cfg.inverter as Record<string, unknown>).three_phase,
				);
				const v = on ? '3P' : '1P';
				return `${base} (${v})`;
			}
			default:
				return base;
		}
	};

	private _title(opt) {
		// Use the same robust fallback as _t to handle missing/invalid translations
		return this._t(`config.cat_title.${opt}`, opt);
	}

	private _valueChanged(ev: CustomEvent): void {
		// ha-form returns color_rgb as arrays or {r,g,b}; ensure all '*_colour' values become hex strings before emitting
		const v = ev.detail.value as Record<string, unknown>;
		// IMPORTANT: do NOT mutate v (the form's live value). Clone before normalization to avoid breaking the picker UI.
		const out = JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
		this._normalizeColorsInObject(out);

		// Normalize dynamic line width values if present
		if (out && typeof out === 'object' && out.dynamic_line_width) {
			const clampInt = (
				n: unknown,
				min: number,
				max: number,
			): number | undefined => {
				const num = _toFiniteNum(n);
				if (num !== undefined)
					return Math.max(min, Math.min(max, Math.round(num)));
				return undefined;
			};
			const max = clampInt(out.max_line_width, 1, 8);
			const min = clampInt(out.min_line_width, 1, 8);
			if (max !== undefined) out.max_line_width = max;
			if (min !== undefined) out.min_line_width = min;
			const curMax = out.max_line_width as number | undefined;
			const curMin = out.min_line_width as number | undefined;
			if (
				typeof curMin === 'number' &&
				typeof curMax === 'number' &&
				curMin > curMax
			) {
				// If swapped, align min to max to keep consistent
				out.min_line_width = curMax;
			}
		}
		// Update local config and emit cloned hex-normalized config; this keeps the form's RGB value intact
		this._emitConfig(out as unknown as sunsynkPowerFlowCardConfig);
	}
}
