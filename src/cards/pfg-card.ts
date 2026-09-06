import { html, svg } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DataDto, sunsynkPowerFlowCardConfig } from '../types';
import {
	STATUS_COLORS,
	hexToRgba,
	stateToStatus,
	renderPfgChart,
} from './pfg-shared';

export const pfgCard = (
	config: sunsynkPowerFlowCardConfig,
	inverterImg: string,
	_data: DataDto,
	hass?: HomeAssistant,
) => {
	const gridSize = config.pfg_grid_size || 10;
	const gridCols = config.pfg_grid_cols || gridSize;
	const gridRows = config.pfg_grid_rows || gridSize;

	const cells = Array.from({ length: gridCols * gridRows }, (_, i) => {
		const row = Math.floor(i / gridCols) + 1;
		const col = (i % gridCols) + 1;
		return { row, col };
	});

	// Tile image map: key = "r,c" (1-indexed). Additional tiles can be added here
	// or supplied from the card config via `pfg_images`.
	const tileImages: Record<string, string> = { ...(config.pfg_images || {}) };
	const center = Math.floor(gridSize / 2) + 1;
	const centerKey = `${center},${center}`;
	const inverterTiles = new Set<string>();
	// `pfg_images: {"r,c": "inverter"}` places the model's inverter image on any
	// tile (rendered with contain fit), including tiles that carry charts.
	for (const k of Object.keys(tileImages)) {
		if (tileImages[k] === 'inverter' && inverterImg) {
			tileImages[k] = inverterImg;
			inverterTiles.add(k);
		}
	}
	const inverterKey = config.pfg_inverter_at || centerKey;
	if (!tileImages[inverterKey] && inverterImg) {
		// Default centre tile shows the inverter image for the selected model.
		tileImages[inverterKey] = inverterImg;
		inverterTiles.add(inverterKey);
	}

	// Tile label map: key = "r,c" (1-indexed). Use `pfg_labels` in the config.
	const tileLabels: Record<string, string> = { ...(config.pfg_labels || {}) };

	// Tile icon map: key = "r,c" (1-indexed). Use `pfg_icons` in the config with
	// mdi icon names (e.g. "mdi:transmission-tower").
	const tileIcons: Record<string, string> = { ...(config.pfg_icons || {}) };

	// Zoom factor applied to image tiles. Use `pfg_image_zoom` in the config.
	const imageZoom = config.pfg_image_zoom || 1;

	// Status/colour handling. `pfg_status` is the manual override. If an entity
	// is mapped via `pfg_entities`, derive a status from its state.
	const statusColors = {
		...STATUS_COLORS,
		...(config.pfg_status_colors || {}),
	};

	const getTileStatus = (key: string): string | undefined => {
		if (config.pfg_status?.[key]) return config.pfg_status[key];
		const entityId = config.pfg_entities?.[key];
		if (entityId && hass) {
			const state = hass.states[entityId]?.state;
			return stateToStatus(state);
		}
		return undefined;
	};

	// Tile spans: `pfg_spans` {"r,c": n} renders that tile as an n x n block;
	// "RxC" (e.g. "2x3") renders an R-row by C-col rectangle.
	// Responsive form: {"square":"3x3","portrait":"2x3","landscape":"3x2"}
	// is resolved from the viewport aspect ratio.
	// covered cells are skipped so they don't overlap the spanned tile.
	const pickOrient = () => {
		const w = globalThis.innerWidth || 1;
		const h = globalThis.innerHeight || 1;
		const ratio = w / h;
		return Math.abs(ratio - 1) < 0.2
			? 'square'
			: ratio < 1
				? 'portrait'
				: 'landscape';
	};
	const parseSpan = (v: unknown): { rows: number; cols: number } => {
		if (v == null) return { rows: 1, cols: 1 };
		if (typeof v === 'object') {
			const o = v as Record<string, number | string>;
			const orient = pickOrient();
			const sel = o[orient] ?? o[orient[0]] ?? o.square ?? Object.values(o)[0];
			return parseSpan(sel);
		}
		if (typeof v === 'number') return { rows: v, cols: v };
		const m = String(v).match(/^(\d+)[x:,](\d+)$/);
		return m
			? { rows: parseInt(m[1], 10), cols: parseInt(m[2], 10) }
			: { rows: 1, cols: 1 };
	};
	const spans: Record<string, { rows: number; cols: number }> = {};
	Object.entries(config.pfg_spans || {}).forEach(([k, v]) => {
		spans[k] = parseSpan(v);
	});
	const covered = new Set<string>();
	Object.entries(spans).forEach(([k, n]) => {
		const [r0, c0] = k.split(',').map((x) => parseInt(x, 10));
		for (let i = 0; i < n.rows; i++) {
			for (let j = 0; j < n.cols; j++) {
				if (i || j) covered.add(`${r0 + i},${c0 + j}`);
			}
		}
	});

	// Connection lines: `pfg_lines` [{from:"r,c", to:"r,c", entity?, color?}].
	// Renders an SVG overlay on the grid with an animated dash-offset flow.
	const parseCell = (s: string) => {
		const [r, c] = (s || '').split(',').map((x) => parseInt(x, 10));
		return { r, c };
	};
	// Endpoint: "r,c" (span-aware center) or "r,c@side" where side is
	// top|bottom|left|right — resolves to that tile edge midpoint.
	const cellCenter = (s: string) => {
		const [key, side] = (s || '').split('@');
		const { r, c } = parseCell(key);
		const n = spans[key] || { rows: 1, cols: 1 };
		const cx = ((c - 1 + n.cols / 2) / gridCols) * 100;
		const cy = ((r - 1 + n.rows / 2) / gridRows) * 100;
		switch (side) {
			case 'top':
				return { x: cx, y: ((r - 1) / gridRows) * 100 };
			case 'bottom':
				return { x: cx, y: ((r + n.rows - 1) / gridRows) * 100 };
			case 'left':
				return { x: ((c - 1) / gridCols) * 100, y: cy };
			case 'right':
				return { x: ((c + n.cols - 1) / gridCols) * 100, y: cy };
			case 'topleft':
				return { x: ((c - 1) / gridCols) * 100, y: ((r - 1) / gridRows) * 100 };
			case 'topright':
				return {
					x: ((c + n.cols - 1) / gridCols) * 100,
					y: ((r - 1) / gridRows) * 100,
				};
			case 'bottomleft':
				return {
					x: ((c - 1) / gridCols) * 100,
					y: ((r + n.rows - 1) / gridRows) * 100,
				};
			case 'bottomright':
				return {
					x: ((c + n.cols - 1) / gridCols) * 100,
					y: ((r + n.rows - 1) / gridRows) * 100,
				};
			default:
				return { x: cx, y: cy };
		}
	};
	const hideGrid = config.pfg_hide_grid === true;
	const flowLines = (hideGrid ? [] : config.pfg_lines || []).map((l) => {
		const a = cellCenter(l.from);
		const b = cellCenter(l.to);
		let v = l.via ? cellCenter(l.via) : null;
		if (l.elbow) {
			v =
				l.elbow === 'h'
					? { x: b.x, y: a.y } // horizontal first, then vertical
					: { x: a.x, y: b.y }; // vertical first, then horizontal
		}
		const points = v
			? `${a.x},${a.y} ${v.x},${v.y} ${b.x},${b.y}`
			: `${a.x},${a.y} ${b.x},${b.y}`;
		let direction = 1; // 1 = from -> to, -1 = reverse
		let live = false;
		let lineColor = l.color || '#FF9100';
		let duration = l.speed ?? 0.8; // seconds per dash cycle at max_power
		if (l.entity && hass) {
			const st = hass.states[l.entity];
			const v = st ? parseFloat(st.state) : NaN;
			const value = l.invert && !isNaN(v) ? -v : v;
			if (!isNaN(value)) {
				live = Math.abs(value) > 0;
				direction = value >= 0 ? 1 : -1;
				const ratio = Math.min(Math.abs(value) / (l.max_power ?? 1000), 1);
				duration = (l.speed ?? 0.8) / Math.max(ratio, 0.15);
			}
			const statusColor = statusColors[stateToStatus(st?.state)];
			if (!l.color && statusColor) lineColor = statusColor;
		}
		return { a, b, points, direction, live, color: lineColor, duration };
	});

	return html`
		${
			config.pfg_transparent
				? html`<style>
						:host {
							background: transparent !important;
						}
						ha-card {
							background: transparent !important;
							box-shadow: none !important;
							border: none !important;
							backdrop-filter: none !important;
						}
						ha-card::before,
						ha-card::after {
							content: none !important;
							background: transparent !important;
							backdrop-filter: none !important;
							box-shadow: none !important;
						}
					</style>`
				: ''
		}
		<ha-card
			style="width:${config.card_width || '100%'};display:block;${config.pfg_transparent ? 'background:transparent;box-shadow:none;border:none;' : ''}"
		>
			<div
				class="container card"
				style="width:100%;padding:8px;background:transparent;color:#fff;box-sizing:border-box;"
			>
				${
					config.title
						? html`<h1
								style="text-align:center;margin:0 0 8px 0;font-size:18px;"
							>
								${config.title}
							</h1>`
						: ''
				}
				<div style="position:relative;width:100%;">
					<div
						style="display:grid;grid-template-columns:repeat(${gridCols},1fr);grid-template-rows:repeat(${gridRows},1fr);gap:0;width:${config.pfg_grid_width || '100%'};height:${config.pfg_fit_screen ? `calc(100vh - ${config.pfg_fit_screen === true ? '72px' : config.pfg_fit_screen})` : 'auto'};aspect-ratio:${config.pfg_fit_screen ? 'auto' : `${gridCols}/${gridRows}`};box-sizing:border-box;"
					>
						${cells.map((c) => {
							const key = `${c.row},${c.col}`;
							if (covered.has(key)) return null;
							const span = spans[key];
							const radius = config.pfg_radius?.[key];
							const tileBorder = config.pfg_border?.[key];
							const imgSrc = tileImages[key];
							const imgFit =
								config.pfg_image_fit?.[key] ||
								(inverterTiles.has(key) ? 'contain' : 'cover');
							const imgZoom = inverterTiles.has(key) ? 1 : imageZoom;
							const label = tileLabels[key];
							const icon = tileIcons[key];
							const status = getTileStatus(key);
							const color = status ? statusColors[status] : undefined;
							const entityState =
								config.pfg_entities?.[key] && hass
									? hass.states[config.pfg_entities[key]]?.state
									: '';
							const sumDef = config.pfg_sums?.[key];
							const sumText =
								sumDef && hass
									? (() => {
											const total = sumDef.entities.reduce(
												(s, e) => s + (parseFloat(hass.states[e]?.state) || 0),
												0,
											);
											const v = sumDef.scale ? total * sumDef.scale : total;
											return `${v.toFixed(sumDef.decimals ?? 1)}${
												sumDef.unit ? ` ${sumDef.unit}` : ''
											}`;
										})()
									: undefined;
							const valueDef = config.pfg_values?.[key];
							const valueText =
								valueDef && hass
									? (() => {
											const def =
												typeof valueDef === 'string'
													? { entity: valueDef }
													: valueDef;
											const st = def.entity
												? hass.states[def.entity]
												: undefined;
											if (!st) return undefined;
											const raw = parseFloat(st.state);
											const scaled = isNaN(raw)
												? st.state
												: (raw * (def.scale ?? 1)).toFixed(def.decimals ?? 1);
											const unit =
												def.unit ?? st.attributes?.unit_of_measurement ?? '';
											return `${def.label ? `${def.label} ` : ''}${scaled}${unit ? ` ${unit}` : ''}`;
										})()
									: undefined;
							const chartDefs = config.pfg_charts?.[key];
							const charts = Array.isArray(chartDefs)
								? chartDefs
								: chartDefs
									? [chartDefs]
									: [];
							const chartItems = charts
								.map((chartDef) => ({
									def: chartDef,
									tpl: renderPfgChart(chartDef, c, hass),
								}))
								.filter((i) => i.tpl != null);
							const chartOverlays = chartItems.map((i) => {
								const pos = i.def.position || 'center';
								const style =
									pos === 'bottom'
										? 'position:absolute;bottom:2%;left:2.5%;width:95%;height:35%;'
										: pos === 'top'
											? 'position:absolute;top:6%;left:2.5%;width:95%;height:56%;'
											: pos === 'cycle'
												? 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'
												: 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:95%;height:70%;';
								return html`<div style="${style}">${i.tpl}</div>`;
							});
							const title = `Tile ${key}${status ? ` – ${status}` : ''}${entityState ? ` (${entityState})` : ''}`;
							const cellStyle = `border:${hideGrid ? 'none' : tileBorder || `1px solid ${color || 'rgba(255,255,255,0.2)'}`};background:${color ? hexToRgba(color, 0.2) : hideGrid ? 'transparent' : 'rgba(255,255,255,0.05)'};display:flex;align-items:center;justify-content:center;font-size:min(1.5vw,10px);text-align:center;box-sizing:border-box;overflow:hidden;position:relative;${radius ? `border-radius:${radius};` : ''}${span && (span.rows > 1 || span.cols > 1) ? `grid-row:${c.row}/span ${span.rows};grid-column:${c.col}/span ${span.cols};` : ''}`;
							const labelOverlay = label
								? html`<span
										title="${title}"
										style="position:absolute;left:50%;top:${config.pfg_label_pos?.[key] || '55%'};transform:translate(-50%,-50%) translateY(-26px);z-index:2;font-weight:bold;font-size:min(2vw,14px);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;"
										>${label}</span
									>`
								: '';
							const valueLabel = config.pfg_value_labels?.[key];
							const valueLabelOverlay = valueLabel
								? html`<span
										style="position:absolute;left:50%;top:${config.pfg_value_label_pos?.[key] || 'calc(55% - 14px)'};transform:translate(-50%,-50%);z-index:2;font-weight:bold;font-size:min(1.6vw,11px);color:#ddd;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;"
										>${valueLabel}</span
									>`
								: '';
							return html`
								<div
									class="pfg-cell"
									id="pfg-r${c.row}-c${c.col}"
									data-row="${c.row}"
									data-col="${c.col}"
									style="${cellStyle}"
									title="${title}"
								>
									${labelOverlay} ${valueLabelOverlay}
									${
										icon
											? html`<ha-icon
													icon="${icon}"
													title="${title}"
													style="--mdc-icon-size:60%;width:60%;height:60%;color:${color || '#fff'};"
												></ha-icon>`
											: imgSrc && chartOverlays.length
												? html`<div
														style="position:absolute;inset:0;z-index:0;"
													>
														<img
															src="${imgSrc}"
															alt="Tile ${key}"
															title="${title}"
															style="position:absolute;inset:0;width:100%;height:100%;object-fit:${imgFit};transform:scale(${imgZoom});pointer-events:none;"
														/>
														<div
															style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1;"
														>
															${chartOverlays}
														</div>
													</div>`
												: imgSrc
													? html`<img
															src="${imgSrc}"
															alt="Tile ${key}"
															title="${title}"
															style="width:100%;height:100%;object-fit:${imgFit};transform:scale(${imgZoom});pointer-events:none;"
														/>`
													: chartOverlays.length
														? chartOverlays
														: valueText || sumText
															? html`<span title="${title}"
																	>${valueText || sumText}</span
																>`
															: hideGrid
																? ''
																: html`r${c.row}:c${c.col}`
									}
								</div>
							`;
						})}
					</div>
					${
						flowLines.length
							? html`<style>
										@keyframes pfg-flow {
											to {
												stroke-dashoffset: -2;
											}
										}
									</style>
									<svg
										viewBox="0 0 100 100"
										preserveAspectRatio="none"
										style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"
									>
										${flowLines.map(
											(fl) => svg`<polyline
											points="${fl.points}"
											fill="none"
											stroke="${fl.color}"
											stroke-width="2"
											stroke-dasharray="1.2 0.8"
											stroke-linecap="round"
											vector-effect="non-scaling-stroke"
											style="animation: pfg-flow ${fl.duration}s linear infinite; animation-direction: ${fl.direction < 0 ? 'reverse' : 'normal'}; animation-play-state: ${fl.live ? 'running' : 'paused'}; opacity: ${fl.live ? '1' : '0.6'};"
										/>`,
										)}
									</svg>`
							: ''
					}
				</div>
			</div>
		</ha-card>
	`;
};
