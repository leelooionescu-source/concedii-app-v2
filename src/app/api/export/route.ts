import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const an = parseInt(request.nextUrl.searchParams.get("an") || String(new Date().getFullYear()));
  const anStr = String(an);

  const supabase = await createClient();

  const [angajatiRes, concediiRes] = await Promise.all([
    supabase.from("angajati").select("*").eq("activ", true).order("nume"),
    supabase.from("concedii").select("*").gte("data_start", `${anStr}-01-01`).lte("data_start", `${anStr}-12-31`),
  ]);

  const angajati = angajatiRes.data || [];
  const concedii = concediiRes.data || [];

  const rows = angajati.map((a, i) => {
    const angConcedii = concedii.filter((c) => c.angajat_id === a.id);
    const co = angConcedii.filter((c) => c.tip === "CO").reduce((s, c) => s + c.zile_lucratoare, 0);
    const med = angConcedii.filter((c) => c.tip === "MEDICAL").reduce((s, c) => s + c.zile_lucratoare, 0);
    const fp = angConcedii.filter((c) => c.tip === "FARA_PLATA").reduce((s, c) => s + c.zile_lucratoare, 0);
    const ev = angConcedii.filter((c) => c.tip === "EVENIMENT").reduce((s, c) => s + c.zile_lucratoare, 0);

    return {
      "Nr.": i + 1,
      "Prenume": a.prenume,
      "Nume": a.nume,
      "Departament": a.departament || "",
      "Zile CO/an": a.zile_co_an,
      "CO consumat": co,
      "CO ramas": a.zile_co_an - co,
      "Medical": med,
      "Fara plata": fp,
      "Eveniment": ev,
      "Total zile": co + med + fp + ev,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, ...rows.map((r) => String((r as Record<string, unknown>)[key] || "").length + 2)),
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, `Concedii ${an}`);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Raport Concedii ${an}.xlsx"`,
    },
  });
}
