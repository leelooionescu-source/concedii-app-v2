"use client";

import { useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sarbatoriLegale, numeZiSaptamana } from "@/lib/holidays";
import { format } from "date-fns";

export default function SarbatoriPage() {
  const [an, setAn] = useState(new Date().getFullYear());
  const sarbatori = sarbatoriLegale(an);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title"><Star className="h-5 w-5" /> Sarbatori legale</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAn(an - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold text-sm">{an}</span>
          <Button variant="outline" size="sm" onClick={() => setAn(an + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="content-card">
        <table className="app-table">
          <thead>
            <tr>
              <th className="col-nr">#</th>
              <th>Data</th>
              <th>Ziua</th>
              <th>Sarbatoare</th>
            </tr>
          </thead>
          <tbody>
            {sarbatori.map((s, i) => (
              <tr key={i}>
                <td className="col-nr">{i + 1}</td>
                <td>{format(s.data, "dd.MM.yyyy")}</td>
                <td>{numeZiSaptamana(s.data)}</td>
                <td className="col-bold">{s.denumire}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
