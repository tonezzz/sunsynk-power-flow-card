export const AXIS_TEXT_STYLE = {
	color: '#ffffff',
	fontWeight: 'bold',
	textShadowBlur: 3,
	textShadowColor: 'rgba(0,0,0,0.75)',
} as const;

export function hourCategories(): number[] {
	return Array.from({ length: 24 }, (_, i) => i);
}
