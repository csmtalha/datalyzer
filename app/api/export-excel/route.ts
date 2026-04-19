import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsResult } from '@/types/analytics';

export async function POST(req: NextRequest) {
  try {
    const body: AnalyticsResult = await req.json();
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw Data
    const rawWS = XLSX.utils.json_to_sheet(body.rawData);
    XLSX.utils.book_append_sheet(wb, rawWS, 'Raw Data');

    // Sheet 2: Summary Statistics
    const summaryRows: Record<string, unknown>[] = [];
    for (const col of body.columns) {
      const row: Record<string, unknown> = {
        Column: col.column.name,
        Type: col.column.type,
        'Null Count': col.column.nullCount,
        'Null %': ((col.column.nullCount / body.rowCount) * 100).toFixed(1) + '%',
        'Unique Values': col.column.uniqueCount,
      };
      if (col.numeric) {
        row['Mean'] = col.numeric.mean;
        row['Median'] = col.numeric.median;
        row['Min'] = col.numeric.min;
        row['Max'] = col.numeric.max;
        row['Std Dev'] = col.numeric.stdDev;
        row['Q1'] = col.numeric.q1;
        row['Q3'] = col.numeric.q3;
        row['Outlier Count'] = col.numeric.outliers.length;
      }
      summaryRows.push(row);
    }
    const summaryWS = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary Statistics');

    // Sheet 3: Correlations
    if (body.correlations.length > 0) {
      const corrRows = body.correlations.map(c => ({
        Column1: c.col1,
        Column2: c.col2,
        'Correlation Coefficient': c.coefficient,
        Strength: c.strength,
      }));
      const corrWS = XLSX.utils.json_to_sheet(corrRows);
      XLSX.utils.book_append_sheet(wb, corrWS, 'Correlations');
    }

    // Sheet 4: Insights
    const insightRows = body.insights.map(i => ({
      Type: i.type,
      Title: i.title,
      Description: i.description,
    }));
    const insightWS = XLSX.utils.json_to_sheet(insightRows);
    XLSX.utils.book_append_sheet(wb, insightWS, 'Key Insights');

    // Sheet 5: Categorical Frequencies
    for (const col of body.columns) {
      if (col.category && col.category.topN.length > 0) {
        const freqWS = XLSX.utils.json_to_sheet(
          col.category.topN.map(d => ({ Value: d.label, Count: d.count }))
        );
        const sheetName = col.column.name.substring(0, 25) + ' Freq';
        XLSX.utils.book_append_sheet(wb, freqWS, sheetName);
      }
    }

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="datalyze-report-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
