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
