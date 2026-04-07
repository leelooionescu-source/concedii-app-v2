import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  accessor: string | ((row: Record<string, unknown>) => string);
}

function getValue(row: Record<string, unknown>, col: ExportColumn): string {
  if (typeof col.accessor === "function") {
    return col.accessor(row);
  }
  const val = row[col.accessor];
  if (val === null || val === undefined) return "-";
  return String(val);
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((col) => getValue(row, col)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => (r[i] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Date");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  title: string
) {
  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Date
  doc.setFontSize(9);
  doc.text(`Exportat: ${new Date().toLocaleDateString("ro-RO")}`, 14, 22);

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((col) => getValue(row, col)));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 58, 92] },
  });

  doc.save(`${filename}.pdf`);
}
