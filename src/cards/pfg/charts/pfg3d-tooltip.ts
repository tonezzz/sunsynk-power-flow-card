export function build3dTooltip(opts: {
	days: number;
	dayLabels: string[];
	unit: string;
	axisPointer?: object;
}) {
	const { days, dayLabels, unit, axisPointer } = opts;
	return {
		formatter: (p: { value?: [number, number, number] }) => {
			const [h, d, v] = p.value ?? [0, 0, 0];
			const hr = Math.round(h) % 24;
			const dayIndex = days - 1 - Math.round(d);
			return `${dayLabels[dayIndex] ?? ''} ${String(hr).padStart(2, '0')}:00 — ${v} ${unit}`;
		},
		axisPointer,
	};
}
