import type { AnalyticsResult } from '@/types/analytics';

/** Keeps saved projects under typical serverless / JSON body limits while preserving a useful preview. */
const MAX_ROWS = 200;
const MAX_CELL_CHARS = 4000;

export function slimAnalyticsForStorage(data: AnalyticsResult): AnalyticsResult {
  const rawData = (data.rawData ?? []).slice(0, MAX_ROWS).map(row => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.length > MAX_CELL_CHARS) {
        out[k] = `${v.slice(0, MAX_CELL_CHARS)}…`;
      } else {
        out[k] = v;
      }
    }
    return out;
  });
  return { ...data, rawData };
}
