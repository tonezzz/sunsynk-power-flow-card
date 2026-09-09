// Registers all built-in chart renderers and re-exports the public API.
import { registerChart } from './registry';
import { renderBars } from './charts/bars';
import { renderBar } from './charts/bar';
import { renderHistory } from './charts/history';
import { renderGauge } from './charts/gauge';
import { renderGroup } from './charts/group';
import { renderCycle } from './charts/cycle';
import { renderSurface3d } from './charts/surface3d';
import { renderBar3d } from './charts/bar3d';

registerChart('bar', (d, _c, h, s) => renderBar(d as never, h, s));
registerChart('bars', (d, _c, h) => renderBars(d as never, h));
registerChart('history', (d, _c, h) => renderHistory(d as never, h));
registerChart('area', (d, _c, h) => renderHistory(d as never, h));
registerChart('gauge', (d, c, h, s) => renderGauge(d as never, c, h, s));
registerChart('group', (d, c, h, s) => renderGroup(d as never, c, h, s));
registerChart('cycle', (d, c, h) => renderCycle(d as never, c, h));
registerChart('surface3d', (d, _c, h) => renderSurface3d(d as never, h));
registerChart('bar3d', (d, _c, h) => renderBar3d(d as never, h));

export { renderPfgChart, registerChart } from './registry';
export type { PfgCell, ChartRenderer } from './registry';
export { STATUS_COLORS, hexToRgba, stateToStatus } from './shared';
export { chartOverlayStyle } from './place';
export { historyCache } from './history-cache';
