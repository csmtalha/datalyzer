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

  // Data quality assessment
  const totalNulls = columns.reduce((s, c) => s + c.column.nullCount, 0);
  const totalCells = rowCount * columns.length;
  const overallNullPct = totalCells > 0 ? (totalNulls / totalCells) * 100 : 0;

  const highMissing = columns.filter(c => c.column.nullCount / rowCount > 0.2);
  if (highMissing.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Missing Data Detected',
      description: `${highMissing.map(c => c.column.name).join(', ')} have >20% missing values. Overall completeness: ${(100 - overallNullPct).toFixed(1)}%.`,
      icon: 'alert-triangle',
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Excellent Data Completeness',
      description: `${(100 - overallNullPct).toFixed(1)}% complete — all columns have less than 20% missing values.`,
      icon: 'check-circle',
    });
  }

  // Correlation analysis
  const strongCorr = correlations.filter(c => c.strength === 'strong');
  const moderateCorr = correlations.filter(c => c.strength === 'moderate');
  if (strongCorr.length > 0) {
    const top = strongCorr[0];
    const direction = top.coefficient > 0 ? 'positive' : 'negative';
    insights.push({
      type: 'trend',
      title: `Strong ${direction} Correlation`,
      description: `${top.col1} and ${top.col2} are strongly ${direction}ly correlated (r = ${top.coefficient}). ${strongCorr.length > 1 ? `Found ${strongCorr.length} strong correlations total.` : ''}`,
      icon: 'trending-up',
    });
  }
  if (moderateCorr.length > 2) {
    insights.push({
      type: 'info',
      title: 'Rich Interconnections',
      description: `${moderateCorr.length} moderate correlations found — your data has meaningful relationships between multiple variables.`,
      icon: 'trending-up',
    });
  }

  // Outlier analysis
  const outlierCols = columns.filter(c => c.numeric && c.numeric.outliers.length > 0);
  if (outlierCols.length > 0) {
    const totalOutliers = outlierCols.reduce((s, c) => s + (c.numeric?.outliers.length ?? 0), 0);
    const topOutlierCol = outlierCols.sort(
      (a, b) => (b.numeric?.outliers.length ?? 0) - (a.numeric?.outliers.length ?? 0)
    )[0];
    insights.push({
      type: 'warning',
      title: 'Outliers Detected',
      description: `${totalOutliers} outlier values across ${outlierCols.length} column${outlierCols.length > 1 ? 's' : ''}. Worst: "${topOutlierCol.column.name}" with ${topOutlierCol.numeric!.outliers.length} outliers (IQR method).`,
      icon: 'zap',
    });
  }

  // High cardinality
  const highCard = columns.filter(c => c.column.type === 'categorical' && c.column.uniqueCount > 10);
  if (highCard.length > 0) {
    insights.push({
      type: 'info',
      title: 'High Variety Field',
      description: `"${highCard[0].column.name}" has ${highCard[0].column.uniqueCount} unique categories — consider grouping rare values.`,
      icon: 'layers',
    });
  }

  // Time series
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
    if (Number(pct) > 50) {
      insights.push({
        type: 'warning',
        title: `"${top.label}" Dominates ${col.column.name}`,
        description: `"${top.label}" accounts for ${pct}% of all values — potential data imbalance. Consider stratified analysis.`,
        icon: 'bar-chart-2',
      });
    } else if (Number(pct) > 30) {
      insights.push({
        type: 'trend',
        title: `Leading Category in ${col.column.name}`,
        description: `"${top.label}" leads at ${pct}% of values. Top 3: ${col.category!.topN.slice(0, 3).map(t => `${t.label} (${((t.count / totalFreq) * 100).toFixed(0)}%)`).join(', ')}.`,
        icon: 'bar-chart-2',
      });
    }
  }

  // Numeric distribution insights
  const numCols = columns.filter(c => c.numeric);
  for (const col of numCols.slice(0, 3)) {
    const { mean, min, max, stdDev, median } = col.numeric!;
    const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;
    const range = max - min;

    if (cv > 100) {
      insights.push({
        type: 'warning',
        title: `Extreme Volatility: ${col.column.name}`,
        description: `CV of ${cv.toFixed(0)}% — values are wildly spread from ${min.toLocaleString()} to ${max.toLocaleString()} (range: ${range.toLocaleString()}).`,
        icon: 'zap',
      });
    } else if (cv > 80) {
      insights.push({
        type: 'warning',
        title: `High Volatility in ${col.column.name}`,
        description: `CV is ${cv.toFixed(0)}% — values range from ${min.toLocaleString()} to ${max.toLocaleString()}.`,
        icon: 'zap',
      });
    } else if (numCols.indexOf(col) === 0) {
      insights.push({
        type: 'info',
        title: `Key Metric: ${col.column.name}`,
        description: `Mean: ${mean.toLocaleString()}, Median: ${median.toLocaleString()}, Range: ${min.toLocaleString()} – ${max.toLocaleString()}.`,
        icon: 'bar-chart-2',
      });
    }

    // Skewness detection
    if (stdDev > 0) {
      const skew = (3 * (mean - median)) / stdDev;
      if (Math.abs(skew) > 1.5) {
        const direction = skew > 0 ? 'right (long tail of high values)' : 'left (long tail of low values)';
        insights.push({
          type: 'info',
          title: `${col.column.name} is Heavily Skewed`,
          description: `Distribution is skewed to the ${direction}. Mean (${mean.toLocaleString()}) differs significantly from median (${median.toLocaleString()}).`,
          icon: 'trending-up',
        });
        break;
      }
    }
  }

  // Concentration / entropy analysis
  for (const col of catCols.slice(0, 2)) {
    const entropy = col.category!.entropy;
    const maxEntropy = Math.log2(col.column.uniqueCount || 1);
    if (maxEntropy > 0) {
      const ratio = entropy / maxEntropy;
      if (ratio < 0.4) {
        insights.push({
          type: 'trend',
          title: `${col.column.name} Is Highly Concentrated`,
          description: `Low entropy (${entropy.toFixed(2)}/${maxEntropy.toFixed(2)}) — a few values dominate. Consider grouping rare categories.`,
          icon: 'layers',
        });
        break;
      } else if (ratio > 0.9 && col.column.uniqueCount > 5) {
        insights.push({
          type: 'info',
          title: `${col.column.name} Is Very Diverse`,
          description: `High entropy (${entropy.toFixed(2)}/${maxEntropy.toFixed(2)}) — values are evenly distributed across ${col.column.uniqueCount} categories.`,
          icon: 'layers',
        });
        break;
      }
    }
  }

  // Boolean field summary
  const boolCols = columns.filter(c => c.column.type === 'boolean');
  if (boolCols.length > 0) {
    insights.push({
      type: 'info',
      title: `${boolCols.length} Boolean Field${boolCols.length > 1 ? 's' : ''} Found`,
      description: `Fields: ${boolCols.map(c => c.column.name).join(', ')}. Useful for segmentation and filtering.`,
      icon: 'check-circle',
    });
  }

  // Column type diversity
  const types = new Set(columns.map(c => c.column.type));
  if (types.size >= 4) {
    insights.push({
      type: 'success',
      title: 'Rich Data Types',
      description: `${types.size} distinct column types detected (${[...types].join(', ')}). Great for multi-dimensional analysis.`,
      icon: 'layers',
    });
  }

  return insights.slice(0, 12);
}
