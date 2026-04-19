import { NextRequest, NextResponse } from 'next/server';
import { analyzeColumns, computeCorrelations, cleanData } from '@/lib/analytics';
import { generateInsights } from '@/lib/insights';
import { AnalyticsResult } from '@/types/analytics';

async function parseCSV(text: string): Promise<Record<string, unknown>[]> {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  // Detect delimiter
  const delimiters = [',', ';', '\t', '|'];
  const header = lines[0];
  const delimiter = delimiters.reduce((best, d) => 
    (header.split(d).length > header.split(best).length ? d : best), ',');
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? null; });
    return row;
  });
}

async function parseXLSX(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

async function parsePDF(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  try {
    // For PDFs, we extract text and try to parse tabular data
    const uint8 = new Uint8Array(buffer);
    const text = await extractPDFText(uint8);
    return parseTextToTable(text);
  } catch {
    return [];
  }
}

async function extractPDFText(data: Uint8Array): Promise<string> {
  // Simple PDF text extraction - look for text streams
  const decoder = new TextDecoder('latin1');
  const content = decoder.decode(data);
  
  // Extract text between BT and ET markers (PDF text objects)
  const textBlocks: string[] = [];
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let tj;
    while ((tj = tjRegex.exec(block)) !== null) {
      textBlocks.push(tj[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))));
    }
  }
  return textBlocks.join(' ');
}

function parseTextToTable(text: string): Record<string, unknown>[] {
  const lines = text.split(/\n|\r\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    // Return unstructured text as single column
    return lines.map((line, i) => ({ row: i + 1, content: line }));
  }
  
  // Try to detect table structure
  const rows = lines.map(l => l.split(/\s{2,}|\t/).filter(Boolean));
  const maxCols = Math.max(...rows.map(r => r.length));
  if (maxCols < 2) {
    return lines.map((line, i) => ({ row: i + 1, content: line }));
  }
  
  const headers = rows[0].length >= 2 ? rows[0] : Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
  return rows.slice(1).map(row => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
    return obj;
  });
}

async function parseDOCX(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return parseTextToTable(result.value);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const supportedTypes = ['csv', 'xlsx', 'xls', 'pdf', 'docx'];
    if (!supportedTypes.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    let rawData: Record<string, unknown>[] = [];

    if (ext === 'csv') {
      rawData = await parseCSV(new TextDecoder().decode(buffer));
    } else if (ext === 'xlsx' || ext === 'xls') {
      rawData = await parseXLSX(buffer);
    } else if (ext === 'pdf') {
      rawData = await parsePDF(buffer);
    } else if (ext === 'docx') {
      rawData = await parseDOCX(buffer);
    }

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'No data could be extracted from the file.' }, { status: 422 });
    }

    const cleanedData = cleanData(rawData.slice(0, 10000));
    const columnNames = Object.keys(cleanedData[0] || {});
    const columns = analyzeColumns(cleanedData, columnNames);
    const numericCols = columns.filter(c => c.column.type === 'numeric').map(c => c.column.name);
    const correlations = computeCorrelations(cleanedData, numericCols);
    const insights = generateInsights(columns, correlations, cleanedData.length);

    const result: AnalyticsResult = {
      fileName: file.name,
      fileType: ext,
      rowCount: cleanedData.length,
      columnCount: columnNames.length,
      columns,
      correlations,
      insights,
      rawData: cleanedData.slice(0, 500), // return first 500 rows for display
      processedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Parse error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}
