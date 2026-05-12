import * as mdiIcons from '@mdi/js';
import { svg } from 'lit';
import { Utils } from './utils';

const mdiPrefix = 'mdi:';
const defaultViewBox = 24;
const showIconDebugGuides = false;
const iconScale = 0.72;
const outerOffsetXRatio = -0.15;
const iconOffsetXRatio = 0;
const iconOffsetYRatio = -0.18;

const toMdiExportName = (icon: string): keyof typeof mdiIcons | undefined => {
	if (!icon.startsWith(mdiPrefix)) {
		return undefined;
	}

	const segments = icon
		.slice(mdiPrefix.length)
		.split('-')
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

	if (!segments.length) {
		return undefined;
	}

	return `mdi${segments.join('')}` as keyof typeof mdiIcons;
};

const getMdiPath = (icon: string | undefined): string | undefined => {
	if (!icon) {
		return undefined;
	}

	const exportName = toMdiExportName(icon);
	return exportName ? mdiIcons[exportName] : undefined;
};

const renderNativeSvgIcon = (
	entity: string | undefined,
	iconPath: string,
	className: string,
	x: number | string,
	y: number | string,
	width: number,
	height: number,
	show: boolean,
) => {
	const outerOffsetX = width * outerOffsetXRatio;
	const scaledWidth = width * iconScale;
	const scaledHeight = height * iconScale;
	const glyphOffsetX = width * iconOffsetXRatio;
	const glyphOffsetY = height * iconOffsetYRatio;
	const originX = (width - scaledWidth) / 2 + glyphOffsetX;
	const originY = (height - scaledHeight) / 2 + glyphOffsetY;
	const scaleX = scaledWidth / defaultViewBox;
	const scaleY = scaledHeight / defaultViewBox;

	const iconTemplate = svg`
        <g transform="translate(${Number(x) + outerOffsetX}, ${y})" display="${show ? '' : 'none'}">
            ${
							showIconDebugGuides
								? svg`
                    <rect
                        x="0"
                        y="0"
                        width="${width}"
                        height="${height}"
                        fill="none"
                        stroke="#ff00ff"
                        stroke-width="1"
                        vector-effect="non-scaling-stroke"
                    />
                    <circle cx="0" cy="0" r="1.5" fill="#00ffff" />
                    <circle cx="${width}" cy="${height}" r="1.5" fill="#ffff00" />
                    <rect
                        x="${originX}"
                        y="${originY}"
                        width="${scaledWidth}"
                        height="${scaledHeight}"
                        fill="none"
                        stroke="#00ff00"
                        stroke-width="1"
                        vector-effect="non-scaling-stroke"
                    />
                `
								: ''
						}
            <path
                class="${className}"
                d="${iconPath}"
                fill="currentColor"
                transform="translate(${originX}, ${originY}) scale(${scaleX}, ${scaleY})"
            />
        </g>
    `;

	if (entity) {
		return svg`
            <a href="#" @click=${(e) => Utils.handlePopup(e, entity)}>
                ${iconTemplate}
            </a>
        `;
	}

	return iconTemplate;
};

/**
 * Renders a load icon with optional popup functionality.
 * @param entity - The entity to trigger the popup (optional).
 * @param icon - The icon name (e.g., "mdi:home").
 * @param className - The CSS class to apply to the icon.
 * @param x - The x-coordinate of the icon.
 * @param y - The y-coordinate of the icon.
 * @param width - The width of the icon container (default: 30).
 * @param height - The height of the icon container (default: 30).
 * @param show - Whether the icon should be visible (default: true).
 * @returns A Lit SVG template or an empty string if no icon is provided.
 */
export function renderIcon(
	entity: string | undefined,
	icon: string | undefined,
	className: string,
	x: number | string,
	y: number | string,
	width: number = 30,
	height: number = 30,
	show: boolean = true,
) {
	const mdiPath = getMdiPath(icon);

	if (mdiPath) {
		return renderNativeSvgIcon(
			entity,
			mdiPath,
			className,
			x,
			y,
			width,
			height,
			show,
		);
	}

	if (icon && entity) {
		return svg`
            <a href="#" @click=${(e) => Utils.handlePopup(e, entity)}>
                <foreignObject x="${x}" y="${y}" width="${width}" height="${height}" display="${show ? '' : 'none'}">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="position: fixed; width: ${width}px; height: ${height}px;">
                        <ha-icon icon="${icon}" class="${className}"></ha-icon>
                    </div>
                </foreignObject>
            </a>`;
	} else if (icon) {
		return svg`
            <foreignObject x="${x}" y="${y}" width="${width}" height="${height}" display="${show ? '' : 'none'}">
                <div xmlns="http://www.w3.org/1999/xhtml" style="position: fixed; width: ${width}px; height: ${height}px;">
                    <ha-icon icon="${icon}" class="${className}"></ha-icon>
                </div>
            </foreignObject>`;
	}
	return '';
}
