export interface CleaningAction {
  type: 'removed_duplicates' | 'trimmed_whitespace' | 'fixed_encoding' | 'standardized_dates'
    | 'fixed_numbers' | 'filled_missing' | 'removed_empty_rows' | 'removed_empty_cols'
    | 'normalized_booleans' | 'fixed_case' | 'removed_special_chars';
  column?: string;
  description: string;
  affected: number;
}

export interface CleaningReport {
  originalRows: number;
  cleanedRows: number;
  originalCols: number;
  cleanedCols: number;
  actions: CleaningAction[];
  qualityScore: number; // 0-100
  issues: { severity: 'high' | 'medium' | 'low'; message: string }[];
}

export function deepCleanData(
  rawData: Record<string, unknown>[]
): { data: Record<string, unknown>[]; report: CleaningReport } {
  const actions: CleaningAction[] = [];
  const issues: CleaningReport['issues'] = [];
  const originalRows = rawData.length;
  const originalCols = Object.keys(rawData[0] || {}).length;
  let data = rawData.map(row => ({ ...row }));

  // 1. Trim all string whitespace
  let trimCount = 0;
  data = data.map(row => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      const trimmedKey = k.trim();
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed !== v) trimCount++;
        cleaned[trimmedKey] = trimmed;
      } else {
        cleaned[trimmedKey] = v;
      }
    }
    return cleaned;
  });
  if (trimCount > 0) {
    actions.push({ type: 'trimmed_whitespace', description: `Trimmed whitespace from ${trimCount} values`, affected: trimCount });
  }

  // 2. Normalize null/empty representations
  const nullPatterns = ['', 'N/A', 'NA', 'n/a', 'null', 'NULL', 'None', 'none', 'NaN', 'nan', '-', '--', '?', 'undefined', '#N/A', '#REF!', '#VALUE!', '#DIV/0!', '#NAME?'];
  let nullFixed = 0;
  data = data.map(row => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && nullPatterns.includes(v.trim())) {
        nullFixed++;
        cleaned[k] = null;
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  });
  if (nullFixed > 0) {
    actions.push({ type: 'filled_missing', description: `Normalized ${nullFixed} missing value representations to null`, affected: nullFixed });
  }

  // 3. Remove completely empty rows
  const beforeEmpty = data.length;
  data = data.filter(row => Object.values(row).some(v => v !== null && v !== undefined));
  const emptyRowsRemoved = beforeEmpty - data.length;
  if (emptyRowsRemoved > 0) {
    actions.push({ type: 'removed_empty_rows', description: `Removed ${emptyRowsRemoved} empty rows`, affected: emptyRowsRemoved });
    issues.push({ severity: 'low', message: `${emptyRowsRemoved} completely empty rows removed` });
  }

  // 4. Remove columns that are 100% null
  if (data.length > 0) {
    const allCols = Object.keys(data[0]);
    const emptyCols = allCols.filter(col =>
      data.every(row => row[col] === null || row[col] === undefined)
    );
    if (emptyCols.length > 0) {
      data = data.map(row => {
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (!emptyCols.includes(k)) cleaned[k] = v;
        }
        return cleaned;
      });
      actions.push({
        type: 'removed_empty_cols',
        description: `Removed ${emptyCols.length} empty columns: ${emptyCols.join(', ')}`,
        affected: emptyCols.length,
      });
    }
  }

  // 5. Remove exact duplicate rows
  const seen = new Set<string>();
  const beforeDedup = data.length;
  data = data.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const dupsRemoved = beforeDedup - data.length;
  if (dupsRemoved > 0) {
    actions.push({ type: 'removed_duplicates', description: `Removed ${dupsRemoved} duplicate rows`, affected: dupsRemoved });
    issues.push({ severity: 'medium', message: `${dupsRemoved} duplicate rows found and removed` });
  }

  // 6. Fix numeric formatting (currency symbols, commas, percentages)
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    for (const col of cols) {
      let fixedCount = 0;
      const sample = data.slice(0, 50).map(r => r[col]).filter(v => v !== null && v !== undefined);
      const currencyPattern = /^[$€£¥₹]?\s*-?[\d,]+\.?\d*%?$|^-?[\d,]+\.?\d*\s*[$€£¥₹%]$/;
      const looksNumeric = sample.filter(v => typeof v === 'string' && currencyPattern.test(v.trim())).length;

      if (looksNumeric > sample.length * 0.6) {
        data = data.map(row => {
          const val = row[col];
          if (typeof val === 'string') {
            const stripped = val.replace(/[$€£¥₹,%\s]/g, '');
            const num = Number(stripped);
            if (!isNaN(num) && stripped !== '') {
              const wasPct = val.includes('%');
              fixedCount++;
              return { ...row, [col]: wasPct ? num / 100 : num };
            }
          }
          return row;
        });
        if (fixedCount > 0) {
          actions.push({
            type: 'fixed_numbers',
            column: col,
            description: `Cleaned ${fixedCount} numeric values in "${col}" (removed currency/formatting)`,
            affected: fixedCount,
          });
        }
      }
    }
  }

  // 7. Standardize date formats
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
      /^\d{1,2}-\d{1,2}-\d{2,4}$/,
      /^\d{4}-\d{2}-\d{2}/,
      /^\w+ \d{1,2},?\s*\d{4}$/,
    ];
    for (const col of cols) {
      const sample = data.slice(0, 30).map(r => r[col]).filter(v => typeof v === 'string');
      const dateCount = sample.filter(v => datePatterns.some(p => p.test(v as string)) && !isNaN(Date.parse(v as string))).length;

      if (dateCount > sample.length * 0.6) {
        let fixedCount = 0;
        data = data.map(row => {
          const val = row[col];
          if (typeof val === 'string' && !isNaN(Date.parse(val))) {
            const d = new Date(val);
            const iso = d.toISOString().split('T')[0];
            if (iso !== val) fixedCount++;
            return { ...row, [col]: iso };
          }
          return row;
        });
        if (fixedCount > 0) {
          actions.push({
            type: 'standardized_dates',
            column: col,
            description: `Standardized ${fixedCount} dates in "${col}" to YYYY-MM-DD format`,
            affected: fixedCount,
          });
        }
      }
    }
  }

  // 8. Normalize boolean values
  if (data.length > 0) {
    const boolMap: Record<string, boolean> = {
      'true': true, 'false': false, 'yes': true, 'no': false,
      '1': true, '0': false, 'y': true, 'n': false,
      'on': true, 'off': false, 'active': true, 'inactive': false,
    };
    const cols = Object.keys(data[0]);
    for (const col of cols) {
      const sample = data.slice(0, 50).map(r => r[col]).filter(v => v !== null && typeof v === 'string');
      const boolCount = sample.filter(v => boolMap[String(v).toLowerCase()] !== undefined).length;
      if (boolCount > sample.length * 0.8 && sample.length > 3) {
        let fixedCount = 0;
        data = data.map(row => {
          const val = row[col];
          if (typeof val === 'string' && boolMap[val.toLowerCase()] !== undefined) {
            fixedCount++;
            return { ...row, [col]: boolMap[val.toLowerCase()] };
          }
          return row;
        });
        if (fixedCount > 0) {
          actions.push({
            type: 'normalized_booleans',
            column: col,
            description: `Normalized ${fixedCount} boolean values in "${col}"`,
            affected: fixedCount,
          });
        }
      }
    }
  }

  // 9. Fix inconsistent casing in low-cardinality text columns
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    for (const col of cols) {
      const vals = data.map(r => r[col]).filter(v => typeof v === 'string') as string[];
      const unique = new Set(vals);
      const uniqueLower = new Set(vals.map(v => v.toLowerCase()));

      if (unique.size > uniqueLower.size && unique.size <= 30) {
        const canonical: Record<string, string> = {};
        const counts: Record<string, number> = {};
        for (const v of vals) {
          const lower = v.toLowerCase();
          counts[lower] = (counts[lower] || 0) + 1;
          if (!canonical[lower] || counts[lower] > (counts[canonical[lower].toLowerCase()] || 0)) {
            canonical[lower] = v;
          }
        }
        let fixedCount = 0;
        data = data.map(row => {
          const val = row[col];
          if (typeof val === 'string') {
            const best = canonical[val.toLowerCase()];
            if (best && best !== val) {
              fixedCount++;
              return { ...row, [col]: best };
            }
          }
          return row;
        });
        if (fixedCount > 0) {
          actions.push({
            type: 'fixed_case',
            column: col,
            description: `Standardized casing in "${col}" (${fixedCount} values unified)`,
            affected: fixedCount,
          });
        }
      }
    }
  }

  // Calculate quality score
  const totalCells = data.length * Object.keys(data[0] || {}).length;
  const nullCells = data.reduce((sum, row) =>
    sum + Object.values(row).filter(v => v === null || v === undefined).length, 0
  );
  const nullPct = totalCells > 0 ? (nullCells / totalCells) * 100 : 0;
  const dupPenalty = dupsRemoved > 0 ? Math.min(15, (dupsRemoved / originalRows) * 50) : 0;
  const missingPenalty = Math.min(30, nullPct * 1.5);
  const qualityScore = Math.max(0, Math.round(100 - missingPenalty - dupPenalty));

  if (nullPct > 30) issues.push({ severity: 'high', message: `${nullPct.toFixed(1)}% of cells are missing — consider imputation` });
  else if (nullPct > 10) issues.push({ severity: 'medium', message: `${nullPct.toFixed(1)}% of cells are missing` });

  if (qualityScore >= 80) issues.push({ severity: 'low', message: 'Data quality is good after cleaning' });

  return {
    data,
    report: {
      originalRows,
      cleanedRows: data.length,
      originalCols,
      cleanedCols: Object.keys(data[0] || {}).length,
      actions,
      qualityScore,
      issues,
    },
  };
}
