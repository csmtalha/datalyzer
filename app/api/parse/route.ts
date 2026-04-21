import { NextRequest, NextResponse } from 'next/server';
import { analyzeColumns, computeCorrelations } from '@/lib/analytics';
import { generateInsights } from '@/lib/insights';
import { deepCleanData } from '@/lib/dataCleaner';
import { analyzeWithAI } from '@/lib/ai/analyzer';
import { generate3DChartConfigs } from '@/lib/chart3DConfig';
import { profileData } from '@/lib/dataProfiler';
import { generateColumnMappings, applyColumnRenames } from '@/lib/columnRenamer';
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

interface SheetData {
  name: string;
  data: Record<string, unknown>[];
}

async function parseXLSX(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

async function parseXLSXAllSheets(buffer: ArrayBuffer): Promise<SheetData[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheets: SheetData[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    if (data.length > 0) sheets.push({ name, data });
  }
  return sheets;
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

function parseHTML(text: string): Record<string, unknown>[] {
  const tables: Record<string, unknown>[][] = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(text)) !== null) {
    const tableHTML = tableMatch[1];
    const rows: string[][] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;

    while ((trMatch = trRegex.exec(tableHTML)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
      }
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length >= 2) {
      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h || `Column_${i + 1}`] = row[i] ?? null; });
        return obj;
      });
      tables.push(data);
    }
  }

  if (tables.length === 0) return [];
  return tables.sort((a, b) => b.length - a.length)[0];
}

function parseMarkdownTable(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tableLines: string[] = [];
  let foundSeparator = false;

  for (const line of lines) {
    if (line.includes('|')) {
      tableLines.push(line);
      if (/^\|?[\s:-]+\|[\s:|+-]+\|?$/.test(line)) foundSeparator = true;
    }
  }

  if (!foundSeparator || tableLines.length < 3) return [];

  const splitRow = (line: string) =>
    line.split('|').map(s => s.trim()).filter((_, i, arr) =>
      !(i === 0 && arr[0] === '') && !(i === arr.length - 1 && arr[arr.length - 1] === '')
    );

  const sepIdx = tableLines.findIndex(l => /^\|?[\s:-]+\|[\s:|+-]+\|?$/.test(l));
  const headerLine = tableLines[sepIdx - 1];
  if (!headerLine) return [];

  const headers = splitRow(headerLine);
  const dataLines = tableLines.slice(sepIdx + 1);

  return dataLines.map(line => {
    const cells = splitRow(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? null; });
    return row;
  }).filter(row => Object.values(row).some(v => v !== null && v !== ''));
}

function parseYAML(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/);
  const items: Record<string, unknown>[] = [];
  let current: Record<string, unknown> | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (/^\s*-\s+\w+/.test(trimmed) || /^\s*-\s*$/.test(trimmed)) {
      if (current && Object.keys(current).length > 0) items.push(current);
      current = {};
      const kvMatch = trimmed.match(/^\s*-\s+(\w[\w\s]*?):\s*(.+)$/);
      if (kvMatch) {
        current[kvMatch[1].trim()] = parseYAMLValue(kvMatch[2].trim());
      }
    } else if (current && /^\s{2,}\w/.test(trimmed)) {
      const kvMatch = trimmed.match(/^\s+(\w[\w\s]*?):\s*(.+)$/);
      if (kvMatch) {
        current[kvMatch[1].trim()] = parseYAMLValue(kvMatch[2].trim());
      }
    } else if (/^\w[\w\s]*?:\s*$/.test(trimmed)) {
      continue;
    } else if (/^\w[\w\s]*?:\s*.+$/.test(trimmed) && !current) {
      if (!current) current = {};
      const kvMatch = trimmed.match(/^(\w[\w\s]*?):\s*(.+)$/);
      if (kvMatch) {
        current[kvMatch[1].trim()] = parseYAMLValue(kvMatch[2].trim());
      }
    }
  }
  if (current && Object.keys(current).length > 0) items.push(current);

  if (items.length === 0 && lines.some(l => /^\w+:/.test(l.trim()))) {
    const obj: Record<string, unknown> = {};
    for (const line of lines) {
      const m = line.match(/^(\w[\w\s]*?):\s*(.+)$/);
      if (m) obj[m[1].trim()] = parseYAMLValue(m[2].trim());
    }
    if (Object.keys(obj).length >= 2) return [obj];
  }

  return items;
}

function parseYAMLValue(val: string): unknown {
  if (val === 'true' || val === 'True') return true;
  if (val === 'false' || val === 'False') return false;
  if (val === 'null' || val === 'Null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  return val.replace(/^['"]|['"]$/g, '');
}

function parseTOML(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/);
  const sections: Record<string, Record<string, unknown>> = {};
  const arrayTables: Record<string, Record<string, unknown>[]> = {};
  let currentSection = '';
  let currentArrayTable = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const arrayTableMatch = trimmed.match(/^\[\[(\w[\w.-]*)\]\]$/);
    if (arrayTableMatch) {
      currentArrayTable = arrayTableMatch[1];
      currentSection = '';
      if (!arrayTables[currentArrayTable]) arrayTables[currentArrayTable] = [];
      arrayTables[currentArrayTable].push({});
      continue;
    }

    const sectionMatch = trimmed.match(/^\[(\w[\w.-]*)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentArrayTable = '';
      if (!sections[currentSection]) sections[currentSection] = {};
      continue;
    }

    const kvMatch = trimmed.match(/^(\w[\w.-]*)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const val = parseTOMLValue(kvMatch[2].trim());
      if (currentArrayTable && arrayTables[currentArrayTable]?.length > 0) {
        arrayTables[currentArrayTable][arrayTables[currentArrayTable].length - 1][key] = val;
      } else if (currentSection) {
        sections[currentSection][key] = val;
      } else {
        sections['_root'] = sections['_root'] || {};
        sections['_root'][key] = val;
      }
    }
  }

  for (const key of Object.keys(arrayTables)) {
    if (arrayTables[key].length > 1) return arrayTables[key];
  }

  const sectionEntries = Object.entries(sections).filter(([k]) => k !== '_root');
  if (sectionEntries.length > 1) {
    return sectionEntries.map(([name, data]) => ({ _section: name, ...data }));
  }

  if (sections['_root'] && Object.keys(sections['_root']).length > 0) {
    return [sections['_root']];
  }

  return [];
}

function parseTOMLValue(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  if (val.startsWith('[') && val.endsWith(']')) {
    try { return JSON.parse(val.replace(/'/g, '"')); } catch { return val; }
  }
  return val;
}

function parseLOG(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const logPatterns = [
    /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s+\[?(\w+)\]?\s+(.+)$/,
    /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?):\s+(.+)$/,
    /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*)\]\s*\[?(\w+)\]?\s*(.+)$/,
    /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+-\s+-\s+\[([^\]]+)\]\s+"(\w+)\s+([^"]+)"\s+(\d{3})\s+(\d+)/,
  ];

  for (const pattern of logPatterns) {
    const matches = lines.filter(l => pattern.test(l));
    if (matches.length > lines.length * 0.5) {
      return matches.map(line => {
        const m = line.match(pattern);
        if (!m) return { raw: line };

        if (pattern === logPatterns[3]) {
          return { ip: m[1], timestamp: m[2], method: m[3], path: m[4], status: m[5], size: m[6] };
        }
        if (pattern === logPatterns[1]) {
          return { timestamp: m[1], host: m[2], service: m[3], message: m[4] };
        }
        return { timestamp: m[1], level: m[2], message: m[3] };
      });
    }
  }

  return [];
}

function parseSQL(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const insertRegex = /INSERT\s+INTO\s+\S+\s*\(([^)]+)\)\s*VALUES\s*((?:\([^)]+\)\s*,?\s*)+)/gi;
  let insertMatch;

  while ((insertMatch = insertRegex.exec(text)) !== null) {
    const columns = insertMatch[1].split(',').map(c => c.trim().replace(/[`"[\]]/g, ''));
    const valuesBlock = insertMatch[2];
    const valueRowRegex = /\(([^)]+)\)/g;
    let valueMatch;

    while ((valueMatch = valueRowRegex.exec(valuesBlock)) !== null) {
      const values = valueMatch[1].split(',').map(v => {
        const t = v.trim();
        if (t === 'NULL') return null;
        if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
        const num = Number(t);
        return isNaN(num) ? t : num;
      });
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => { row[col] = values[i] ?? null; });
      rows.push(row);
    }
  }

  return rows;
}

function smartParseText(text: string): Record<string, unknown>[] {
  if (!text || text.trim().length === 0) return [];

  const trimmed = text.trim();

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const jsonResult = parseJSON(trimmed);
    if (jsonResult.length > 0) return jsonResult;
  }

  // Try XML
  if (trimmed.startsWith('<') && trimmed.includes('</')) {
    const xmlResult = parseXML(trimmed);
    if (xmlResult.length > 0) return xmlResult;
  }

  // Try HTML tables
  if (trimmed.includes('<table') || trimmed.includes('<TABLE')) {
    const htmlResult = parseHTML(trimmed);
    if (htmlResult.length > 0) return htmlResult;
  }

  // Try Markdown tables
  if (trimmed.includes('|') && /\|[\s:-]+\|/.test(trimmed)) {
    const mdResult = parseMarkdownTable(trimmed);
    if (mdResult.length > 0) return mdResult;
  }

  // Try SQL INSERT statements
  if (/INSERT\s+INTO/i.test(trimmed)) {
    const sqlResult = parseSQL(trimmed);
    if (sqlResult.length > 0) return sqlResult;
  }

  // Try YAML
  if ((trimmed.includes('- ') || /^\w+:/.test(trimmed)) && !trimmed.includes('{')) {
    const yamlResult = parseYAML(trimmed);
    if (yamlResult.length > 0 && Object.keys(yamlResult[0]).length >= 2) return yamlResult;
  }

  // Try TOML
  if (trimmed.includes('[[') || (/^\[[\w.]+\]$/m.test(trimmed) && /^\w+\s*=/.test(trimmed))) {
    const tomlResult = parseTOML(trimmed);
    if (tomlResult.length > 0) return tomlResult;
  }

  // Try LOG format
  const logResult = parseLOG(trimmed);
  if (logResult.length > 0) return logResult;

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
  const fwRows = lines.map(l => l.split(/\s{2,}/).filter(Boolean));
  const maxCols = Math.max(...fwRows.map(r => r.length));
  if (maxCols >= 2) {
    const headers = fwRows[0].length >= 2 ? fwRows[0] : Array.from({ length: maxCols }, (_, i) => `Column_${i + 1}`);
    const dataRows = fwRows[0].length >= 2 ? fwRows.slice(1) : fwRows;
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
    let sheetInfo: { name: string; rowCount: number }[] | undefined;
    let detectedFormat = ext || 'unknown';

    // Known formats
    if (ext === 'csv') {
      rawData = parseCSV(new TextDecoder().decode(buffer));
    } else if (ext === 'tsv') {
      rawData = parseCSV(new TextDecoder().decode(buffer), '\t');
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
      const allSheets = await parseXLSXAllSheets(buffer);
      if (allSheets.length > 0) {
        rawData = allSheets[0].data;
        if (allSheets.length > 1) {
          sheetInfo = allSheets.map(s => ({ name: s.name, rowCount: s.data.length }));
          for (const sheet of allSheets.slice(1)) {
            if (sheet.data.length > rawData.length) rawData = sheet.data;
          }
        }
      }
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
    } else if (ext === 'html' || ext === 'htm') {
      rawData = parseHTML(new TextDecoder().decode(buffer));
      detectedFormat = 'html';
    } else if (ext === 'md' || ext === 'markdown') {
      rawData = parseMarkdownTable(new TextDecoder().decode(buffer));
      detectedFormat = 'markdown';
    } else if (ext === 'yaml' || ext === 'yml') {
      rawData = parseYAML(new TextDecoder().decode(buffer));
      detectedFormat = 'yaml';
    } else if (ext === 'toml') {
      rawData = parseTOML(new TextDecoder().decode(buffer));
      detectedFormat = 'toml';
    } else if (ext === 'log' || ext === 'access' || ext === 'error') {
      rawData = parseLOG(new TextDecoder().decode(buffer));
      detectedFormat = 'log';
    } else if (ext === 'sql') {
      rawData = parseSQL(new TextDecoder().decode(buffer));
      detectedFormat = 'sql';
    } else {
      // Unknown format: try smart detection
      try {
        rawData = await parseXLSX(buffer);
        if (rawData.length > 0) detectedFormat = 'excel';
      } catch { /* not Excel */ }

      if (rawData.length === 0) {
        try {
          const text = new TextDecoder().decode(buffer);
          if (text && text.trim().length > 0) {
            rawData = smartParseText(text);
            if (rawData.length > 0) detectedFormat = 'auto-detected';
          }
        } catch { /* binary file we can't read */ }
      }

      if (rawData.length === 0) {
        try {
          rawData = await parsePDF(buffer);
          if (rawData.length > 0) detectedFormat = 'pdf';
        } catch { /* not a PDF */ }
      }
    }

    if (rawData.length === 0) {
      return NextResponse.json({
        error: 'No structured data could be extracted from this file. Supported: CSV, Excel, JSON, XML, HTML, Markdown, YAML, TOML, SQL, PDF, DOCX, LOG, TSV, and more.',
      }, { status: 422 });
    }

    // Deep clean the data
    const planLimits = PLAN_LIMITS[plan];
    const sliced = rawData.slice(0, planLimits.max_rows);
    const { data: cleanedData, report: cleaningReport } = deepCleanData(sliced);

    if (cleanedData.length === 0) {
      return NextResponse.json({ error: 'All rows were empty after cleaning.' }, { status: 422 });
    }

    // Smart column renaming
    const columnMapping = generateColumnMappings(cleanedData);
    const renamedData = applyColumnRenames(cleanedData, columnMapping);

    const columnNames = Object.keys(renamedData[0] || {});
    const columns = analyzeColumns(renamedData, columnNames);
    const numericCols = columns.filter(c => c.column.type === 'numeric').map(c => c.column.name);
    const correlations = computeCorrelations(renamedData, numericCols);
    const insights = generateInsights(columns, correlations, renamedData.length);
    const dataProfile = profileData(columns, correlations, renamedData);
    const charts3D = generate3DChartConfigs(columns, renamedData);

    const aiPromise = analyzeWithAI(
      columns, correlations, renamedData.length,
      renamedData.slice(0, 5), file.name
    );

    if (user) {
      await logUsage(supabase, user.id, 'upload', {
        fileName: file.name,
        fileSize: file.size,
        rowCount: renamedData.length,
      });

      await supabase.from('uploads').insert({
        user_id: user.id,
        file_name: file.name,
        file_type: detectedFormat,
        file_size: file.size,
        row_count: renamedData.length,
      });
    }

    const aiAnalysis = await aiPromise;
    const renamedCount = columnMapping.filter(m => m.wasRenamed).length;

    const result: AnalyticsResult = {
      fileName: file.name,
      fileType: detectedFormat,
      rowCount: renamedData.length,
      columnCount: columnNames.length,
      columns,
      correlations,
      insights,
      rawData: renamedData.slice(0, 500),
      processedAt: new Date().toISOString(),
      cleaningReport: {
        ...cleaningReport,
        actions: [
          ...cleaningReport.actions,
          ...(renamedCount > 0 ? [{
            type: 'fixed_case' as const,
            description: `Renamed ${renamedCount} columns to meaningful names`,
            affected: renamedCount,
          }] : []),
        ],
      },
      charts3D,
      dataProfile,
      columnMapping,
      ...(sheetInfo ? { sheetInfo } : {}),
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
