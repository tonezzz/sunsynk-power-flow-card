import { HomeAssistant } from 'custom-card-helpers';
import { svg } from 'lit';

export type HistoryPoint = { t: number; v: number };
export type HistoryList = HistoryPoint[];

// localStorage is small (typically 5 MB). Caching very large raw history
// arrays silently fails and burns CPU serializing. Keep the default small.
const MAX_CACHE_POINTS = 20000;

type HistoryCache = {
	lists: HistoryList[];
	lastEnd: number;
	ts: number;
};

function cacheKey(entityIds: string[], hours: number): string {
	return `pfgh:${[...entityIds].sort().join(',')}:${hours}`;
}

function readCache(key: string): HistoryCache | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as HistoryCache;
	} catch {
		return null;
	}
}

function writeCache(key: string, lists: HistoryList[], lastEnd: number) {
	const totalPoints = lists.reduce((sum, l) => sum + l.length, 0);
	if (totalPoints > MAX_CACHE_POINTS) return;
	try {
		localStorage.setItem(
			key,
			JSON.stringify({ lists, lastEnd, ts: Date.now() }),
		);
	} catch {
		/* ignore quota errors */
	}
}

const pendingHistory = new Map<string, Promise<HistoryList[]>>();

export function downsampleHistory(
	merged: { t: number; values: number[] }[],
	maxPoints: number,
): { t: number; values: number[] }[] {
	if (merged.length <= maxPoints || maxPoints <= 0) return merged;
	const out: { t: number; values: number[] }[] = [];
	const chunk = Math.ceil(merged.length / maxPoints);
	for (let i = 0; i < merged.length; i += chunk) {
		const slice = merged.slice(i, i + chunk);
		// Keep the point with the highest total value in each chunk so peaks
		// (e.g. PV production spikes) are preserved.
		let best = slice[0];
		let bestSum = best.values.reduce((a, b) => a + b, 0);
		for (let j = 1; j < slice.length; j++) {
			const s = slice[j].values.reduce((a, b) => a + b, 0);
			if (s > bestSum) {
				best = slice[j];
				bestSum = s;
			}
		}
		out.push(best);
	}
	return out;
}

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

function dedupAndSort(list: HistoryList): HistoryList {
	const sorted = list.filter((p): p is HistoryPoint => p !== null).sort((a, b) => a.t - b.t);
	return sorted.filter((p, i, arr) => i === 0 || p.t !== arr[i - 1].t);
}

export function fetchHistorySeries(
	hass: HomeAssistant,
	entityIds: string[],
	hours: number,
	cacheMinutes = 0,
): Promise<HistoryList[]> {
	const end = new Date();
	const startMs = end.getTime() - hours * 60 * 60 * 1000;
	const start = new Date(startMs);
	const endSec = end.getTime() / 1000;
	const startSec = startMs / 1000;
	const key = cacheKey(entityIds, hours);
	const dedupKey = [
		'pfgh',
		key,
		start.toISOString().slice(0, 19),
		end.toISOString().slice(0, 19),
	].join(':');

	const existing = pendingHistory.get(dedupKey);
	if (existing) return existing;

	const promise = (async (): Promise<HistoryList[]> => {
		let cached: HistoryCache | null = null;
		if (cacheMinutes > 0) {
			cached = readCache(key);
			if (cached && Date.now() - cached.ts > cacheMinutes * 60 * 1000) {
				cached = null;
			}
		}

		const h = hass as HomeAssistant & {
			callWS?: <T>(msg: object) => Promise<T>;
			callApi?: (method: string, path: string) => Promise<unknown>;
		};

		const doFetch = (startTime: string, endTime: string): Promise<unknown> => {
			return h.callWS
				? h.callWS({
						type: 'history/history_during_period',
						start_time: startTime,
						end_time: endTime,
						entity_ids: entityIds,
						minimal_response: true,
						no_attributes: true,
						significant_changes_only: false,
						include_start_time_state: true,
					})
				: h.callApi
					? h.callApi(
							'GET',
							`history/period/${encodeURIComponent(startTime)}?end_time=${encodeURIComponent(endTime)}&filter_entity_id=${entityIds.map(encodeURIComponent).join(',')}`,
						)
					: Promise.resolve(null);
		};

		const parseLists = (resp: unknown): HistoryList[] => {
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
		};

		if (cached && cached.lastEnd > startSec) {
			const incrementalStart = new Date(
				cached.lastEnd * 1000 + 1000,
			).toISOString();
			const resp = await doFetch(incrementalStart, end.toISOString());
			const newLists = parseLists(resp);
			const merged = cached.lists.map((list, i) => {
				const newer = newLists[i] ?? [];
				return dedupAndSort([...list, ...newer]);
			});
			const filtered = merged.map((list) =>
				list.filter((p) => p.t >= startSec),
			);
			writeCache(key, filtered, endSec);
			return filtered;
		}

		const resp = await doFetch(start.toISOString(), end.toISOString());
		const lists = parseLists(resp);
		if (cacheMinutes > 0) {
			writeCache(key, lists, endSec);
		}
		return lists;
	})();

	pendingHistory.set(dedupKey, promise);
	promise.finally(() => pendingHistory.delete(dedupKey));
	return promise;
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
