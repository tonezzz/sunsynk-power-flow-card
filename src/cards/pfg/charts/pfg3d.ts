import { PfgBar3dChartDef, PfgSurface3dChartDef } from '../../../types';
import { AXIS_TEXT_STYLE, hourCategories } from './pfg3d-axis';
import { build3dCenter, attach3dDrag } from './pfg3d-camera';
import { build3dTooltip } from './pfg3d-tooltip';

export type Pfg3dDef = PfgSurface3dChartDef | PfgBar3dChartDef;

export { AXIS_TEXT_STYLE, hourCategories } from './pfg3d-axis';
export { build3dCenter, attach3dDrag } from './pfg3d-camera';
export { build3dTooltip } from './pfg3d-tooltip';

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
		tooltip: build3dTooltip({ days, dayLabels, unit, axisPointer }),
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
