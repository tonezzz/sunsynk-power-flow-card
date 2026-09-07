import { PfgChartDef } from '../../types';

/**
 * Single placement engine for chart overlays inside a tile.
 * position: bottom | top | bg | cycle | center (default)
 */
export function chartOverlayStyle(def: PfgChartDef): string {
	const pos = def.position || 'center';
	const opacity = def.opacity != null ? `opacity:${def.opacity};` : '';
	switch (pos) {
		case 'bottom':
			return `position:absolute;bottom:2%;left:2.5%;width:95%;height:${def.height ?? '35%'};`;
		case 'top':
			return 'position:absolute;top:6%;left:2.5%;width:95%;height:56%;';
		case 'bg':
			return `position:absolute;bottom:0;left:0;width:100%;height:${def.height ?? '50%'};pointer-events:none;${opacity}${def.scrim ? 'background:linear-gradient(to top,rgba(0,0,0,0.45),rgba(0,0,0,0.15) 60%,transparent);' : ''}`;
		case 'cycle':
			return `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;${opacity}`;
		default:
			return 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:95%;height:70%;';
	}
}
