import {
  ColumnAnalysis, Correlation, DataProfile, DataGrade,
  ColumnDistribution, DistributionShape, AnomalyInfo,
  PatternInfo, SegmentInfo,
} from '@/types/analytics';

function computeSkewness(values: number[], mean: number, stdDev: number): number {
  if (stdDev === 0 || values.length < 3) return 0;
  const n = values.length;
  const sum = values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

function computeKurtosis(values: number[], mean: number, stdDev: number): number {
  if (stdDev === 0 || values.length < 4) return 0;
  const n = values.length;
  const sum = values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
}

function detectDistributionShape(skew: number, kurtosis: number, values: number[]): DistributionShape {
  if (values.length < 5) return 'sparse';

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  if (iqr === 0) return 'sparse';

  // Bimodal: check for two concentration areas
  const bins = 20;
  const min = sorted[0], max = sorted[n - 1];
  const binSize = (max - min) / bins || 1;
  const hist = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / binSize));
    hist[idx]++;
  }
  let peaks = 0;
  for (let i = 1; i < bins - 1; i++) {
    if (hist[i] > hist[i - 1] && hist[i] > hist[i + 1] && hist[i] > n * 0.05) peaks++;
  }
  if (peaks >= 2) return 'bimodal';

  if (Math.abs(skew) < 0.5 && Math.abs(kurtosis) < 1.5) return 'normal';
  if (Math.abs(skew) < 0.3 && kurtosis < -1) return 'uniform';
  if (skew > 1.5) return 'exponential';
  if (skew > 0.5) return 'skewed-right';
  if (skew < -0.5) return 'skewed-left';

  return 'unknown';
}

function normalityScore(skew: number, kurtosis: number): number {
  const skewPenalty = Math.min(50, Math.abs(skew) * 20);
  const kurtPenalty = Math.min(30, Math.abs(kurtosis) * 5);
  return Math.max(0, Math.round(100 - skewPenalty - kurtPenalty));
}

function detectAnomalies(
  data: Record<string, unknown>[],
  columns: ColumnAnalysis[]
): AnomalyInfo[] {
  const anomalies: AnomalyInfo[] = [];
  const numericCols = columns.filter(c => c.column.type === 'numeric' && c.numeric);

  for (const col of numericCols) {
    const { mean, stdDev } = col.numeric!;
    if (stdDev === 0) continue;

    for (let i = 0; i < data.length; i++) {
      const val = Number(data[i][col.column.name]);
      if (isNaN(val)) continue;
      const z = Math.abs((val - mean) / stdDev);
      if (z > 2.5) {
        const severity: AnomalyInfo['severity'] = z > 4 ? 'critical' : z > 3 ? 'high' : 'medium';
        anomalies.push({
          column: col.column.name,
          value: val,
          zScore: +z.toFixed(2),
          rowIndex: i,
          severity,
        });
      }
    }
  }

  return anomalies
    .sort((a, b) => b.zScore - a.zScore)
    .slice(0, 50);
}

function detectPatterns(
  data: Record<string, unknown>[],
  columns: ColumnAnalysis[]
): PatternInfo[] {
  const patterns: PatternInfo[] = [];
  const numericCols = columns.filter(c => c.column.type === 'numeric' && c.numeric);

  for (const col of numericCols.slice(0, 6)) {
    const values = data.map(r => Number(r[col.column.name])).filter(n => !isNaN(n));
    if (values.length < 5) continue;

    // Monotonic trend
    let increasing = 0, decreasing = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increasing++;
      if (values[i] < values[i - 1]) decreasing++;
    }
    const total = values.length - 1;
    if (increasing / total > 0.85) {
      patterns.push({
        type: 'monotonic-increase',
        column: col.column.name,
        description: `${col.column.name} shows a consistent upward trend (${((increasing / total) * 100).toFixed(0)}% of transitions increase)`,
        confidence: +(increasing / total).toFixed(2),
      });
    } else if (decreasing / total > 0.85) {
      patterns.push({
        type: 'monotonic-decrease',
        column: col.column.name,
        description: `${col.column.name} shows a consistent downward trend (${((decreasing / total) * 100).toFixed(0)}% of transitions decrease)`,
        confidence: +(decreasing / total).toFixed(2),
      });
    }

    // Spike detection
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
    if (std > 0) {
      const spikeCount = values.filter(v => Math.abs(v - mean) > 3 * std).length;
      if (spikeCount > 0 && spikeCount <= values.length * 0.05) {
        patterns.push({
          type: 'spike',
          column: col.column.name,
          description: `${spikeCount} spike${spikeCount > 1 ? 's' : ''} detected in ${col.column.name} (>3σ from mean)`,
          confidence: 0.8,
        });
      }
    }

    // Step-change detection
    if (values.length >= 10) {
      const halfIdx = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, halfIdx);
      const secondHalf = values.slice(halfIdx);
      const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (std > 0 && Math.abs(mean2 - mean1) > 2 * std) {
        const dir = mean2 > mean1 ? 'upward' : 'downward';
        patterns.push({
          type: 'step-change',
          column: col.column.name,
          description: `${col.column.name} shows a ${dir} step-change at midpoint (${mean1.toFixed(1)} → ${mean2.toFixed(1)})`,
          confidence: 0.7,
        });
      }
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 15);
}

function detectSegments(
  data: Record<string, unknown>[],
  columns: ColumnAnalysis[]
): SegmentInfo[] {
  const segments: SegmentInfo[] = [];
  const categoricalCols = columns.filter(c => c.column.type === 'categorical' && c.category);
  const numericCols = columns.filter(c => c.column.type === 'numeric' && c.numeric);

  for (const cat of categoricalCols.slice(0, 3)) {
    const topLabels = cat.category!.topN.slice(0, 10).map(t => t.label);
    const segs = topLabels.map(label => {
      const matchingRows = data.filter(r => String(r[cat.column.name]) === label);
      const avgNumeric: Record<string, number> = {};
      for (const num of numericCols.slice(0, 5)) {
        const vals = matchingRows.map(r => Number(r[num.column.name])).filter(n => !isNaN(n));
        if (vals.length > 0) {
          avgNumeric[num.column.name] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        }
      }
      return { label, count: matchingRows.length, avgNumeric };
    });

    if (segs.length >= 2) {
      segments.push({ column: cat.column.name, segments: segs });
    }
  }

  return segments;
}

function computeGrade(score: number): DataGrade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 78) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function profileData(
  columns: ColumnAnalysis[],
  correlations: Correlation[],
  data: Record<string, unknown>[]
): DataProfile {
  const totalCells = data.length * columns.length;
  const nullCells = columns.reduce((s, c) => s + c.column.nullCount, 0);
  const completeness = totalCells > 0 ? +((1 - nullCells / totalCells) * 100).toFixed(1) : 100;

  // Uniqueness: ratio of unique rows to total
  const rowKeys = new Set(data.map(r => JSON.stringify(r)));
  const uniqueness = data.length > 0 ? +((rowKeys.size / data.length) * 100).toFixed(1) : 100;

  // Validity: proportion of non-text, well-typed columns
  const wellTyped = columns.filter(c => c.column.type !== 'text').length;
  const validity = columns.length > 0 ? +((wellTyped / columns.length) * 100).toFixed(1) : 0;

  // Consistency: low-cardinality columns with no casing issues
  const catCols = columns.filter(c => c.column.type === 'categorical');
  let consistencyScore = 100;
  for (const col of catCols) {
    const vals = data.map(r => String(r[col.column.name] ?? '')).filter(Boolean);
    const unique = new Set(vals);
    const uniqueLower = new Set(vals.map(v => v.toLowerCase()));
    if (unique.size > uniqueLower.size) consistencyScore -= 10;
  }
  const consistency = Math.max(0, Math.min(100, consistencyScore));

  // Distributions
  const distributions: ColumnDistribution[] = [];
  const numericCols = columns.filter(c => c.column.type === 'numeric' && c.numeric);
  for (const col of numericCols) {
    const values = data.map(r => Number(r[col.column.name])).filter(n => !isNaN(n));
    if (values.length < 3) continue;
    const { mean, stdDev } = col.numeric!;
    const skew = computeSkewness(values, mean, stdDev);
    const kurt = computeKurtosis(values, mean, stdDev);
    const shape = detectDistributionShape(skew, kurt, values);
    distributions.push({
      column: col.column.name,
      shape,
      skewness: +skew.toFixed(3),
      kurtosis: +kurt.toFixed(3),
      normalityScore: normalityScore(skew, kurt),
    });
  }

  const anomalies = detectAnomalies(data, columns);
  const patterns = detectPatterns(data, columns);
  const segments = detectSegments(data, columns);

  const typeBreakdown: Record<string, number> = {};
  for (const col of columns) {
    typeBreakdown[col.column.type] = (typeBreakdown[col.column.type] || 0) + 1;
  }

  const memoryBytes = totalCells * 50;
  const memoryEstimate = memoryBytes < 1024 * 1024
    ? `${(memoryBytes / 1024).toFixed(0)} KB`
    : `${(memoryBytes / (1024 * 1024)).toFixed(1)} MB`;

  const dimensionality: DataProfile['dimensionality'] =
    columns.length <= 5 ? 'low' :
    columns.length <= 15 ? 'medium' :
    columns.length <= 50 ? 'high' : 'very-high';

  const corrStrength = correlations.length > 0
    ? correlations.reduce((s, c) => s + Math.abs(c.coefficient), 0) / correlations.length
    : 0;
  const complexityScore = Math.min(100, Math.round(
    (columns.length * 3) +
    (data.length > 1000 ? 20 : data.length > 100 ? 10 : 5) +
    (numericCols.length * 5) +
    (correlations.length * 4) +
    (anomalies.length * 2) +
    (corrStrength * 20)
  ));

  const anomalyPenalty = Math.min(15, anomalies.filter(a => a.severity === 'critical').length * 5);
  const healthScore = Math.max(0, Math.round(
    completeness * 0.35 +
    consistency * 0.20 +
    uniqueness * 0.20 +
    validity * 0.25 -
    anomalyPenalty
  ));

  return {
    healthScore,
    grade: computeGrade(healthScore),
    completeness,
    consistency,
    uniqueness,
    validity,
    distributions,
    anomalies,
    patterns,
    segments,
    typeBreakdown,
    memoryEstimate,
    dimensionality,
    complexityScore,
  };
}
