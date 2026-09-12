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
		opts.boxHeight * ((valueMid - opts.valueMin) / valueRange - 0.5);
	const verticalShift =
		opts.viewOffset === undefined
			? opts.boxHeight * 0.3
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
		try {
			host.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
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
	const onUp = (e: PointerEvent) => {
		dragging = false;
		try {
			host.releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
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
