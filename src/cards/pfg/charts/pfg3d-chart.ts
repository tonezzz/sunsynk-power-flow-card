import { LitElement, html, css } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import type { PfgBar3dChartDef, PfgSurface3dChartDef } from '../../../types';
import { ensureEchartsGl, fetchHourlyDayGrid } from './pfg3d-loader';
import { build3dBaseOption, build3dCenter } from './pfg3d';
import { build3dFlatData, build3dBarData } from './pfg3d-data';
import { attach3dDrag } from './pfg3d-camera';

export type Pfg3dDef = PfgSurface3dChartDef | PfgBar3dChartDef;

export class Pfg3dChart extends LitElement {
	static properties = {
		def: { type: Object },
		hass: { type: Object },
		type: { type: String },
	};

	static styles = css`
		:host {
			display: block;
			width: 100%;
			height: 100%;
			touch-action: none;
		}
		#chart {
			width: 100%;
			height: 100%;
		}
	`;

	def!: Pfg3dDef;
	hass?: HomeAssistant;
	type: 'surface' | 'bar' = 'surface';

	private chart: unknown | null = null;
	private observer?: ResizeObserver;
	private cleanupDrag?: () => void;
	private cleanupHover?: () => void;
	private hoverModule?: typeof import('./pfg3d-hover');
	private refreshTimer?: number;
	private scheduled?: number;
	private lastFetch = 0;
	private lastKey = '';
	private initialized = false;
	private disposed = false;
	private pulseTimer?: number;
	private barData?: object[];
	private days = 0;
	private pulseOpacity = 1;
	private pulseDelta = -0.15;

	render() {
		return html`<div id="chart"></div>`;
	}

	firstUpdated() {
		void this.init();
	}

	updated(changed: Map<string, unknown>) {
		if (!this.initialized) {
			if (this.hass && this.def && !this.disposed) {
				void this.init();
			}
			return;
		}
		if (changed.has('def')) {
			this.dispose();
			this.disposed = false;
			void this.init();
			return;
		}
		if (changed.has('hass')) {
			this.scheduleRefresh();
		}
	}

	disconnectedCallback() {
		this.dispose();
		super.disconnectedCallback();
	}

	private scheduleRefresh() {
		if (this.scheduled) window.clearTimeout(this.scheduled);
		this.scheduled = window.setTimeout(() => {
			this.scheduled = undefined;
			void this.refresh(false);
		}, 300);
	}

	private getEntity(): string | undefined {
		const d = this.def;
		if (!d) return undefined;
		return d.entity ?? (d.entities && d.entities[0]);
	}

	private buildKey(): string {
		const entity = this.getEntity();
		if (!entity) return '';
		const days = Math.max(2, Math.min(this.def?.days ?? 30, 90));
		return `${entity}:${days}:${this.def?.scale ?? 1}`;
	}

	private async init() {
		if (!this.hass || !this.def || this.disposed) return;
		const entity = this.getEntity();
		if (!entity) return;

		await ensureEchartsGl();
		if (this.disposed) return;

		const el = this.renderRoot.querySelector('#chart') as HTMLElement | null;
		if (!el) return;

		const echarts = (
			window as unknown as { echarts?: { init: (e: Element) => unknown } }
		).echarts;
		if (!echarts) return;

		this.chart = echarts.init(el);
		this.observer = new ResizeObserver(() => {
			(this.chart as { resize?: () => void } | null)?.resize?.();
		});
		this.observer.observe(el);

		this.initialized = true;
		this.lastFetch = 0;
		this.lastKey = '';
		await this.refresh(true);

		if (this.refreshTimer) window.clearInterval(this.refreshTimer);
		this.refreshTimer = window.setInterval(
			() => {
				void this.refresh(false);
			},
			5 * 60 * 1000,
		);
	}

	private async refresh(force: boolean) {
		if (!this.hass || !this.def || !this.chart || this.disposed) return;
		const entity = this.getEntity();
		if (!entity) return;

		const key = this.buildKey();
		const now = Date.now();
		if (
			!force &&
			key === this.lastKey &&
			now - this.lastFetch < 5 * 60 * 1000
		) {
			return;
		}

		const days = Math.max(2, Math.min(this.def.days ?? 30, 90));
		const cacheMinutes = this.def.cache ?? Number.POSITIVE_INFINITY;
		const scale = this.def.scale ?? 1;

		try {
			const { grid, dayLabels } = await fetchHourlyDayGrid(
				this.hass,
				entity,
				days,
				scale,
				cacheMinutes,
			);
			if (this.disposed) return;
			await this.renderChart(grid, dayLabels);
			this.lastFetch = now;
			this.lastKey = key;
		} catch (e) {
			console.error('[pfg3d] refresh failed', e);
		}
	}

	private async renderChart(grid: number[][], dayLabels: string[]) {
		if (!this.chart || !this.def) return;
		const chart = this.chart as {
			setOption: (o: object, notMerge?: boolean, lazyUpdate?: boolean) => void;
			resize: () => void;
		};
		const days = grid.length;
		const HOUR_OFFSET = 0;
		const { flat, dataMax: rawMax } = build3dFlatData(grid, days, HOUR_OFFSET);
		let barData: object[] | undefined;
		if (this.type === 'bar') {
			const bd = build3dBarData(grid, days, HOUR_OFFSET);
			barData = bd.barData;
			this.barData = barData;
			this.days = days;
		} else {
			this.barData = undefined;
		}
		const dataMax = grid.length ? rawMax : Number.NEGATIVE_INFINITY;
		const valueMin = this.def.min ?? 0;
		const valueMax = this.def.max ?? Math.max(dataMax, valueMin + 1);
		const unit = this.def.unit ?? '';

		const boxWidth = 160;
		const boxHeight = 60;
		const boxDepth = 120;
		const center = build3dCenter({
			boxWidth,
			boxHeight,
			boxDepth,
			xMin: HOUR_OFFSET,
			xMax: HOUR_OFFSET + 23,
			valueMin,
			valueMax,
			days,
			rotate_center: this.def.rotate_center,
			center: this.def.center,
			viewOffset: this.def.view_offset,
		});

		const axisPointer =
			this.type === 'surface' ? { lineStyle: { opacity: 0.12 } } : undefined;

		const baseOption = build3dBaseOption({
			def: this.def,
			days,
			dayLabels,
			valueMin,
			valueMax,
			unit,
			boxWidth,
			boxHeight,
			boxDepth,
			center,
			distance: 300,
			zMin: valueMin,
			zMax: valueMax,
			axisPointer,
		});

		if (this.type === 'bar') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(baseOption as any).tooltip = {
				show: true,
				trigger: 'item',
				confine: true,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				formatter: (params: any) => {
					const [x, y, v] = params.value as [number, number, number];
					const d = days - 1 - Math.round(y);
					const day = dayLabels[d] ?? '';
					const hour = `${String(Math.round(x)).padStart(2, '0')}:00`;
					return `${day} ${hour}<br />${v.toFixed(2)} ${unit}`;
				},
			};
		}

		const series: object[] = [];
		if (this.type === 'surface') {
			const sdef = this.def as PfgSurface3dChartDef;
			series.push({
				id: 'pfg3d-surface',
				type: 'surface',
				data: flat,
				dataShape: [days, 24],
				shading: 'lambert',
				silent: true,
				itemStyle: { opacity: sdef.opacity ?? 1 },
				wireframe: {
					show: sdef.wireframe ?? true,
					lineStyle: {
						color: 'rgba(255,255,255,0.25)',
						width: 1,
					},
				},
			});
			if (sdef.hover_plane) {
				const valueMid = (valueMin + valueMax) / 2;
				if (!this.hoverModule) {
					this.hoverModule = await import('./pfg3d-hover');
				}
				const hover = this.hoverModule;
				series.push(
					hover.buildHoverPlaneSeries(
						sdef,
						days,
						valueMin,
						valueMax,
						valueMid,
						HOUR_OFFSET,
						HOUR_OFFSET + 23,
					),
				);
				this.cleanupHover?.();
				this.cleanupHover = hover.attachHoverPlane(chart, {
					def: sdef,
					grid,
					days,
					valueMin,
					valueMax,
					valueMid,
					host: this,
				});
			}
		} else {
			series.push({
				id: 'pfg3d-bar',
				type: 'bar3D',
				data: barData,
				shading: 'lambert',
				silent: false,
				animation: true,
				animationDuration: 400,
				itemStyle: { opacity: this.def.opacity ?? 1 },
			});
			this.startPulse();
		}

		if (!this.cleanupDrag) {
			const el = this.renderRoot.querySelector('#chart') as HTMLElement;
			const s = this.def.rotate_sensitivity ?? 3;
			const sens = Array.isArray(s) ? s : [s, s];
			this.cleanupDrag = attach3dDrag(chart, el ?? this, {
				alpha: this.def.alpha ?? 18,
				beta: this.def.beta ?? 40,
				sensitivity: sens as [number, number],
				viewControl: baseOption.grid3D.viewControl,
			});
		}

		// First render sets everything; later updates only touch series, labels and
		// visualMap so the user drag position is not reset.
		if (this.lastKey === '') {
			chart.setOption({ ...baseOption, series });
		} else {
			chart.setOption({
				series,
				visualMap: { min: valueMin, max: valueMax },
				yAxis3D: {
					axisLabel: {
						formatter: (d: number) => dayLabels[days - 1 - Math.round(d)] ?? '',
					},
				},
				zAxis3D: { min: valueMin, max: valueMax },
			});
		}
	}

	private startPulse() {
		if (this.pulseTimer) return;
		this.pulseTimer = window.setInterval(() => this.pulse(), 600);
	}

	private pulse() {
		if (this.type !== 'bar' || !this.chart || !this.barData || this.days < 1)
			return;
		this.pulseOpacity += this.pulseDelta;
		if (this.pulseOpacity <= 0.35) {
			this.pulseOpacity = 0.35;
			this.pulseDelta = 0.15;
		}
		if (this.pulseOpacity >= 1) {
			this.pulseOpacity = 1;
			this.pulseDelta = -0.15;
		}
		const pulseIndex =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.barData.findIndex((p: any) => p.itemStyle);
		if (pulseIndex < 0) return;
		const pulsed = this.barData.map(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(p: any, i: number) => {
				if (i !== pulseIndex) return p;
				const itemStyle = {
					...(p.itemStyle ?? {}),
					opacity: this.pulseOpacity,
				};
				return { ...p, itemStyle };
			},
		);
		const chart = this.chart as {
			setOption: (o: object, notMerge?: boolean, lazyUpdate?: boolean) => void;
		};
		chart.setOption({ series: [{ id: 'pfg3d-bar', data: pulsed }] });
	}

	private dispose() {
		this.disposed = true;
		this.initialized = false;
		if (this.refreshTimer) {
			window.clearInterval(this.refreshTimer);
			this.refreshTimer = undefined;
		}
		if (this.pulseTimer) {
			window.clearInterval(this.pulseTimer);
			this.pulseTimer = undefined;
		}
		if (this.scheduled) {
			window.clearTimeout(this.scheduled);
			this.scheduled = undefined;
		}
		this.cleanupDrag?.();
		this.cleanupDrag = undefined;
		this.cleanupHover?.();
		this.cleanupHover = undefined;
		this.observer?.disconnect();
		this.observer = undefined;
		if (this.chart) {
			try {
				(this.chart as { dispose?: () => void }).dispose?.();
			} catch {
				/* ignore */
			}
			this.chart = null;
		}
	}
}

if (!customElements.get('pfg-3d-chart')) {
	customElements.define('pfg-3d-chart', Pfg3dChart);
}
