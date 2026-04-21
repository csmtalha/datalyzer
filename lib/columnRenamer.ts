const ABBREVIATION_MAP: Record<string, string> = {
  id: 'ID', idx: 'Index', num: 'Number', no: 'Number', nr: 'Number',
  qty: 'Quantity', qnt: 'Quantity', quant: 'Quantity',
  amt: 'Amount', amnt: 'Amount',
  prc: 'Price', pct: 'Percentage', perc: 'Percentage', prcnt: 'Percentage',
  desc: 'Description', descr: 'Description',
  cat: 'Category', categ: 'Category',
  dept: 'Department', dep: 'Department',
  emp: 'Employee', empl: 'Employee',
  cust: 'Customer', cstmr: 'Customer',
  prod: 'Product', prd: 'Product',
  addr: 'Address', adr: 'Address',
  tel: 'Telephone', ph: 'Phone', phn: 'Phone',
  org: 'Organization', orgn: 'Organization',
  mgr: 'Manager', mngr: 'Manager',
  acct: 'Account', acc: 'Account',
  txn: 'Transaction', trans: 'Transaction',
  inv: 'Invoice', invc: 'Invoice',
  ref: 'Reference',
  dt: 'Date', dte: 'Date',
  dob: 'Date of Birth', bday: 'Birthday',
  doj: 'Date of Joining', hdt: 'Hire Date',
  yr: 'Year', mo: 'Month', mn: 'Month',
  wk: 'Week', dy: 'Day',
  hr: 'Hour', min: 'Minute', sec: 'Second',
  ts: 'Timestamp', tstamp: 'Timestamp',
  fname: 'First Name', lname: 'Last Name', mname: 'Middle Name',
  fn: 'First Name', ln: 'Last Name',
  nm: 'Name', nme: 'Name',
  gen: 'Gender', gndr: 'Gender',
  sal: 'Salary', slry: 'Salary',
  rev: 'Revenue', rvn: 'Revenue',
  exp: 'Expense', expn: 'Expense',
  bal: 'Balance', blnc: 'Balance',
  tot: 'Total', ttl: 'Total',
  avg: 'Average',
  cnt: 'Count', ct: 'Count',
  max: 'Maximum', min_val: 'Minimum',
  src: 'Source', dst: 'Destination', dest: 'Destination',
  lat: 'Latitude', lng: 'Longitude', lon: 'Longitude',
  loc: 'Location', lctn: 'Location',
  rgn: 'Region', reg: 'Region',
  ctry: 'Country', cntry: 'Country',
  st: 'State', prov: 'Province',
  cty: 'City',
  zip: 'ZIP Code', pcode: 'Postal Code', pincode: 'PIN Code',
  img: 'Image', pic: 'Picture',
  url: 'URL', uri: 'URI',
  msg: 'Message', txt: 'Text',
  typ: 'Type', tp: 'Type',
  stat: 'Status', sts: 'Status',
  lvl: 'Level', lev: 'Level',
  grp: 'Group', gp: 'Group',
  cls: 'Class',
  sz: 'Size',
  wt: 'Weight', ht: 'Height',
  len: 'Length', wd: 'Width',
  vol: 'Volume', cap: 'Capacity',
  clr: 'Color', colour: 'Color',
  tmp: 'Temperature', temp: 'Temperature',
  prio: 'Priority', pri: 'Priority',
  curr: 'Currency', ccy: 'Currency',
  qty_ordered: 'Quantity Ordered', qty_shipped: 'Quantity Shipped',
  unit_price: 'Unit Price', unit_cost: 'Unit Cost',
  crt: 'Created', upd: 'Updated', mod: 'Modified', del: 'Deleted',
  asgn: 'Assigned', assgn: 'Assigned',
  cmnt: 'Comment', cmt: 'Comment',
  rtng: 'Rating', rt: 'Rating',
  scr: 'Score', pts: 'Points',
  pf: 'Performance', perf: 'Performance',
  sku: 'SKU', upc: 'UPC', ean: 'EAN',
  ssn: 'SSN', ein: 'EIN', tin: 'TIN',
  roi: 'ROI', kpi: 'KPI',
  mrp: 'MRP', msrp: 'MSRP',
  cogs: 'Cost of Goods Sold',
  ebitda: 'EBITDA',
  yrs: 'Years', mos: 'Months',
  biz: 'Business', govt: 'Government',
  freq: 'Frequency', dur: 'Duration',
  resp: 'Response', req: 'Request',
  auth: 'Author', pub: 'Published',
  subj: 'Subject', ttl_text: 'Title',
  pos: 'Position', rank: 'Rank',
  seq: 'Sequence', ord: 'Order',
  pmt: 'Payment', pymnt: 'Payment',
  disc: 'Discount', dscnt: 'Discount',
  tax: 'Tax', vat: 'VAT',
  shp: 'Shipping', dlvry: 'Delivery',
  rtn: 'Return', rfnd: 'Refund',
  sub: 'Subscription', mbr: 'Member',
  sess: 'Session', usr: 'User',
  pwd: 'Password', pswd: 'Password',
  env: 'Environment', cfg: 'Configuration', conf: 'Configuration',
  ver: 'Version', bld: 'Build',
};

const COMPOUND_PATTERNS: [RegExp, string][] = [
  [/^(created|updated|modified|deleted)[-_ ]?(at|on|date|time|dt)$/i, '$1 Date'],
  [/^(start|end|begin|finish)[-_ ]?(date|time|dt)$/i, '$1 Date'],
  [/^(first|last|middle)[-_ ]?(name|nm)$/i, '$1 Name'],
  [/^(unit|total|net|gross)[-_ ]?(price|cost|amount|amt)$/i, '$1 $2'],
  [/^(is|has|can|should|was)[-_ ]?(\w+)$/i, 'Is $2'],
  [/^(email|e[-_ ]?mail)[-_ ]?(address|addr)?$/i, 'Email Address'],
  [/^(phone|mobile|cell)[-_ ]?(number|num|no)?$/i, 'Phone Number'],
  [/^(zip|postal|pin)[-_ ]?(code)?$/i, 'Postal Code'],
  [/^(ip)[-_ ]?(address|addr)?$/i, 'IP Address'],
  [/^(mac)[-_ ]?(address|addr)$/i, 'MAC Address'],
  [/^(tax)[-_ ]?(rate|amount|amt)$/i, 'Tax $2'],
  [/^(birth|b)[-_ ]?(date|day|dt)$/i, 'Date of Birth'],
  [/^(hire|joining|join)[-_ ]?(date|dt)$/i, 'Hire Date'],
  [/^(order|purchase)[-_ ]?(date|dt|id|number|num)$/i, 'Order $2'],
  [/^(ship|delivery|dlvry)[-_ ]?(date|dt|address|addr)$/i, 'Shipping $2'],
  [/^(due)[-_ ]?(date|dt)$/i, 'Due Date'],
  [/^(exp|expiry|expiration)[-_ ]?(date|dt)$/i, 'Expiry Date'],
  [/^(page)[-_ ]?(views?|count|hits)$/i, 'Page Views'],
  [/^(click)[-_ ]?(rate|through|count)$/i, 'Click $2'],
  [/^(bounce)[-_ ]?(rate)$/i, 'Bounce Rate'],
  [/^(open)[-_ ]?(rate)$/i, 'Open Rate'],
  [/^(conversion)[-_ ]?(rate)$/i, 'Conversion Rate'],
  [/^(response)[-_ ]?(time|rate)$/i, 'Response $2'],
  [/^__EMPTY(?:_(\d+))?$/i, 'Column $1'],
];

function splitColumnName(name: string): string[] {
  let normalized = name;

  // Remove leading/trailing underscores, dashes, dots
  normalized = normalized.replace(/^[_\-.]+|[_\-.]+$/g, '');

  // Split on common separators
  if (/[_\-.\s]/.test(normalized)) {
    return normalized.split(/[_\-.\s]+/).filter(Boolean);
  }

  // Split camelCase / PascalCase
  if (/[a-z][A-Z]/.test(normalized)) {
    return normalized
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/\s+/);
  }

  return [normalized];
}

function titleCase(word: string): string {
  if (word.length <= 1) return word.toUpperCase();
  const upper = word.toUpperCase();
  const KEEP_UPPER = ['ID', 'URL', 'URI', 'API', 'SQL', 'CSV', 'JSON', 'XML', 'HTML', 'SKU', 'UPC', 'SSN', 'IP', 'ROI', 'KPI', 'MRP', 'VAT', 'EAN', 'TIN', 'EIN'];
  if (KEEP_UPPER.includes(upper)) return upper;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function beautifyName(rawName: string, values: unknown[]): string {
  const trimmed = rawName.trim();
  if (!trimmed) return 'Unknown';

  // Handle generic numbered columns
  if (/^(column|col|field|f|c|v)[-_ ]?(\d+)$/i.test(trimmed)) {
    const colNum = trimmed.match(/(\d+)/)?.[1] || '1';
    return inferFromValues(values, `Column ${colNum}`);
  }

  // Handle Excel empty header pattern
  if (/^__EMPTY/.test(trimmed)) {
    const colNum = trimmed.match(/(\d+)/)?.[1] || '1';
    return inferFromValues(values, `Column ${colNum}`);
  }

  // Try compound pattern matches first
  for (const [pattern, replacement] of COMPOUND_PATTERNS) {
    if (pattern.test(trimmed)) {
      let result = trimmed.replace(pattern, replacement);
      result = result.split(/\s+/).map(w => titleCase(w)).join(' ');
      return result;
    }
  }

  // Check if the entire name (lowered) is an abbreviation
  const lower = trimmed.toLowerCase().replace(/[_\-.\s]/g, '');
  if (ABBREVIATION_MAP[lower]) {
    return ABBREVIATION_MAP[lower];
  }

  // Split and expand each part
  const parts = splitColumnName(trimmed);
  const expanded = parts.map(part => {
    const partLower = part.toLowerCase();
    if (ABBREVIATION_MAP[partLower]) return ABBREVIATION_MAP[partLower];
    return titleCase(part);
  });

  const result = expanded.join(' ');

  // Don't return single-char or unchanged cryptic names
  if (result.length <= 1) return inferFromValues(values, `Column`);

  return result;
}

function inferFromValues(values: unknown[], fallback: string): string {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 30);
  if (nonNull.length === 0) return fallback;

  const strs = nonNull.map(String);

  // Email detection
  if (strs.filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).length > nonNull.length * 0.6) {
    return 'Email Address';
  }

  // Phone detection
  if (strs.filter(s => /^[+\d\s()-]{7,15}$/.test(s.replace(/\s/g, ''))).length > nonNull.length * 0.6) {
    return 'Phone Number';
  }

  // URL detection
  if (strs.filter(s => /^https?:\/\//i.test(s)).length > nonNull.length * 0.6) {
    return 'URL';
  }

  // IP detection
  if (strs.filter(s => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)).length > nonNull.length * 0.6) {
    return 'IP Address';
  }

  // Currency detection
  if (strs.filter(s => /^[$€£¥₹]/.test(s)).length > nonNull.length * 0.5) {
    return 'Amount';
  }

  // Percentage detection
  if (strs.filter(s => /%$/.test(s.trim())).length > nonNull.length * 0.5) {
    return 'Percentage';
  }

  // Date detection
  if (strs.filter(s => !isNaN(Date.parse(s)) && /\d{2,4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)).length > nonNull.length * 0.5) {
    return 'Date';
  }

  // Boolean detection
  const boolVals = new Set(['true', 'false', 'yes', 'no', '0', '1']);
  if (strs.filter(s => boolVals.has(s.toLowerCase())).length > nonNull.length * 0.8) {
    return 'Flag';
  }

  // Name-like detection (Title Case words)
  if (strs.filter(s => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(s)).length > nonNull.length * 0.5) {
    return 'Full Name';
  }

  return fallback;
}

export interface ColumnMapping {
  original: string;
  display: string;
  wasRenamed: boolean;
}

export function generateColumnMappings(
  data: Record<string, unknown>[]
): ColumnMapping[] {
  if (data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const usedNames = new Set<string>();

  return columns.map(col => {
    const values = data.map(r => r[col]);
    let display = beautifyName(col, values);

    // Deduplicate display names
    let finalName = display;
    let counter = 2;
    while (usedNames.has(finalName.toLowerCase())) {
      finalName = `${display} ${counter}`;
      counter++;
    }
    usedNames.add(finalName.toLowerCase());

    return {
      original: col,
      display: finalName,
      wasRenamed: finalName !== col,
    };
  });
}

export function applyColumnRenames(
  data: Record<string, unknown>[],
  mappings: ColumnMapping[]
): Record<string, unknown>[] {
  const renamedMappings = mappings.filter(m => m.wasRenamed);
  if (renamedMappings.length === 0) return data;

  const renameMap = new Map(renamedMappings.map(m => [m.original, m.display]));

  return data.map(row => {
    const newRow: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      newRow[renameMap.get(key) || key] = val;
    }
    return newRow;
  });
}
