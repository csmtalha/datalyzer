import { NextRequest, NextResponse } from 'next/server';

function extractGoogleSheetId(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /key=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getGoogleSheetsCSVUrl(sheetId: string, gid?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

function detectGid(url: string): string | undefined {
  const m = url.match(/gid=(\d+)/);
  return m ? m[1] : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    let fetchUrl = trimmedUrl;
    let sourceName = 'remote-data';
    let forceExt = '';

    // Google Sheets detection
    if (trimmedUrl.includes('docs.google.com/spreadsheets') || trimmedUrl.includes('sheets.google.com')) {
      const sheetId = extractGoogleSheetId(trimmedUrl);
      if (!sheetId) {
        return NextResponse.json({ error: 'Could not extract Google Sheet ID from URL' }, { status: 400 });
      }
      const gid = detectGid(trimmedUrl);
      fetchUrl = getGoogleSheetsCSVUrl(sheetId, gid);
      sourceName = `google-sheet-${sheetId.slice(0, 8)}`;
      forceExt = 'csv';
    }

    // GitHub raw file detection — convert blob URLs to raw
    if (trimmedUrl.includes('github.com') && trimmedUrl.includes('/blob/')) {
      fetchUrl = trimmedUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Datalyze/1.0',
          'Accept': 'text/csv, application/json, text/plain, */*',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 422 },
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const contentDisposition = response.headers.get('content-disposition') || '';

    // Determine file extension
    let ext = forceExt;
    if (!ext) {
      if (contentType.includes('json')) ext = 'json';
      else if (contentType.includes('csv') || contentType.includes('comma-separated')) ext = 'csv';
      else if (contentType.includes('xml')) ext = 'xml';
      else if (contentType.includes('html')) ext = 'html';
      else if (contentType.includes('yaml') || contentType.includes('yml')) ext = 'yaml';
      else if (contentType.includes('spreadsheet') || contentType.includes('excel')) ext = 'xlsx';
      else if (contentType.includes('tab-separated')) ext = 'tsv';
      else {
        // Try from URL path
        const urlPath = new URL(fetchUrl).pathname;
        const pathExt = urlPath.split('.').pop()?.toLowerCase();
        if (pathExt && ['csv', 'json', 'xml', 'html', 'yaml', 'yml', 'tsv', 'xlsx', 'xls', 'toml', 'md', 'sql', 'log'].includes(pathExt)) {
          ext = pathExt;
        }
      }
    }

    // Try filename from content-disposition
    const filenameMatch = contentDisposition.match(/filename[*]?=["']?([^"';\n]+)/);
    if (filenameMatch) {
      sourceName = filenameMatch[1].trim();
    } else if (!sourceName.startsWith('google-sheet')) {
      try {
        const pathname = new URL(fetchUrl).pathname;
        const lastSegment = pathname.split('/').filter(Boolean).pop();
        if (lastSegment && lastSegment.includes('.')) sourceName = lastSegment;
        else if (lastSegment) sourceName = lastSegment;
      } catch { /* keep default */ }
    }

    if (!sourceName.includes('.') && ext) {
      sourceName = `${sourceName}.${ext}`;
    }

    const buffer = await response.arrayBuffer();

    // Return as a file-like FormData to reuse /api/parse
    const blob = new Blob([buffer], { type: contentType || 'application/octet-stream' });
    const file = new File([blob], sourceName, { type: blob.type });

    const formData = new FormData();
    formData.append('file', file);

    // Forward to parse endpoint
    const parseUrl = new URL('/api/parse', req.url);
    const parseResponse = await fetch(parseUrl.toString(), {
      method: 'POST',
      body: formData,
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    });

    const parseResult = await parseResponse.json();

    if (!parseResponse.ok) {
      return NextResponse.json(parseResult, { status: parseResponse.status });
    }

    return NextResponse.json({
      ...parseResult,
      sourceUrl: trimmedUrl,
      fetchedFileName: sourceName,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out after 30 seconds' }, { status: 408 });
    }
    console.error('URL fetch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch URL' },
      { status: 500 },
    );
  }
}
