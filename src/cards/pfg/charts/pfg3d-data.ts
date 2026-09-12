export function build3dFlatData(
	grid: number[][],
	days: number,
	hourOffset = 0,
): { flat: number[][]; dataMax: number } {
	const flat: number[][] = [];
	let dataMax = Number.NEGATIVE_INFINITY;
	grid.forEach((row, d) =>
		row.forEach((v, h) => {
			const x = h < hourOffset ? h + 24 : h;
			flat.push([x, days - 1 - d, v]);
			if (v > dataMax) dataMax = v;
		}),
	);
	return { flat, dataMax };
}

export function build3dBarData(
	grid: number[][],
	days: number,
	hourOffset = 0,
	todayColor = '#ffab00',
): { barData: object[]; dataMax: number } {
	const barData: object[] = [];
	let dataMax = Number.NEGATIVE_INFINITY;
	const lastDay = grid.length - 1;
	const lastRow = grid[lastDay] ?? [];
	let lastHour = -1;
	for (let h = lastRow.length - 1; h >= 0; h--) {
		if (lastRow[h] > 0) {
			lastHour = h;
			break;
		}
	}
	grid.forEach((row, d) =>
		row.forEach((v, h) => {
			const x = h < hourOffset ? h + 24 : h;
			const y = days - 1 - d;
			const point: {
				value: [number, number, number];
				itemStyle?: { color: string; opacity: number };
			} = { value: [x, y, v] };
			if (d === lastDay && h === lastHour) {
				point.itemStyle = { color: todayColor, opacity: 1 };
			}
			barData.push(point);
			if (v > dataMax) dataMax = v;
		}),
	);
	return { barData, dataMax };
}
