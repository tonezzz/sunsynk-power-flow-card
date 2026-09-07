import { HomeAssistant } from 'custom-card-helpers';
import { svg } from 'lit';

export type HistoryPoint = { t: number; v: number };
export type HistoryList = HistoryPoint[];

function parseHistoryPoint(p: {
	s?: unknown;
	state?: unknown;
	lu?: number;
	last_updated?: string;
	last_changed?: string;
}): HistoryPoint | null {
	const stateStr = p.s !== undefined ? p.s : p.state;
	const time =
		p.lu !== undefined
			? p.lu
			: new Date(p.last_updated ?? p.last_changed ?? 0).getTime() / 1000;
	const v = parseFloat(String(stateStr));
	return typeof time === 'number' && !isNaN(v) ? { t: time, v } : null;
}

export function fetchHistorySeries(
	hass: HomeAssistant,
	entityIds: string[],
	hours: number,
): Promise<HistoryList[]> {
	const end = new Date();
	const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
	const h = hass as HomeAssistant & {
		callWS?: <T>(msg: object) => Promise<T>;
		callApi?: (method: string, path: string) => Promise<unknown>;
	};
	const call = h.callWS
		? h.callWS({
				type: 'history/history_during_period',
				start_time: start.toISOString(),
				end_time: end.toISOString(),
				entity_ids: entityIds,
				minimal_response: true,
				no_attributes: true,
				significant_changes_only: false,
				include_start_time_state: true,
			})
		: h.callApi
			? h.callApi(
					'GET',
					`history/period/${start.toISOString()}?end_time=${encodeURIComponent(end.toISOString())}&filter_entity_id=${entityIds.map(encodeURIComponent).join(',')}`,
				)
			: Promise.resolve(null);
	return call.then((resp: unknown) => {
		const seriesLists: unknown[] = Array.isArray(resp)
			? resp
			: entityIds.map(
					(e) => (resp && (resp as Record<string, unknown>)[e]) || [],
				);
		const lists = seriesLists.filter((l) => Array.isArray(l)) as {
			s?: unknown;
			state?: unknown;
			lu?: number;
			last_updated?: string;
			last_changed?: string;
		}[][];
		return lists.map((l) =>
			l
				.map(parseHistoryPoint)
				.filter((p): p is HistoryPoint => p !== null)
				.sort((a, b) => a.t - b.t),
		);
	});
}

export function mergeHistoryByTimestamp(
	lists: HistoryList[],
	scale: number,
): { t: number; values: number[] }[] {
	const allTimes = new Set<number>();
	for (const l of lists) for (const p of l) allTimes.add(p.t);
	const sorted = Array.from(allTimes).sort((a, b) => a - b);
	const out = sorted.map((t) => ({
		t,
		values: new Array(lists.length).fill(0),
	}));
	const idx = new Array(lists.length).fill(0);
	for (let i = 0; i < sorted.length; i++) {
		const t = sorted[i];
		for (let s = 0; s < lists.length; s++) {
			const l = lists[s];
			while (idx[s] < l.length && l[idx[s]].t <= t) {
				out[i].values[s] = l[idx[s]].v * scale;
				idx[s]++;
			}
		}
	}
	return out;
}

export const historyCache = new Map<
	string,
	{ ts: number; promise: Promise<ReturnType<typeof svg>> }
>();
