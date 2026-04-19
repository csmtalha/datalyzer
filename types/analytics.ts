export type DataType = 'numeric' | 'categorical' | 'date' | 'text' | 'boolean';

export interface ColumnInfo {
  name: string;
  type: DataType;
  nullCount: number;
  uniqueCount: number;
  sampleValues: (string | number | null)[];
}

export interface NumericStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
  outliers: number[];
}

export interface CategoryStats {
  frequencies: Record<string, number>;
  topN: { label: string; count: number }[];
  entropy: number;
}

export interface DateStats {
  min: string;
  max: string;
  range: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'none';
}

export interface ColumnAnalysis {
  column: ColumnInfo;
  numeric?: NumericStats;
  category?: CategoryStats;
  date?: DateStats;
}

export interface Correlation {
  col1: string;
  col2: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface Insight {
  type: 'info' | 'warning' | 'success' | 'trend';
  title: string;
  description: string;
  icon: string;
}

export interface AnalyticsResult {
  fileName: string;
  fileType: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnAnalysis[];
  correlations: Correlation[];
  insights: Insight[];
  rawData: Record<string, unknown>[];
  processedAt: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'histogram' | 'scatter';
  title: string;
  xKey?: string;
  yKey?: string;
  dataKey?: string;
  data: Record<string, unknown>[];
  color?: string;
}
