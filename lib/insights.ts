import { ColumnAnalysis, Correlation, Insight } from '@/types/analytics';

export function generateInsights(
  columns: ColumnAnalysis[],
  correlations: Correlation[],
  rowCount: number
): Insight[] {
  const insights: Insight[] = [];

  insights.push({
    type: 'info',
    title: 'Dataset Size',
    description: `${rowCount.toLocaleString()} records across ${columns.length} fields analyzed.`,
    icon: 'database',
  });

  const highMissing = columns.filter(c => c.column.nullCount / rowCount > 0.2);
  if (highMissing.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Missing Data Detected',
      description: `${highMissing.map(c => c.column.name).join(', ')} have >20% missing values.`,
      icon: 'alert-triangle',
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Clean Dataset',
      description: 'All columns have less than 20% missing values — good data quality.',
      icon: 'check-circle',
    });
  }

  const strongCorr = correlations.filter(c => c.strength === 'strong');
  if (strongCorr.length > 0) {
    insights.push({
      type: 'trend',
      title: 'Strong Correlation Found',
      description: `${strongCorr[0].col1} and ${strongCorr[0].col2} are strongly correlated (r = ${strongCorr[0].coefficient}).`,
      icon: 'trending-up',
    });
  }

  const outlierCols = columns.filter(c => c.numeric && c.numeric.outliers.length > 0);
  if (outlierCols.length > 0) {
    const topOutlierCol = outlierCols.sort(
      (a, b) => (b.numeric?.outliers.length ?? 0) - (a.numeric?.outliers.length ?? 0)
    )[0];
    insights.push({
      type: 'warning',
      title: 'Outliers Detected',
      description: `"${topOutlierCol.column.name}" has ${topOutlierCol.numeric!.outliers.length} outlier values (IQR method).`,
      icon: 'zap',
    });
  }

  const highCard = columns.filter(c => c.column.type === 'categorical' && c.column.uniqueCount > 10);
  if (highCard.length > 0) {
    insights.push({
      type: 'info',
      title: 'High Variety Field',
      description: `"${highCard[0].column.name}" has ${highCard[0].column.uniqueCount} unique categories.`,
      icon: 'layers',
    });
  }

  const dateCols = columns.filter(c => c.column.type === 'date' && c.date);
  if (dateCols.length > 0) {
    insights.push({
      type: 'info',
      title: 'Time Series Detected',
      description: `Data spans ${dateCols[0].date!.range} from ${dateCols[0].date!.min} to ${dateCols[0].date!.max}.`,
      icon: 'calendar',
    });
  }

  // Dominant category detection
  const catCols = columns.filter(c => c.category && c.category.topN.length > 0);
  for (const col of catCols.slice(0, 2)) {
    const top = col.category!.topN[0];
    const totalFreq = Object.values(col.category!.frequencies).reduce((s, v) => s + v, 0);
    const pct = ((top.count / totalFreq) * 100).toFixed(0);
    if (Number(pct) > 30) {
      insights.push({
        type: 'trend',
        title: `"${top.label}" Dominates ${col.column.name}`,
        description: `"${top.label}" accounts for ${pct}% of all values in ${col.column.name}.`,
        icon: 'bar-chart-2',
      });
    }
  }

  // Numeric trend detection via first/last segment comparison
  const numCols = columns.filter(c => c.numeric);
  for (const col of numCols.slice(0, 2)) {
    const { mean, min, max, stdDev } = col.numeric!;
    const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

    if (cv > 80) {
      insights.push({
        type: 'warning',
        title: `High Volatility in ${col.column.name}`,
        description: `Coefficient of variation is ${cv.toFixed(0)}% — values are highly spread. Range: ${min.toLocaleString()} to ${max.toLocaleString()}.`,
        icon: 'zap',
      });
    } else if (numCols.indexOf(col) === 0) {
      insights.push({
        type: 'info',
        title: `Key Metric: ${col.column.name}`,
        description: `Mean: ${mean.toLocaleString()}, Median: ${col.numeric!.median.toLocaleString()}, Range: ${min.toLocaleString()} – ${max.toLocaleString()}.`,
        icon: 'bar-chart-2',
      });
    }
  }

  // Skewness detection
  for (const col of numCols.slice(0, 3)) {
    const { mean, median, stdDev } = col.numeric!;
    if (stdDev === 0) continue;
    const skew = (3 * (mean - median)) / stdDev;
    if (Math.abs(skew) > 1) {
      const direction = skew > 0 ? 'right (positively)' : 'left (negatively)';
      insights.push({
        type: 'info',
        title: `${col.column.name} is Skewed`,
        description: `Distribution is skewed to the ${direction}. Mean (${mean.toLocaleString()}) differs significantly from median (${median.toLocaleString()}).`,
        icon: 'trending-up',
      });
      break;
    }
  }

  // Concentration / entropy analysis
  for (const col of catCols.slice(0, 2)) {
    const entropy = col.category!.entropy;
    const maxEntropy = Math.log2(col.column.uniqueCount || 1);
    if (maxEntropy > 0 && entropy / maxEntropy < 0.5) {
      insights.push({
        type: 'trend',
        title: `${col.column.name} Is Highly Concentrated`,
        description: `Low entropy (${entropy.toFixed(2)}) means a few values dominate. Consider grouping rare categories.`,
        icon: 'layers',
      });
      break;
    }
  }

  return insights.slice(0, 10);
}
