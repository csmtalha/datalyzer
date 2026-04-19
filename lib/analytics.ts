import { ColumnInfo, DataType, NumericStats, CategoryStats, ColumnAnalysis } from '@/types/analytics';

export function inferDataType(values: (string | number | null | undefined)[]): DataType {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  // Check boolean
  const boolSet = new Set(['true', 'false', 'yes', 'no', '0', '1']);
  if (nonNull.every(v => boolSet.has(String(v).toLowerCase()))) return 'boolean';

  // Check numeric
  const numericCount = nonNull.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length;
  if (numericCount / nonNull.length > 0.85) return 'numeric';

  // Check date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{2}-\d{2}-\d{4}/,
    /^\w+ \d{1,2},? \d{4}/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
  ];
  const dateCount = nonNull.filter(v => {
    const s = String(v);
    return datePatterns.some(p => p.test(s)) && !isNaN(Date.parse(s));
  }).length;
  if (dateCount / nonNull.length > 0.75) return 'date';

  // Check categorical (low cardinality)
  const uniqueValues = new Set(nonNull.map(v => String(v).toLowerCase()));
  if (uniqueValues.size <= Math.min(20, nonNull.length * 0.3)) return 'categorical';

  return 'text';
}

export function computeNumericStats(values: number[]): NumericStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const stdDev = Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n);
  const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);

  return {
    mean: +mean.toFixed(4),
    median: +median.toFixed(4),
    min: sorted[0],
    max: sorted[n - 1],
    stdDev: +stdDev.toFixed(4),
    q1: +q1.toFixed(4),
    q3: +q3.toFixed(4),
    outliers: outliers.slice(0, 20),
  };
}

export function computeCategoryStats(values: string[]): CategoryStats {
  const freq: Record<string, number> = {};
  for (const v of values) {
    const k = String(v);
    freq[k] = (freq[k] || 0) + 1;
  }
  const topN = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([label, count]) => ({ label, count }));

  const total = values.length;
  const entropy = -Object.values(freq).reduce((acc, count) => {
    const p = count / total;
    return acc + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  return { frequencies: freq, topN, entropy: +entropy.toFixed(3) };
}

export function analyzeColumns(
  data: Record<string, unknown>[],
  columns: string[]
): ColumnAnalysis[] {
  return columns.map(col => {
    const rawValues = data.map(row => row[col] as string | number | null);
    const nonNull = rawValues.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = rawValues.length - nonNull.length;
    const uniqueCount = new Set(nonNull.map(String)).size;
    const type = inferDataType(rawValues);

    const colInfo: ColumnInfo = {
      name: col,
      type,
      nullCount,
      uniqueCount,
      sampleValues: nonNull.slice(0, 5),
    };

    const analysis: ColumnAnalysis = { column: colInfo };

    if (type === 'numeric') {
      const nums = nonNull.map(Number).filter(n => !isNaN(n));
      if (nums.length > 0) analysis.numeric = computeNumericStats(nums);
    } else if (type === 'categorical' || type === 'boolean') {
      analysis.category = computeCategoryStats(nonNull.map(String));
    } else if (type === 'date') {
      const dates = nonNull.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
        analysis.date = {
          min: sorted[0].toISOString().split('T')[0],
          max: sorted[sorted.length - 1].toISOString().split('T')[0],
          range: `${Math.round((sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / 86400000)} days`,
          trend: 'stable',
        };
      }
    }

    return analysis;
  });
}

export function computeCorrelations(
  data: Record<string, unknown>[],
  numericCols: string[]
): { col1: string; col2: string; coefficient: number; strength: 'strong' | 'moderate' | 'weak' }[] {
  const correlations = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const a = data.map(r => Number(r[numericCols[i]])).filter(n => !isNaN(n));
      const b = data.map(r => Number(r[numericCols[j]])).filter(n => !isNaN(n));
      const n = Math.min(a.length, b.length);
      if (n < 5) continue;

      const ax = a.slice(0, n), bx = b.slice(0, n);
      const ma = ax.reduce((s, v) => s + v, 0) / n;
      const mb = bx.reduce((s, v) => s + v, 0) / n;
      const cov = ax.reduce((s, v, i) => s + (v - ma) * (bx[i] - mb), 0) / n;
      const sa = Math.sqrt(ax.reduce((s, v) => s + Math.pow(v - ma, 2), 0) / n);
      const sb = Math.sqrt(bx.reduce((s, v) => s + Math.pow(v - mb, 2), 0) / n);
      if (sa === 0 || sb === 0) continue;

      const r = +(cov / (sa * sb)).toFixed(3);
      const abs = Math.abs(r);
      const strength: 'strong' | 'moderate' | 'weak' = abs > 0.7 ? 'strong' : abs > 0.4 ? 'moderate' : 'weak';
      if (abs > 0.3) correlations.push({ col1: numericCols[i], col2: numericCols[j], coefficient: r, strength });
    }
  }
  return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 10);
}

export function cleanData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map(row => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === '' || v === 'N/A' || v === 'NA' || v === 'null' || v === 'NULL') {
        cleaned[k] = null;
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  });
}
