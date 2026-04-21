import OpenAI from 'openai';
import { ColumnAnalysis, Correlation } from '@/types/analytics';

export interface AIInsight {
  headline: string;
  detail: string;
  category: 'trend' | 'anomaly' | 'recommendation' | 'summary' | 'pattern';
  confidence: 'high' | 'medium' | 'low';
}

export interface AIAnalysisResult {
  summary: string;
  insights: AIInsight[];
  recommendations: string[];
  dataStory: string;
}

function isAIEnabled(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key.length > 10 && key.startsWith('sk-');
}

function buildDataSnapshot(
  columns: ColumnAnalysis[],
  correlations: Correlation[],
  rowCount: number,
  sampleRows: Record<string, unknown>[]
): string {
  const colSummaries = columns.slice(0, 15).map(c => {
    let detail = `"${c.column.name}" (${c.column.type}, ${c.column.uniqueCount} unique, ${c.column.nullCount} nulls)`;
    if (c.numeric) {
      detail += ` — mean: ${c.numeric.mean}, median: ${c.numeric.median}, min: ${c.numeric.min}, max: ${c.numeric.max}, stdDev: ${c.numeric.stdDev}, outliers: ${c.numeric.outliers.length}`;
    }
    if (c.category) {
      const topItems = c.category.topN.slice(0, 5).map(t => `${t.label}(${t.count})`).join(', ');
      detail += ` — top: ${topItems}`;
    }
    if (c.date) {
      detail += ` — range: ${c.date.min} to ${c.date.max} (${c.date.range})`;
    }
    return detail;
  });

  const corrSummary = correlations.slice(0, 5).map(c =>
    `${c.col1} ↔ ${c.col2}: r=${c.coefficient} (${c.strength})`
  ).join('\n');

  const sampleStr = JSON.stringify(sampleRows.slice(0, 3), null, 2);

  return `Dataset: ${rowCount} rows, ${columns.length} columns

Columns:
${colSummaries.join('\n')}

Top Correlations:
${corrSummary || 'None significant'}

Sample rows:
${sampleStr}`;
}

export async function analyzeWithAI(
  columns: ColumnAnalysis[],
  correlations: Correlation[],
  rowCount: number,
  sampleRows: Record<string, unknown>[],
  fileName: string
): Promise<AIAnalysisResult | null> {
  if (!isAIEnabled()) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const snapshot = buildDataSnapshot(columns, correlations, rowCount, sampleRows);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are an expert data analyst. Analyze datasets and provide actionable business insights. Be specific with numbers. Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary of the dataset",
  "insights": [
    {"headline": "short punchy headline like 'Sales peaked in March (+32%)'", "detail": "1-2 sentence explanation", "category": "trend|anomaly|recommendation|summary|pattern", "confidence": "high|medium|low"}
  ],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "dataStory": "A 2-3 sentence narrative that tells the story of this data as if presenting to a CEO"
}`
        },
        {
          role: 'user',
          content: `Analyze this dataset from file "${fileName}":\n\n${snapshot}\n\nProvide 4-6 insights. Focus on trends, anomalies, dominant patterns, and business recommendations. Use actual numbers from the data.`
        }
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as AIAnalysisResult;

    if (!parsed.summary || !Array.isArray(parsed.insights)) return null;

    return parsed;
  } catch (err) {
    console.error('AI analysis error:', err);
    return null;
  }
}
