import { NextRequest, NextResponse } from 'next/server';
import { analyzeColumns, computeCorrelations } from '@/lib/analytics';
import { generateInsights } from '@/lib/insights';
import { deepCleanData } from '@/lib/dataCleaner';
import { analyzeWithAI } from '@/lib/ai/analyzer';
import { generate3DChartConfigs } from '@/lib/chart3DConfig';
import { AnalyticsResult } from '@/types/analytics';
import { createClient } from '@/lib/supabase/server';
import { checkUploadAllowed, logUsage } from '@/lib/usage';
import { PlanType, PLAN_LIMITS } from '@/types/database';

// ── Parsers ────────────────────────────────────────────────

function parseCSV(text: string, delim?: string): Record<string, unknown>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const delimiters = [',', ';', '\t', '|'];
  const header = lines[0];
  const delimiter = delim ?? delimiters.reduce((best, d) =>
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
  if (headers.length < 2 && !delim) return [];

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
    const uint8 = new Uint8Array(buffer);
    const text = await extractPDFText(uint8);
    return smartParseText(text);
  } catch {
    return [];
  }
}

async function extractPDFText(data: Uint8Array): Promise<string> {
  const decoder = new TextDecoder('latin1');
  const content = decoder.decode(data);
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

async function parseDOCX(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return smartParseText(result.value);
  } catch {
    return [];
  }
}

function parseJSON(text: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        return parsed as Record<string, unknown>[];
      }
      return parsed.map((item, i) => ({ index: i, value: item }));
    }
    if (typeof parsed === 'object' && parsed !== null) {
      for (const key of Object.keys(parsed)) {
        const val = parsed[key];
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          return val as Record<string, unknown>[];
        }
      }
      return flattenObject(parsed);
    }
    return [];
  } catch {
    return [];
  }
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown>[] {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey)[0] || {});
    } else {
      result[fullKey] = value;
    }
  }
  return [result];
}

function parseXML(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const rowRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let rootMatch;
  const allMatches: { tag: string; content: string }[] = [];

  while ((rootMatch = rowRegex.exec(text)) !== null) {
    allMatches.push({ tag: rootMatch[1], content: rootMatch[2] });
  }

  const tagCounts: Record<string, number> = {};
  for (const m of allMatches) {
    tagCounts[m.tag] = (tagCounts[m.tag] || 0) + 1;
  }
  const repeatingTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

  if (repeatingTag && repeatingTag[1] > 1) {
    const itemRegex = new RegExp(`<${repeatingTag[0]}>[\\s\\S]*?</${repeatingTag[0]}>`, 'g');
    let itemMatch;
    while ((itemMatch = itemRegex.exec(text)) !== null) {
      const item = itemMatch[0];
      const row: Record<string, unknown> = {};
      const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(item)) !== null) {
        row[fieldMatch[1]] = fieldMatch[2].trim();
      }
      if (Object.keys(row).length > 0) rows.push(row);
    }
  }

  return rows;
}

function smartParseText(text: string): Record<string, unknown>[] {
  if (!text || text.trim().length === 0) return [];

  // Try JSON first
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const jsonResult = parseJSON(trimmed);
    if (jsonResult.length > 0) return jsonResult;
  }

  // Try XML
  if (trimmed.startsWith('<') && trimmed.includes('</')) {
    const xmlResult = parseXML(trimmed);
    if (xmlResult.length > 0) return xmlResult;
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return lines.map((line, i) => ({ row: i + 1, content: line }));
  }

  // Try TSV (tab-separated)
  const tabCols = lines[0].split('\t');
  if (tabCols.length >= 2) {
    const result = parseCSV(text, '\t');
    if (result.length > 0 && Object.keys(result[0]).length >= 2) return result;
  }

  // Try pipe-separated
  const pipeCols = lines[0].split('|').map(s => s.trim()).filter(Boolean);
  if (pipeCols.length >= 2) {
    const result = parseCSV(text, '|');
    if (result.length > 0 && Object.keys(result[0]).length >= 2) return result;
  }

  // Try CSV/semicolon
  const csvResult = parseCSV(text);
  if (csvResult.length > 0 && Object.keys(csvResult[0]).length >= 2) return csvResult;

  // Try fixed-width: detect columns by consistent spacing
  const rows = lines.map(l => l.split(/\s{2,}/).filter(Boolean));
  const maxCols = Math.max(...rows.map(r => r.length));
  if (maxCols >= 2) {
    const headers = rows[0].length >= 2 ? rows[0] : Array.from({ length: maxCols }, (_, i) => `Column_${i + 1}`);
    const dataRows = rows[0].length >= 2 ? rows.slice(1) : rows;
    return dataRows.map(row => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
      return obj;
    });
  }

  // Try key:value pairs (like config/log files)
  const kvRows: Record<string, unknown>[] = [];
  const kvObj: Record<string, unknown> = {};
  const kvRegex = /^([^:=]+)[=:](.+)$/;
  let kvCount = 0;
  for (const line of lines) {
    const m = line.match(kvRegex);
    if (m) {
      kvObj[m[1].trim()] = m[2].trim();
      kvCount++;
    }
  }
  if (kvCount >= 3) {
    kvRows.push(kvObj);
    return kvRows;
  }

  // Last resort: each line is a row with the content
  return lines.map((line, i) => ({ row: i + 1, content: line }));
}

// ── Main handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let plan: PlanType = 'free';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      plan = (profile?.plan ?? 'free') as PlanType;

      const fileSizeMb = file.size / (1024 * 1024);
      const check = await checkUploadAllowed(supabase, user.id, plan, fileSizeMb);
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason, upgrade: true }, { status: 403 });
      }
    }

    const buffer = await file.arrayBuffer();
    let rawData: Record<string, unknown>[] = [];

    // Known formats
    if (ext === 'csv') {
      rawData = parseCSV(new TextDecoder().decode(buffer));
    } else if (ext === 'tsv') {
      rawData = parseCSV(new TextDecoder().decode(buffer), '\t');
    } else if (ext === 'xlsx' || ext === 'xls') {
      rawData = await parseXLSX(buffer);
    } else if (ext === 'pdf') {
      rawData = await parsePDF(buffer);
    } else if (ext === 'docx') {
      rawData = await parseDOCX(buffer);
    } else if (ext === 'json' || ext === 'jsonl' || ext === 'ndjson') {
      const text = new TextDecoder().decode(buffer);
      if (ext === 'jsonl' || ext === 'ndjson') {
        rawData = text.split('\n').filter(l => l.trim()).map(line => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean) as Record<string, unknown>[];
      } else {
        rawData = parseJSON(text);
      }
    } else if (ext === 'xml') {
      rawData = parseXML(new TextDecoder().decode(buffer));
    } else {
      // Unknown format: try smart detection
      // First try as Excel (some files have wrong extensions)
      try {
        rawData = await parseXLSX(buffer);
      } catch { /* not Excel */ }

      // Then try as text
      if (rawData.length === 0) {
        try {
          const text = new TextDecoder().decode(buffer);
          if (text && text.trim().length > 0) {
            rawData = smartParseText(text);
          }
        } catch { /* binary file we can't read */ }
      }

      // Try as PDF
      if (rawData.length === 0) {
        try {
          rawData = await parsePDF(buffer);
        } catch { /* not a PDF */ }
      }
    }

    if (rawData.length === 0) {
      return NextResponse.json({
        error: 'No structured data could be extracted from this file. Try CSV, Excel, JSON, or a text file with tabular data.',
      }, { status: 422 });
    }

    // Deep clean the data
    const limits = PLAN_LIMITS[plan];
    const sliced = rawData.slice(0, limits.max_rows);
    const { data: cleanedData, report: cleaningReport } = deepCleanData(sliced);

    if (cleanedData.length === 0) {
      return NextResponse.json({ error: 'All rows were empty after cleaning.' }, { status: 422 });
    }

    const columnNames = Object.keys(cleanedData[0] || {});
    const columns = analyzeColumns(cleanedData, columnNames);
    const numericCols = columns.filter(c => c.column.type === 'numeric').map(c => c.column.name);
    const correlations = computeCorrelations(cleanedData, numericCols);
    const insights = generateInsights(columns, correlations, cleanedData.length);

    // Generate 3D charts
    const charts3D = generate3DChartConfigs(columns, cleanedData);

    // AI analysis (non-blocking)
    const aiPromise = analyzeWithAI(
      columns, correlations, cleanedData.length,
      cleanedData.slice(0, 5), file.name
    );

    if (user) {
      await logUsage(supabase, user.id, 'upload', {
        fileName: file.name,
        fileSize: file.size,
        rowCount: cleanedData.length,
      });

      await supabase.from('uploads').insert({
        user_id: user.id,
        file_name: file.name,
        file_type: ext || 'unknown',
        file_size: file.size,
        row_count: cleanedData.length,
      });
    }

    const aiAnalysis = await aiPromise;

    const result: AnalyticsResult = {
      fileName: file.name,
      fileType: ext || 'unknown',
      rowCount: cleanedData.length,
      columnCount: columnNames.length,
      columns,
      correlations,
      insights,
      rawData: cleanedData.slice(0, 500),
      processedAt: new Date().toISOString(),
      cleaningReport,
      charts3D,
      ...(aiAnalysis ? { aiAnalysis } : {}),
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
