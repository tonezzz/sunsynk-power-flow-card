import { html, svg } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DataDto, sunsynkPowerFlowCardConfig } from '../types';

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

export const pfgCard = (
	config: sunsynkPowerFlowCardConfig,
	inverterImg: string,
	_data: DataDto,
	hass?: HomeAssistant,
) => {
	const gridSize = config.pfg_grid_size || 10;

	const cells = Array.from({ length: gridSize * gridSize }, (_, i) => {
		const row = Math.floor(i / gridSize) + 1;
		const col = (i % gridSize) + 1;
		return { row, col };
	});

	// Tile image map: key = "r,c" (1-indexed). Additional tiles can be added here
	// or supplied from the card config via `pfg_images`.
	const tileImages: Record<string, string> = { ...(config.pfg_images || {}) };
	const center = Math.floor(gridSize / 2) + 1;
	const centerKey = `${center},${center}`;
	if (
		!tileImages[centerKey] &&
		!config.pfg_charts?.[centerKey] &&
		inverterImg
	) {
		// Default centre tile shows the inverter image for the selected model.
		tileImages[centerKey] = inverterImg;
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
		if (l.entity && hass) {
			const st = hass.states[l.entity];
			const v = st ? parseFloat(st.state) : NaN;
			if (!isNaN(v)) {
				live = Math.abs(v) > 0;
				direction = v >= 0 ? 1 : -1;
			}
			const statusColor = statusColors[stateToStatus(st?.state)];
			if (!l.color && statusColor) lineColor = statusColor;
		}
		return { a, b, points, direction, live, color: lineColor };
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
							const valueEntity = config.pfg_values?.[key];
							const valueText =
								valueEntity && hass && hass.states[valueEntity]
									? `${hass.states[valueEntity].state}${
											hass.states[valueEntity].attributes?.unit_of_measurement
												? ` ${hass.states[valueEntity].attributes.unit_of_measurement}`
												: ''
										}`
									: undefined;
							const chartDef = config.pfg_charts?.[key];
							const gaugeR = 40;
							const gaugeCirc = 2 * Math.PI * gaugeR;
							const chartSvg =
								chartDef && chartDef.type === 'gauge' && hass
									? (() => {
											const st = chartDef.entity
												? hass.states[chartDef.entity]
												: undefined;
											const raw = st ? st.state : (chartDef.value ?? 0);
											const val = parseFloat(String(raw)) || 0;
											const max = chartDef.max ?? 100;
											const pct = Math.min(
												Math.max(max > 0 ? val / max : 0, 0),
												1,
											);
											const decimals = chartDef.decimals ?? 0;
											const gaugeColor = chartDef.color ?? '#00E676';
											const gaugeBg = chartDef.bg ?? '#102040';
											const gradId = `pfg-gauge-grad-${c.row}-${c.col}`;
											const gaugeStroke = chartDef.gradient
												? `url(#${gradId})`
												: gaugeColor;
											const off = gaugeCirc * (1 - pct);
											return svg`<svg viewBox="0 0 100 100" style="width:80%;height:80%;">
																<defs>
																	${chartDef.gradient ? svg`<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${chartDef.gradient.from}" /><stop offset="100%" stop-color="${chartDef.gradient.to}" /></linearGradient>` : ''}
																</defs>
																<g transform="rotate(-90 50 50)">
																	<circle cx="50" cy="50" r="${gaugeR}" fill="none" stroke="${gaugeBg}" stroke-width="12" />
																	<circle cx="50" cy="50" r="${gaugeR}" fill="none" stroke="${gaugeStroke}" stroke-width="12" stroke-dasharray="${gaugeCirc}" stroke-dashoffset="${off}" stroke-linecap="round" />
																</g>
																<text x="50" y="48" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="#fff">${val.toFixed(decimals)}</text>
																${chartDef.label ? svg`<text x="50" y="70" text-anchor="middle" font-size="10" fill="#fff">${chartDef.label}</text>` : ''}
																${chartDef.unit ? svg`<text x="50" y="85" text-anchor="middle" font-size="9" fill="#aaa">${chartDef.unit}</text>` : ''}
															</svg>`;
										})()
									: undefined;
							const title = `Tile ${key}${status ? ` – ${status}` : ''}${entityState ? ` (${entityState})` : ''}`;
							const cellStyle = `border:1px solid ${color || 'rgba(255,255,255,0.2)'};background:${color ? hexToRgba(color, 0.2) : 'rgba(255,255,255,0.05)'};display:flex;align-items:center;justify-content:center;font-size:min(1.5vw,10px);text-align:center;box-sizing:border-box;overflow:hidden;position:relative;${radius ? `border-radius:${radius};` : ''}${span ? `grid-row:${c.row}/span ${span};grid-column:${c.col}/span ${span};` : ''}`;
							return html`
								<div
									class="pfg-cell"
									id="pfg-r${c.row}-c${c.col}"
									data-row="${c.row}"
									data-col="${c.col}"
									style="${cellStyle}"
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
												: imgSrc && chartSvg
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
																style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1;"
															>
																${chartSvg}
															</div>
														</div>`
													: imgSrc
														? html`<img
																src="${imgSrc}"
																alt="Tile ${key}"
																title="${title}"
																style="width:100%;height:100%;object-fit:cover;transform:scale(${imageZoom});pointer-events:none;"
															/>`
														: chartSvg
															? chartSvg
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
											style="animation: pfg-flow 0.8s linear infinite; animation-direction: ${fl.direction < 0 ? 'reverse' : 'normal'}; opacity: ${fl.live ? '1' : '0.6'};"
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
