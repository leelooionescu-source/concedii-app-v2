"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sarbatoriLegale, numeLuna, numeZiSaptamana } from "@/lib/holidays";
import { TIP_BADGE_COLORS } from "@/lib/types";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import type { Concediu } from "@/lib/types";

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();
  const [an, setAn] = useState(today.getFullYear());
  const [luna, setLuna] = useState(today.getMonth()); // 0-indexed
  const [concedii, setConcedii] = useState<Concediu[]>([]);
  const [loading, setLoading] = useState(true);

  const primaZi = new Date(an, luna, 1);
  const ultimaZi = new Date(an, luna + 1, 0);
  const primaStr = format(primaZi, "yyyy-MM-dd");
  const ultimaStr = format(ultimaZi, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("concedii")
      .select("*, angajati(*)")
      .lte("data_start", ultimaStr)
      .gte("data_sfarsit", primaStr);
    setConcedii(data || []);
    setLoading(false);
  }, [supabase, primaStr, ultimaStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sarbatori pentru luna curenta
  const sarbatoriAn = sarbatoriLegale(an);
  const sarbatoriMap = new Map(sarbatoriAn.map((s) => [format(s.data, "yyyy-MM-dd"), s.denumire]));

  const zile = eachDayOfInterval({ start: primaZi, end: ultimaZi });

  function prevMonth() {
    if (luna === 0) { setAn(an - 1); setLuna(11); }
    else setLuna(luna - 1);
  }
  function nextMonth() {
    if (luna === 11) { setAn(an + 1); setLuna(0); }
    else setLuna(luna + 1);
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title"><Calendar className="h-5 w-5" /> Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold text-sm min-w-[140px] text-center">
            {numeLuna(luna)} {an}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="content-card">
        <table className="app-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center" }}>Zi</th>
              <th style={{ width: 80 }}>Data</th>
              <th style={{ width: 90 }}>Ziua</th>
              <th>Concedii / Sarbatori</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Se incarca...</td></tr>
            ) : zile.map((zi) => {
              const ziStr = format(zi, "yyyy-MM-dd");
              const weekend = isWeekend(zi);
              const sarbatoare = sarbatoriMap.get(ziStr);
              const concediiZi = concedii.filter(
                (c) => c.data_start <= ziStr && c.data_sfarsit >= ziStr
              );

              return (
                <tr
                  key={ziStr}
                  style={{
                    backgroundColor: sarbatoare
                      ? "rgba(239, 68, 68, 0.08)"
                      : weekend
                      ? "#f9fafb"
                      : undefined,
                  }}
                >
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{zi.getDate()}</td>
                  <td className="text-gray-500 text-xs">{format(zi, "dd.MM")}</td>
                  <td className={`text-xs ${weekend ? "text-gray-400" : ""}`}>{numeZiSaptamana(zi)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {sarbatoare && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                          {sarbatoare}
                        </span>
                      )}
                      {concediiZi.map((c) => (
                        <span
                          key={c.id}
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${TIP_BADGE_COLORS[c.tip] || "bg-gray-400 text-white"}`}
                        >
                          {c.angajati?.prenume} {c.angajati?.nume} ({c.tip})
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
