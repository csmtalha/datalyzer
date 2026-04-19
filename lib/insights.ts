import { ColumnAnalysis, Correlation, Insight } from '@/types/analytics';

export function generateInsights(
  columns: ColumnAnalysis[],
  correlations: Correlation[],
  rowCount: number
): Insight[] {
  const insights: Insight[] = [];

  // Row count
  insights.push({
    type: 'info',
    title: 'Dataset Size',
    description: `${rowCount.toLocaleString()} records across ${columns.length} fields analyzed.`,
    icon: 'database',
  });

  // Missing values
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

  // Strong correlations
  const strongCorr = correlations.filter(c => c.strength === 'strong');
  if (strongCorr.length > 0) {
    insights.push({
      type: 'trend',
      title: 'Strong Correlation Found',
      description: `${strongCorr[0].col1} and ${strongCorr[0].col2} are strongly correlated (r = ${strongCorr[0].coefficient}).`,
      icon: 'trending-up',
    });
  }

  // Outliers
  const outlierCols = columns.filter(c => c.numeric && c.numeric.outliers.length > 0);
  if (outlierCols.length > 0) {
    const topOutlierCol = outlierCols.sort((a, b) => (b.numeric?.outliers.length ?? 0) - (a.numeric?.outliers.length ?? 0))[0];
    insights.push({
      type: 'warning',
      title: 'Outliers Detected',
      description: `"${topOutlierCol.column.name}" has ${topOutlierCol.numeric!.outliers.length} outlier values (IQR method).`,
      icon: 'zap',
    });
  }

  // High cardinality categorical
  const highCard = columns.filter(c => c.column.type === 'categorical' && c.column.uniqueCount > 10);
  if (highCard.length > 0) {
    insights.push({
      type: 'info',
      title: 'High Variety Field',
      description: `"${highCard[0].column.name}" has ${highCard[0].column.uniqueCount} unique categories.`,
      icon: 'layers',
    });
  }

  // Date columns
  const dateCols = columns.filter(c => c.column.type === 'date' && c.date);
  if (dateCols.length > 0) {
    insights.push({
      type: 'info',
      title: 'Time Series Detected',
      description: `Data spans ${dateCols[0].date!.range} from ${dateCols[0].date!.min} to ${dateCols[0].date!.max}.`,
      icon: 'calendar',
    });
  }

  // Numeric summary
  const numCols = columns.filter(c => c.numeric);
  if (numCols.length > 0) {
    const topNum = numCols[0];
    insights.push({
      type: 'info',
      title: `Key Metric: ${topNum.column.name}`,
      description: `Mean: ${topNum.numeric!.mean.toLocaleString()}, Median: ${topNum.numeric!.median.toLocaleString()}, Range: ${topNum.numeric!.min} – ${topNum.numeric!.max}.`,
      icon: 'bar-chart-2',
    });
  }

  return insights.slice(0, 8);
}
