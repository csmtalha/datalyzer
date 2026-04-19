import { ColumnAnalysis, ChartConfig } from '@/types/analytics';

const COLORS = [
  '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

export function generateChartConfigs(
  columns: ColumnAnalysis[],
  data: Record<string, unknown>[]
): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const numericCols = columns.filter(c => c.column.type === 'numeric' && c.numeric);
  const categoricalCols = columns.filter(c => c.column.type === 'categorical' && c.category);
  const dateCols = columns.filter(c => c.column.type === 'date');

  // Bar chart for top categorical column
  if (categoricalCols.length > 0) {
    const cat = categoricalCols[0];
    charts.push({
      type: 'bar',
      title: `${cat.column.name} Distribution`,
      xKey: 'label',
      yKey: 'count',
      data: cat.category!.topN.slice(0, 12),
      color: COLORS[0],
    });
  }

  // Second categorical as pie
  if (categoricalCols.length > 1) {
    const cat = categoricalCols[1];
    charts.push({
      type: 'pie',
      title: `${cat.column.name} Breakdown`,
      dataKey: 'count',
      data: cat.category!.topN.slice(0, 8).map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })),
      color: COLORS[1],
    });
  } else if (categoricalCols.length > 0) {
    // Use first categorical for pie too with fewer slices
    const cat = categoricalCols[0];
    if (cat.category!.topN.length > 2) {
      charts.push({
        type: 'pie',
        title: `${cat.column.name} Share`,
        dataKey: 'count',
        data: cat.category!.topN.slice(0, 6).map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })),
        color: COLORS[1],
      });
    }
  }

  // Line chart for time series
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0].column.name;
    const numCol = numericCols[0].column.name;
    const timeData = data
      .filter(r => r[dateCol] && r[numCol] !== null && r[numCol] !== undefined)
      .sort((a, b) => new Date(String(a[dateCol])).getTime() - new Date(String(b[dateCol])).getTime())
      .slice(0, 100)
      .map(r => ({
        date: String(r[dateCol]).split('T')[0],
        value: Number(r[numCol]),
      }));
    if (timeData.length > 1) {
      charts.push({
        type: 'line',
        title: `${numCol} Over Time`,
        xKey: 'date',
        yKey: 'value',
        data: timeData,
        color: COLORS[2],
      });
    }
  }

  // Histogram for first numeric column
  if (numericCols.length > 0) {
    const num = numericCols[0];
    const vals = data
      .map(r => Number(r[num.column.name]))
      .filter(n => !isNaN(n));
    const { min, max } = num.numeric!;
    const bucketCount = Math.min(20, Math.ceil(Math.sqrt(vals.length)));
    const bucketSize = (max - min) / bucketCount;
    const buckets: Record<string, number> = {};
    for (let i = 0; i < bucketCount; i++) {
      const label = +(min + i * bucketSize).toFixed(2);
      buckets[label] = 0;
    }
    for (const v of vals) {
      const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
      const label = +(min + idx * bucketSize).toFixed(2);
      buckets[label] = (buckets[label] || 0) + 1;
    }
    charts.push({
      type: 'histogram',
      title: `${num.column.name} Distribution`,
      xKey: 'range',
      yKey: 'count',
      data: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      color: COLORS[3],
    });
  }

  // Scatter plot for correlated numeric columns
  if (numericCols.length >= 2) {
    const col1 = numericCols[0].column.name;
    const col2 = numericCols[1].column.name;
    const scatterData = data
      .filter(r => r[col1] !== null && r[col2] !== null)
      .slice(0, 300)
      .map(r => ({ x: Number(r[col1]), y: Number(r[col2]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y));
    if (scatterData.length > 5) {
      charts.push({
        type: 'scatter',
        title: `${col1} vs ${col2}`,
        xKey: 'x',
        yKey: 'y',
        data: scatterData,
        color: COLORS[4],
      });
    }
  }

  // Additional bar charts for other categoricals
  for (let i = 2; i < Math.min(categoricalCols.length, 4); i++) {
    const cat = categoricalCols[i];
    charts.push({
      type: 'bar',
      title: `${cat.column.name} Frequency`,
      xKey: 'label',
      yKey: 'count',
      data: cat.category!.topN.slice(0, 10),
      color: COLORS[i % COLORS.length],
    });
  }

  // Extra numeric histograms
  for (let i = 1; i < Math.min(numericCols.length, 4); i++) {
    const num = numericCols[i];
    const vals = data.map(r => Number(r[num.column.name])).filter(n => !isNaN(n));
    const { min, max } = num.numeric!;
    if (min === max) continue;
    const bucketCount = Math.min(15, Math.ceil(Math.sqrt(vals.length)));
    const bucketSize = (max - min) / bucketCount;
    const buckets: Record<string, number> = {};
    for (let j = 0; j < bucketCount; j++) {
      buckets[+(min + j * bucketSize).toFixed(2)] = 0;
    }
    for (const v of vals) {
      const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
      const label = +(min + idx * bucketSize).toFixed(2);
      buckets[label] = (buckets[label] || 0) + 1;
    }
    charts.push({
      type: 'histogram',
      title: `${num.column.name} Distribution`,
      xKey: 'range',
      yKey: 'count',
      data: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      color: COLORS[(i + 3) % COLORS.length],
    });
  }

  return charts;
}
