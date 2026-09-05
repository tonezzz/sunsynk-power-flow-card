import { html, svg } from 'lit';
import { renderPfgChart } from './pfg-card';
import { HomeAssistant } from 'custom-card-helpers';
import { DataDto, PfgChartDef, sunsynkPowerFlowCardConfig } from '../types';

const STATUS_COLORS: Record<string, string> = {
	online: '#00E676',
	offline: '#FF1744',
	running: '#00E676',
	stopped: '#FF1744',
	warning: '#FF9100',
	unknown: '#9E9E9E',
};

function hexToRgba(hex: string, alpha: number): string {
	const clean = hex.replace('#', '');
	const r = parseInt(clean.substring(0, 2), 16);
	const g = parseInt(clean.substring(2, 4), 16);
	const b = parseInt(clean.substring(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

function stateToStatus(state?: string): string {
	if (!state) return 'unknown';
	const s = state.toLowerCase();
	if (
		[
			'on',
			'home',
			'running',
			'connected',
			'up',
			'open',
			'detected',
			'available',
			'ok',
			'true',
			'active',
		].includes(s)
	) {
		return 'online';
	}
	if (
		[
			'off',
			'away',
			'not_home',
			'disconnected',
			'down',
			'closed',
			'false',
			'inactive',
		].includes(s)
	) {
		return 'offline';
	}
	if (['stopped', 'not_running'].includes(s)) return 'stopped';
	if (['unavailable', 'unknown', 'none', 'null'].includes(s)) return 'unknown';
	return 'warning';
}

export const pfg2Card = (
	config: sunsynkPowerFlowCardConfig,
	inverterImg: string,
	_data: DataDto,
	hass?: HomeAssistant,
) => {
	const gridSize = config.pfg_grid_size || 15;

	const cells = Array.from({ length: gridSize * gridSize }, (_, i) => {
		const row = Math.floor(i / gridSize) + 1;
		const col = (i % gridSize) + 1;
		return { row, col };
	});

	// Tile image map: key = "r,c" (1-indexed). Additional tiles can be added here
	// or supplied from the card config via `pfg_images`.
	const tileImages: Record<string, string> = { ...(config.pfg_images || {}) };

	// Controller overlay: a 2x2 block starting at r7c7.
	const controllerRow = 7;
	const controllerCol = 7;
	const controllerWidth = (2 / gridSize) * 100;
	const controllerHeight = (2 / gridSize) * 100;
	const controllerTop = ((controllerRow - 1) / gridSize) * 100;
	const controllerLeft = ((controllerCol - 1) / gridSize) * 100;

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
	// covered cells are skipped so they don't overlap the spanned tile.
	const spans: Record<string, number> = config.pfg_spans || {};
	const covered = new Set<string>();
	Object.entries(spans).forEach(([k, n]) => {
		const [r0, c0] = k.split(',').map((x) => parseInt(x, 10));
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
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
		const n = spans[key] || 1;
		const cx = ((c - 1 + n / 2) / gridSize) * 100;
		const cy = ((r - 1 + n / 2) / gridSize) * 100;
		switch (side) {
			case 'top':
				return { x: cx, y: ((r - 1) / gridSize) * 100 };
			case 'bottom':
				return { x: cx, y: ((r + n - 1) / gridSize) * 100 };
			case 'left':
				return { x: ((c - 1) / gridSize) * 100, y: cy };
			case 'right':
				return { x: ((c + n - 1) / gridSize) * 100, y: cy };
			case 'topleft':
				return { x: ((c - 1) / gridSize) * 100, y: ((r - 1) / gridSize) * 100 };
			case 'topright':
				return {
					x: ((c + n - 1) / gridSize) * 100,
					y: ((r - 1) / gridSize) * 100,
				};
			case 'bottomleft':
				return {
					x: ((c - 1) / gridSize) * 100,
					y: ((r + n - 1) / gridSize) * 100,
				};
			case 'bottomright':
				return {
					x: ((c + n - 1) / gridSize) * 100,
					y: ((r + n - 1) / gridSize) * 100,
				};
			default:
				return { x: cx, y: cy };
		}
	};
	const flowLines = (config.pfg_lines || []).map((l) => {
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
		<ha-card>
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
				<div style="position:relative;">
					<div
						style="display:grid;grid-template-columns:repeat(${gridSize},1fr);grid-template-rows:repeat(${gridSize},1fr);gap:0;width:100%;height:auto;aspect-ratio:1/1;box-sizing:border-box;"
					>
						${cells.map((c) => {
							const key = `${c.row},${c.col}`;
							if (covered.has(key)) return null;
							const span = spans[key];
							const radius = config.pfg_radius?.[key];
							const imgSrc = tileImages[key];
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
								.map((chartDef) => {
									const tpl = renderPfgChart(chartDef, c, hass);
									return tpl ? { def: chartDef, tpl } : undefined;
								})
								.filter(
									(i): i is { def: PfgChartDef; tpl: unknown } =>
										i !== undefined,
								);
							const chartOverlays = chartItems.map((i) => {
								const pos = i.def.position || 'center';
								const style =
									pos === 'bottom'
										? 'position:absolute;bottom:2%;left:5%;width:90%;height:32%;'
										: 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;height:60%;';
								return html`<div style="${style}">${i.tpl}</div>`;
							});
							const title = `Tile ${key}${status ? ` – ${status}` : ''}${entityState ? ` (${entityState})` : ''}`;
							return html`
								<div
									class="pfg2-cell"
									id="pfg2-r${c.row}-c${c.col}"
									data-row="${c.row}"
									data-col="${c.col}"
									style="border:1px solid ${
										color || 'rgba(255,255,255,0.2)'
									};background:${
										color ? hexToRgba(color, 0.2) : 'rgba(255,255,255,0.05)'
									};display:flex;align-items:center;justify-content:center;font-size:min(1.5vw,10px);text-align:center;box-sizing:border-box;overflow:hidden;${radius ? `border-radius:${radius};` : ''}${
										span
											? `grid-row:${c.row}/span ${span};grid-column:${c.col}/span ${span};`
											: ''
									}"
									title="${title}"
								>
									${
										label
											? html`<span title="${title}">${label}</span>`
											: icon
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
																style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(${imageZoom});pointer-events:none;"
															/>
															<div
																style="position:absolute;inset:0;pointer-events:none;z-index:1;"
															>
																${chartOverlays}
															</div>
														</div>`
													: imgSrc
														? html`<img
																src="${imgSrc}"
																alt="Tile ${key}"
																title="${title}"
																style="width:100%;height:100%;object-fit:cover;transform:scale(${imageZoom});pointer-events:none;"
															/>`
														: chartOverlays.length
															? chartOverlays
															: valueText || sumText
																? html`<span title="${title}"
																		>${valueText || sumText}</span
																	>`
																: html`r${c.row}:c${c.col}`
									}
								</div>
							`;
						})}
					</div>
					${
						inverterImg
							? html`<img
									src="${inverterImg}"
									alt="controller"
									style="position:absolute;top:${controllerTop}%;left:${controllerLeft}%;width:${controllerWidth}%;height:${controllerHeight}%;object-fit:contain;pointer-events:none;z-index:1;"
								/>`
							: ''
					}
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
											stroke-linecap="butt"
										stroke-linejoin="round"
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
