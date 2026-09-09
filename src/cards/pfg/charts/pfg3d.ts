import { PfgBar3dChartDef, PfgSurface3dChartDef } from '../../../types';

export type Pfg3dDef = PfgSurface3dChartDef | PfgBar3dChartDef;

export const AXIS_TEXT_STYLE = {
	color: '#ffffff',
	fontWeight: 'bold',
	textShadowBlur: 3,
	textShadowColor: 'rgba(0,0,0,0.75)',
} as const;

export function hourCategories(): number[] {
	return Array.from({ length: 24 }, (_, i) => i);
}

export function build3dBaseOption(opts: {
	def: Pfg3dDef;
	days: number;
	dayLabels: string[];
	valueMin: number;
	valueMax: number;
	unit: string;
	boxWidth: number;
	boxHeight: number;
	boxDepth: number;
	center?: [number, number, number];
	distance?: number;
	zMin?: number;
	zMax?: number;
	axisPointer?: object;
}) {
	const {
		def,
		days,
		dayLabels,
		valueMin,
		valueMax,
		unit,
		boxWidth,
		boxHeight,
		boxDepth,
		center,
		distance,
		zMin,
		zMax,
		axisPointer,
	} = opts;
	return {
		backgroundColor: 'transparent',
		tooltip: {
			formatter: (p: { value?: [number, number, number] }) => {
				const [h, d, v] = p.value ?? [0, 0, 0];
				const hr = Math.round(h) % 24;
				const dayIndex = days - 1 - Math.round(d);
				return `${dayLabels[dayIndex] ?? ''} ${String(hr).padStart(2, '0')}:00 — ${v} ${unit}`;
			},
			axisPointer,
		},
		xAxis3D: {
			type: 'category',
			name: 'Hour',
			nameTextStyle: AXIS_TEXT_STYLE,
			data: hourCategories(),
			axisLabel: {
				...AXIS_TEXT_STYLE,
				interval: 3,
				formatter: (v: number) => `${String(v).padStart(2, '0')}:00`,
			},
		},
		yAxis3D: {
			type: 'value',
			name: 'Day',
			nameTextStyle: AXIS_TEXT_STYLE,
			min: 0,
			max: days - 1,
			interval: Math.max(1, Math.floor(days / 8)),
			axisLabel: {
				...AXIS_TEXT_STYLE,
				formatter: (d: number) => dayLabels[days - 1 - Math.round(d)] ?? '',
			},
		},
		zAxis3D: {
			type: 'value',
			name: unit,
			nameTextStyle: AXIS_TEXT_STYLE,
			min: zMin ?? 0,
			max: zMax,
			axisLabel: { ...AXIS_TEXT_STYLE },
		},
		grid3D: {
			boxWidth,
			boxHeight,
			boxDepth,
			light: {
				main: { intensity: 1.2 },
				ambient: { intensity: 0.3 },
			},
			viewControl: {
				autoRotate: def.auto_rotate ?? false,
				alpha: def.alpha ?? 18,
				beta: def.beta ?? 40,
				distance: distance ?? 300,
				center,
				rotateMouseButton: def.rotate_mouse_button ?? 'middle',
				panMouseButton: def.pan_mouse_button ?? 'right',
				rotateSensitivity: 0,
				zoomSensitivity: def.zoom_sensitivity ?? 1,
			},
		},
		visualMap: {
			show: false,
			min: valueMin,
			max: valueMax,
			dimension: 2,
			inRange: { color: ['#1565c0', '#00e5ff', '#ffea00'] },
		},
	};
}

export function build3dCenter(opts: {
	boxWidth: number;
	boxHeight: number;
	boxDepth: number;
	xMin?: number;
	xMax?: number;
	valueMin: number;
	valueMax: number;
	days: number;
	rotate_center?: 'front' | 'volume' | [number, number, number];
	center?: [number, number, number];
	viewOffset?: number;
}): [number, number, number] {
	if (opts.center) return opts.center;
	if (Array.isArray(opts.rotate_center)) return opts.rotate_center;
	const xMin = opts.xMin ?? 0;
	const xMax = opts.xMax ?? 23;
	const xMid = (xMin + xMax) / 2;
	const xRange = xMax - xMin;
	const valueMid = (opts.valueMin + opts.valueMax) / 2;
	const dayMid = (opts.days - 1) / 2;
	const dayRange = Math.max(1, opts.days - 1);
	const cx = opts.boxWidth * ((xMid - xMin) / xRange - 0.5);
	const valueRange = Math.max(1, opts.valueMax - opts.valueMin);
	const valueCenter =
		opts.boxHeight *
		((valueMid - opts.valueMin) / valueRange - 0.5);
	const verticalShift =
		opts.viewOffset === undefined
			? opts.boxHeight * 0.25
			: Math.max(-opts.boxHeight, Math.min(opts.boxHeight, opts.viewOffset));
	const cz = valueCenter - verticalShift;
	const cy = opts.boxDepth * ((dayMid - 0) / dayRange - 0.5);
	const frontCenter: [number, number, number] = [cx, cz, opts.boxDepth / 2];
	const volumeCenter: [number, number, number] = [cx, cz, cy];
	return opts.rotate_center === 'front' ? frontCenter : volumeCenter;
}

export function attach3dDrag(
	chart: unknown,
	host: HTMLElement,
	opts: {
		alpha: number;
		beta: number;
		sensitivity: [number, number];
		viewControl: Record<string, unknown>;
	},
): () => void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const chartAny = chart as any;
	const [xSens, ySens] = opts.sensitivity;
	let currentAlpha = opts.alpha;
	let currentBeta = opts.beta;
	let targetAlpha = opts.alpha;
	let targetBeta = opts.beta;
	let dragging = false;
	let startX = 0;
	let startY = 0;
	let alphaStart = opts.alpha;
	let betaStart = opts.beta;
	let pending = false;
	const viewControl = opts.viewControl;

	const getControl = () => {
		const views = chartAny?._componentsViews ?? [];
		for (let i = 0; i < views.length; i++) {
			const c = views[i]?._control;
			if (c?.setAlpha && c?.setBeta) return c;
		}
		return undefined;
	};

	const updateCamera = (alpha: number, beta: number) => {
		targetAlpha = alpha;
		targetBeta = beta;
		if (pending) return;
		pending = true;
		requestAnimationFrame(() => {
			pending = false;
			currentAlpha = targetAlpha;
			currentBeta = targetBeta;
			const ctrl = getControl();
			if (ctrl) {
				ctrl.setAlpha(targetAlpha);
				ctrl.setBeta(targetBeta);
			} else {
				chartAny.setOption(
					{
						grid3D: {
							viewControl: {
								...viewControl,
								alpha: currentAlpha,
								beta: currentBeta,
							},
						},
					},
					false,
					false,
				);
			}
		});
	};

	const onDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		dragging = true;
		startX = e.clientX;
		startY = e.clientY;
		alphaStart = currentAlpha;
		betaStart = currentBeta;
		e.preventDefault();
		e.stopImmediatePropagation();
	};
	const onMove = (e: PointerEvent) => {
		if (!dragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const beta = betaStart + (dx * xSens) / 20;
		const alpha = Math.max(-90, Math.min(90, alphaStart - (dy * ySens) / 20));
		updateCamera(alpha, beta);
	};
	const onUp = () => {
		dragging = false;
	};

	host.addEventListener('pointerdown', onDown);
	window.addEventListener('pointermove', onMove, true);
	window.addEventListener('pointerup', onUp, true);
	window.addEventListener('pointercancel', onUp, true);

	return () => {
		host.removeEventListener('pointerdown', onDown);
		window.removeEventListener('pointermove', onMove, true);
		window.removeEventListener('pointerup', onUp, true);
		window.removeEventListener('pointercancel', onUp, true);
	};
}
