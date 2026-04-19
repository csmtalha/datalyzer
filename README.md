# Datalyze — Instant Data Analytics Dashboard

A production-ready SaaS analytics tool. Upload CSV, Excel, PDF, or Word → instant interactive dashboard.

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```
Or push to GitHub and import at vercel.com. No environment variables needed.

## Features
- Drag-and-drop file upload (CSV, XLSX, PDF, DOCX)
- Auto-detects column types (numeric, categorical, date, boolean, text)
- Summary stats: mean, median, min, max, std dev, quartiles
- Correlation analysis and outlier detection
- Auto-generated charts: bar, line, pie, histogram, scatter
- Smart text insights
- Filterable paginated data table
- Export to PDF report, Excel workbook, or print

## Project Structure
```
app/api/parse/          → File parsing & analytics API
app/api/export-excel/   → Excel export API
components/dashboard/   → Dashboard, KPICards, Charts, Table, Export
components/upload/      → Drag-and-drop upload
lib/analytics.ts        → Stats engine
lib/chartConfig.ts      → Auto chart generation
lib/insights.ts         → Smart insights
types/analytics.ts      → TypeScript types
public/sample-dataset.csv → Test file (50-row e-commerce data)
```

## Testing
Upload `public/sample-dataset.csv` — 50 rows, mixed types, will generate 8+ charts.
# datalyzer
