import { ColumnAnalysis } from '@/types/analytics';

const HIERARCHY_HINTS: { pattern: RegExp; tier: number }[] = [
  { pattern: /region|territory|division|country|continent/i, tier: 0 },
  { pattern: /district|state|province|zone|macro/i, tier: 1 },
  { pattern: /area|metro|subregion|county/i, tier: 2 },
  { pattern: /branch|office|store|location|city|site|unit|team|dept|department/i, tier: 3 },
  { pattern: /category|segment|channel|type|class|group|role|status|priority|tier/i, tier: 4 },
];

export function pickFilterDimensions(columns: ColumnAnalysis[], max = 5): string[] {
  const eligible = columns.filter(c => {
    const t = c.column.type;
    if (t !== 'categorical' && t !== 'boolean') return false;
    const u = c.column.uniqueCount;
    return u >= 2 && u <= 100;
  });

  const scored = eligible.map(c => {
    const name = c.column.name;
    let tier = 50;
    for (const { pattern, tier: t } of HIERARCHY_HINTS) {
      if (pattern.test(name)) {
        tier = t;
        break;
      }
    }
    return { name, tier, unique: c.column.uniqueCount };
  });

  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.unique - b.unique;
  });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of scored) {
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    out.push(s.name);
    if (out.length >= max) break;
  }
  return out;
}

export function pickDateColumn(columns: ColumnAnalysis[]): string | null {
  const d = columns.find(c => c.column.type === 'date');
  return d?.column.name ?? null;
}

function rowMatchesFilters(
  row: Record<string, unknown>,
  filters: Record<string, string | null>,
  skipKey?: string
): boolean {
  for (const [key, val] of Object.entries(filters)) {
    if (key === skipKey) continue;
    if (val === null || val === '' || val === '__ALL__') continue;
    const cell = row[key];
    if (String(cell ?? '').toLowerCase() !== String(val).toLowerCase()) return false;
  }
  return true;
}

export function applyFilters(
  data: Record<string, unknown>[],
  filters: Record<string, string | null>,
  dateColumn: string | null,
  dateMin: string | null,
  dateMax: string | null
): Record<string, unknown>[] {
  let out = data.filter(row => rowMatchesFilters(row, filters));

  if (dateColumn && (dateMin || dateMax)) {
    out = out.filter(row => {
      const raw = row[dateColumn];
      if (raw === null || raw === undefined || raw === '') return false;
      const t = new Date(String(raw)).getTime();
      if (Number.isNaN(t)) return true;
      if (dateMin) {
        const m = new Date(dateMin).setHours(0, 0, 0, 0);
        if (t < m) return false;
      }
      if (dateMax) {
        const m = new Date(dateMax).setHours(23, 59, 59, 999);
        if (t > m) return false;
      }
      return true;
    });
  }
  return out;
}

export function uniqueOptionsForColumn(
  data: Record<string, unknown>[],
  column: string,
  filters: Record<string, string | null>
): string[] {
  const subset = data.filter(row => rowMatchesFilters(row, filters, column));
  const set = new Set<string>();
  for (const row of subset) {
    const v = row[column];
    if (v === null || v === undefined || v === '') continue;
    set.add(String(v));
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
