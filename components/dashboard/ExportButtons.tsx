'use client';

import { useState } from 'react';
import { Download, Printer, FileSpreadsheet, Loader2, Lock } from 'lucide-react';
import { AnalyticsResult } from '@/types/analytics';
import { useAuth } from '@/components/auth/AuthProvider';
import UpgradeModal from '@/components/billing/UpgradeModal';

interface ExportButtonsProps {
  result: AnalyticsResult;
}

export default function ExportButtons({ result }: ExportButtonsProps) {
  const { limits, user } = useAuth();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleExcelExport = async () => {
    if (!limits.exports_enabled) {
      setShowUpgrade(true);
      return;
    }
    setExportingExcel(true);
    try {
      if (user) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase.from('usage_logs').insert({
          user_id: user.id,
          action: 'export_excel',
          metadata: { fileName: result.fileName },
        });
      }

      const res = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datalyze-${result.fileName}-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  const handlePDFExport = async () => {
    if (!limits.exports_enabled) {
      setShowUpgrade(true);
      return;
    }
    setExportingPDF(true);
    try {
      if (user) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase.from('usage_logs').insert({
          user_id: user.id,
          action: 'export_pdf',
          metadata: { fileName: result.fileName },
        });
      }

      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, margin = 15;
      let y = margin;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, W, 40, 'F');
      doc.setTextColor(6, 182, 212);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('DATALYZE', margin, 20);
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Analytics Report', margin, 28);
      doc.text(`Generated: ${new Date(result.processedAt).toLocaleString()}`, W - margin, 28, { align: 'right' });
      y = 50;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(result.fileName, margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${result.rowCount.toLocaleString()} rows × ${result.columnCount} columns`, margin, y);
      y += 12;

      const kpis = [
        { label: 'Records', value: result.rowCount.toLocaleString() },
        { label: 'Columns', value: result.columnCount.toString() },
        { label: 'Correlations', value: result.correlations.length.toString() },
        { label: 'Insights', value: result.insights.length.toString() },
      ];
      const boxW = (W - margin * 2 - 9) / 4;
      kpis.forEach((k, i) => {
        const x = margin + i * (boxW + 3);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(k.value, x + boxW / 2, y + 9, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, x + boxW / 2, y + 15, { align: 'center' });
      });
      y += 26;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Key Insights', margin, y);
      y += 6;
      for (const insight of result.insights) {
        if (y > 250) { doc.addPage(); y = margin; }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${insight.title}`, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(insight.description, W - margin * 2 - 5);
        doc.text(lines, margin + 3, y);
        y += lines.length * 4 + 3;
      }
      y += 6;

      if (y > 220) { doc.addPage(); y = margin; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Column Summary', margin, y);
      y += 4;

      const tableRows = result.columns.map(col => [
        col.column.name,
        col.column.type,
        col.column.uniqueCount.toString(),
        col.column.nullCount.toString(),
        col.numeric ? col.numeric.mean.toFixed(2) : '-',
        col.numeric ? col.numeric.min.toString() : '-',
        col.numeric ? col.numeric.max.toString() : '-',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Column', 'Type', 'Unique', 'Nulls', 'Mean', 'Min', 'Max']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [6, 182, 212] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      if (result.correlations.length > 0) {
        doc.addPage();
        y = margin;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Correlations', margin, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [['Column 1', 'Column 2', 'Coefficient', 'Strength']],
          body: result.correlations.map(c => [c.col1, c.col2, c.coefficient.toFixed(3), c.strength]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [15, 23, 42], textColor: [6, 182, 212] },
          margin: { left: margin, right: margin },
        });
      }

      doc.save(`datalyze-${result.fileName}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePrint = () => window.print();

  const isGated = !limits.exports_enabled;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handlePDFExport}
          disabled={exportingPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
        >
          {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : isGated ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          PDF Report {isGated && '(Pro)'}
        </button>
        <button
          onClick={handleExcelExport}
          disabled={exportingExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
        >
          {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : isGated ? <Lock className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
          Excel Export {isGated && '(Pro)'}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="Export is available on the Pro plan"
        feature="Exports"
      />
    </>
  );
}
