import { ColumnAnalysis, Chart3DConfig } from '@/types/analytics';

export function generate3DChartConfigs(
  columns: ColumnAnalysis[],
  data: Record<string, unknown>[]
): Chart3DConfig[] {
  const charts: Chart3DConfig[] = [];
  const numericCols = columns.filter(c => c.column.type === 'numeric' && c.numeric);
  const categoricalCols = columns.filter(c => c.column.type === 'categorical' && c.category);

  // 3D Scatter: requires 3 numeric columns
  if (numericCols.length >= 3) {
    const [x, y, z] = numericCols.slice(0, 3);
    const scatterData = data
      .slice(0, 500)
      .map(row => ({
        x: Number(row[x.column.name]) || 0,
        y: Number(row[y.column.name]) || 0,
        z: Number(row[z.column.name]) || 0,
      }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y) && !isNaN(d.z));

    if (scatterData.length > 5) {
      charts.push({
        type: '3d_scatter',
        title: `${x.column.name} vs ${y.column.name} vs ${z.column.name}`,
        xLabel: x.column.name,
        yLabel: y.column.name,
        zLabel: z.column.name,
        data: scatterData,
      });
    }
  }

  // 3D Surface: use 2 numeric cols to build a heatmap surface
  if (numericCols.length >= 2) {
    const xCol = numericCols[0];
    const yCol = numericCols[1];
    const xVals = data.map(r => Number(r[xCol.column.name])).filter(n => !isNaN(n));
    const yVals = data.map(r => Number(r[yCol.column.name])).filter(n => !isNaN(n));

    if (xVals.length > 10) {
      const gridSize = Math.min(20, Math.ceil(Math.sqrt(xVals.length)));
      const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
      const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
      const xStep = (xMax - xMin) / gridSize || 1;
      const yStep = (yMax - yMin) / gridSize || 1;

      const grid: number[][] = Array.from({ length: gridSize }, () =>
        Array(gridSize).fill(0)
      );
      const counts: number[][] = Array.from({ length: gridSize }, () =>
        Array(gridSize).fill(0)
      );

      for (let i = 0; i < Math.min(data.length, 5000); i++) {
        const x = Number(data[i][xCol.column.name]);
        const y = Number(data[i][yCol.column.name]);
        if (isNaN(x) || isNaN(y)) continue;
        const xi = Math.min(gridSize - 1, Math.floor((x - xMin) / xStep));
        const yi = Math.min(gridSize - 1, Math.floor((y - yMin) / yStep));
        grid[xi][yi]++;
        counts[xi][yi]++;
      }

      charts.push({
        type: '3d_surface',
        title: `Density: ${xCol.column.name} × ${yCol.column.name}`,
        xLabel: xCol.column.name,
        yLabel: yCol.column.name,
        zLabel: 'Density',
        data: [{ grid, xMin, xMax, yMin, yMax, gridSize }],
      });
    }
  }

  // 3D Bar: categorical x numeric x numeric
  if (categoricalCols.length >= 1 && numericCols.length >= 2) {
    const cat = categoricalCols[0];
    const num1 = numericCols[0];
    const num2 = numericCols[1];
    const topCategories = cat.category!.topN.slice(0, 8).map(t => t.label);

    const barData = topCategories.map(label => {
      const rows = data.filter(r => String(r[cat.column.name]) === label);
      const avg1 = rows.reduce((s, r) => s + (Number(r[num1.column.name]) || 0), 0) / (rows.length || 1);
      const avg2 = rows.reduce((s, r) => s + (Number(r[num2.column.name]) || 0), 0) / (rows.length || 1);
      return { category: label, [num1.column.name]: +avg1.toFixed(2), [num2.column.name]: +avg2.toFixed(2) };
    });

    charts.push({
      type: '3d_bar',
      title: `${cat.column.name}: Avg ${num1.column.name} vs ${num2.column.name}`,
      xLabel: cat.column.name,
      yLabel: num1.column.name,
      zLabel: num2.column.name,
      data: barData,
    });
  }

  return charts;
}
