import { createClient } from "@/lib/supabase/server";
import { format, differenceInDays, setYear } from "date-fns";
import { Users, CalendarDays, AlertTriangle, Sun, Cake } from "lucide-react";
import { TIP_BADGE_COLORS, TIPURI_CONCEDIU } from "@/lib/types";
import type { Angajat, Concediu } from "@/lib/types";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const an = new Date().getFullYear();
  const anStr = String(an);

  const [angajatiRes, concediiRes] = await Promise.all([
    supabase.from("angajati").select("*").eq("activ", true).order("nume"),
    supabase.from("concedii").select("*, angajati(*)").gte("data_start", `${anStr}-01-01`).lte("data_start", `${anStr}-12-31`),
  ]);

  const angajati: Angajat[] = angajatiRes.data || [];
  const concedii: Concediu[] = concediiRes.data || [];

  // Cine e in concediu azi
  const allConcediiRes = await supabase
    .from("concedii")
    .select("*, angajati(*)")
    .lte("data_start", today)
    .gte("data_sfarsit", today);
  const inConcediu: Concediu[] = allConcediiRes.data || [];

  // Sold per angajat
  const solduri = angajati.map((a) => {
    const coConsumat = concedii
      .filter((c) => c.angajat_id === a.id && c.tip === "CO")
      .reduce((sum, c) => sum + c.zile_lucratoare, 0);
    return {
      angajat: a,
      total: a.zile_co_an,
      consumat: coConsumat,
      ramas: a.zile_co_an - coConsumat,
    };
  });

  const lowBalance = solduri.filter((s) => s.ramas <= 3 && s.ramas >= 0).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <Sun className="h-5 w-5" />
          Panou - {an}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users className="h-5 w-5 text-blue-600" />} label="Angajati activi" value={angajati.length} />
        <StatCard icon={<CalendarDays className="h-5 w-5 text-purple-600" />} label="In concediu azi" value={inConcediu.length} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} label="Sold CO scazut" value={lowBalance} />
        <StatCard icon={<CalendarDays className="h-5 w-5 text-green-600" />} label={`Total concedii ${an}`} value={concedii.length} />
      </div>

      {/* In concediu azi */}
      {inConcediu.length > 0 && (
        <div className="content-card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-700">In concediu azi</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {inConcediu.map((c) => (
              <span
                key={c.id}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${TIP_BADGE_COLORS[c.tip] || "bg-gray-400 text-white"}`}
              >
                {c.angajati?.prenume} {c.angajati?.nume} - {TIPURI_CONCEDIU[c.tip] || c.tip}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Zile de nastere */}
      {(() => {
        const today = new Date();
        const thisYear = today.getFullYear();
        const upcoming = angajati
          .filter((a) => a.data_nastere)
          .map((a) => {
            const bday = new Date(a.data_nastere!);
            let nextBday = setYear(bday, thisYear);
            if (nextBday < today && differenceInDays(today, nextBday) > 0) {
              nextBday = setYear(bday, thisYear + 1);
            }
            const daysUntil = differenceInDays(nextBday, today);
            return { angajat: a, nextBday, daysUntil, dayMonth: format(nextBday, "dd.MM") };
          })
          .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 7)
          .sort((a, b) => a.daysUntil - b.daysUntil);

        if (upcoming.length === 0) return null;
        return (
          <div className="content-card mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <Cake className="h-4 w-4 text-pink-500" /> Zile de nastere (urmatoarele 7 zile)
              </h2>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {upcoming.map((b) => (
                <span key={b.angajat.id} className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  b.daysUntil === 0 ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-800"
                }`}>
                  {b.angajat.prenume} {b.angajat.nume} — {b.daysUntil === 0 ? "AZI!" : b.daysUntil === 1 ? "maine" : `${b.dayMonth} (${b.daysUntil} zile)`}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Sold zile CO */}
      <div className="content-card">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-700">Sold zile concediu odihna - {an}</h2>
          <Link href={`/api/export?an=${an}`} className="btn-add text-xs" style={{ padding: "6px 12px" }}>
            Export Excel
          </Link>
        </div>
        <table className="app-table">
          <thead>
            <tr>
              <th className="col-nr">#</th>
              <th>Angajat</th>
              <th>Departament</th>
              <th style={{ textAlign: "center" }}>Total/an</th>
              <th style={{ textAlign: "center" }}>Consumat</th>
              <th style={{ textAlign: "center" }}>Ramas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {solduri.map((s, i) => (
              <tr key={s.angajat.id}>
                <td className="col-nr">{i + 1}</td>
                <td className="col-bold">{s.angajat.prenume} {s.angajat.nume}</td>
                <td>{s.angajat.departament || "-"}</td>
                <td style={{ textAlign: "center" }}>{s.total}</td>
                <td style={{ textAlign: "center" }}>{s.consumat}</td>
                <td style={{ textAlign: "center" }}>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${
                      s.ramas > 5 ? "bg-green-500" : s.ramas > 0 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                  >
                    {s.ramas}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/concedii?angajat_id=${s.angajat.id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Detalii
                  </Link>
                </td>
              </tr>
            ))}
            {solduri.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Niciun angajat activ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="content-card p-4 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
