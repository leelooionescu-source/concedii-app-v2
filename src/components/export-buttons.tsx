"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToPDF, type ExportColumn } from "@/lib/export-utils";

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title: string;
}

export function ExportButtons({ data, columns, filename, title }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToExcel(data, columns, filename)}
        disabled={data.length === 0}
      >
        <FileSpreadsheet className="h-4 w-4 mr-1" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToPDF(data, columns, filename, title)}
        disabled={data.length === 0}
      >
        <FileText className="h-4 w-4 mr-1" />
        PDF
      </Button>
    </div>
  );
}
