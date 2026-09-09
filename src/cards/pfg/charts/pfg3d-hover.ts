import { PfgSurface3dChartDef } from '../../../types';

export function buildHoverPlaneSeries(
	def: PfgSurface3dChartDef,
	days: number,
	valueMin: number,
	valueMax: number,
	valueMid: number,
	X_MIN: number,
	X_MAX: number,
) {
	return {
		id: 'pfg3d-hover-plane',
		type: 'surface',
		// flat quad spanning the whole box at z = hovered value
		data: [
			[X_MIN, 0, valueMid],
			[X_MAX, 0, valueMid],
			[X_MIN, days - 1, valueMid],
			[X_MAX, days - 1, valueMid],
		],
		dataShape: [2, 2],
		shading: 'lambert',
		silent: true,
		animation: false,
		itemStyle: {
			opacity:
				typeof def.hover_plane === 'number'
					? def.hover_plane
					: def.hover_plane === false
						? 0
						: 0.25,
			color: def.hover_plane_color ?? '#4fc3f7',
		},
		wireframe: { show: false },
	};
}

export function attachHoverPlane(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	chart: any,
	opts: {
		def: PfgSurface3dChartDef;
		grid: number[][];
		days: number;
		valueMin: number;
		valueMax: number;
		valueMid: number;
		host: HTMLElement;
	},
): () => void {
	const { def, grid, days, valueMin, valueMax, valueMid, host } = opts;
	let planePinned = false;
	const setPlane = (vv: number) =>
		chart.setOption(
			{
				series: [
					{
						id: 'pfg3d-hover-plane',
						data: [
							[0, 0, vv],
							[23, 0, vv],
							[0, days - 1, vv],
							[23, days - 1, vv],
						],
					},
				],
			},
			false,
			false,
		);
	const clampV = (v: unknown) =>
		typeof v === 'number' && !isNaN(v)
			? Math.max(valueMin, Math.min(valueMax, v))
			: undefined;
	let lastDataMove = 0;

	const onMouseMove = (ev: { seriesId?: string; value?: number[]; data?: number[] }) => {
		if (planePinned || ev?.seriesId === 'pfg3d-hover-plane') return;
		const vv = clampV(ev?.value?.[2] ?? ev?.data?.[2]);
		if (vv !== undefined) {
			lastDataMove = Date.now();
			setPlane(vv);
		}
	};
	const onUpdateAxisPointer = (ev: { axesInfo?: { axisDim?: string; value?: number }[] }) => {
		if (planePinned) return;
		const infos = ev?.axesInfo ?? [];
		const xi = infos.find((a: { axisDim?: string }) => a.axisDim === 'x');
		const yi = infos.find((a: { axisDim?: string }) => a.axisDim === 'y');
		if (xi?.value == null || yi?.value == null) return;
		const h = Math.max(0, Math.min(23, Math.round(xi.value)));
		const d = Math.max(0, Math.min(days - 1, days - 1 - Math.round(yi.value)));
		const vv = clampV(grid[d]?.[h]);
		if (vv !== undefined) setPlane(vv);
	};
	const onZrMouseMove = (e: { offsetX: number; offsetY: number }) => {
		if (planePinned || Date.now() - lastDataMove < 100) return;
		const zMinPx = chart.convertToPixel?.('grid3D', [0, 0, valueMin]);
		const zMaxPx = chart.convertToPixel?.('grid3D', [0, 0, valueMax]);
		if (!Array.isArray(zMinPx) || !Array.isArray(zMaxPx)) return;
		const dy = zMinPx[1] - zMaxPx[1];
		if (!dy) return;
		const v =
			valueMin + ((zMinPx[1] - e.offsetY) / dy) * (valueMax - valueMin);
		const vv = clampV(v);
		if (vv !== undefined) setPlane(vv);
	};
	const onGlobalOut = () => {
		if (!planePinned) setPlane(valueMid);
	};

	chart.on('mousemove', onMouseMove);
	chart.on('updateAxisPointer', onUpdateAxisPointer);
	const zr = chart.getZr?.();
	zr?.on('mousemove', onZrMouseMove);
	chart.on('globalout', onGlobalOut);

	let startX = 0;
	let startY = 0;
	const onPointerDown = (e: PointerEvent) => {
		startX = e.clientX;
		startY = e.clientY;
	};
	const onClick = (e: MouseEvent) => {
		if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) return;
		planePinned = !planePinned;
	};
	host.addEventListener('pointerdown', onPointerDown);
	host.addEventListener('click', onClick);

	return () => {
		chart.off('mousemove', onMouseMove);
		chart.off('updateAxisPointer', onUpdateAxisPointer);
		chart.off('globalout', onGlobalOut);
		zr?.off('mousemove', onZrMouseMove);
		host.removeEventListener('pointerdown', onPointerDown);
		host.removeEventListener('click', onClick);
	};
}
