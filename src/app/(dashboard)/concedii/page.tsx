"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { validate, concediuSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-log";
import { zileLucratoare } from "@/lib/holidays";
import { TIPURI_CONCEDIU, TIP_BADGE_COLORS } from "@/lib/types";
import type { Angajat, Concediu } from "@/lib/types";
import { formatDateRO } from "@/lib/format";

const emptyForm = {
  angajat_id: "",
  tip: "CO" as const,
  data_start: "",
  data_sfarsit: "",
  observatii: "",
};

export default function ConcediiPage() {
  return (
    <Suspense>
      <ConcediiContent />
    </Suspense>
  );
}

function ConcediiContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [concedii, setConcedii] = useState<Concediu[]>([]);
  const [angajati, setAngajati] = useState<Angajat[]>([]);
  const [loading, setLoading] = useState(true);
  const [an, setAn] = useState(new Date().getFullYear());
  const [filtruAngajat, setFiltruAngajat] = useState(searchParams.get("angajat_id") || "");
  const [filtruTip, setFiltruTip] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [zilePrev, setZilePrev] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const anStr = String(an);
    let query = supabase
      .from("concedii")
      .select("*, angajati(*)")
      .gte("data_start", `${anStr}-01-01`)
      .lte("data_start", `${anStr}-12-31`)
      .order("data_start", { ascending: true });

    if (filtruAngajat) query = query.eq("angajat_id", filtruAngajat);
    if (filtruTip) query = query.eq("tip", filtruTip);

    const [concediiRes, angajatiRes] = await Promise.all([
      query,
      supabase.from("angajati").select("*").eq("activ", true).order("nume"),
    ]);

    setConcedii(concediiRes.data || []);
    setAngajati(angajatiRes.data || []);
    setLoading(false);
  }, [supabase, an, filtruAngajat, filtruTip]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calcul preview zile lucratoare
  useEffect(() => {
    if (form.data_start && form.data_sfarsit) {
      const ds = new Date(form.data_start);
      const de = new Date(form.data_sfarsit);
      if (ds <= de) {
        setZilePrev(zileLucratoare(ds, de));
      } else {
        setZilePrev(null);
      }
    } else {
      setZilePrev(null);
    }
  }, [form.data_start, form.data_sfarsit]);

  function openCreate() {
    setForm(emptyForm);
    setZilePrev(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    const v = validate(concediuSchema, form);
    if (!v.success) return;

    const ds = new Date(form.data_start);
    const de = new Date(form.data_sfarsit);
    if (ds > de) {
      toast.error("Data start nu poate fi dupa data sfarsit");
      return;
    }

    const zile = zileLucratoare(ds, de);
    const { error } = await supabase.from("concedii").insert({
      ...v.data,
      zile_lucratoare: zile,
    });

    if (error) { toast.error("Eroare la adaugare"); return; }

    const ang = angajati.find((a) => a.id === form.angajat_id);
    logActivity("create", "concedii", null, `${ang?.prenume || ""} ${ang?.nume || ""} - ${TIPURI_CONCEDIU[form.tip]}`);
    toast.success(`Concediu adaugat: ${zile} zile lucratoare`);
    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(c: Concediu) {
    if (!confirm("Stergi acest concediu?")) return;
    const { error } = await supabase.from("concedii").delete().eq("id", c.id);
    if (error) { toast.error("Eroare la stergere"); return; }
    logActivity("delete", "concedii", c.id, `${c.angajati?.prenume || ""} ${c.angajati?.nume || ""}`);
    toast.success("Concediu sters");
    fetchData();
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title"><CalendarDays className="h-5 w-5" /> Concedii - {an}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAn(an - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold text-sm">{an}</span>
          <Button variant="outline" size="sm" onClick={() => setAn(an + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <button className="btn-add" onClick={openCreate}><Plus className="h-4 w-4" /> Adauga</button>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          className="border rounded-md px-3 py-2 text-sm bg-white"
          value={filtruAngajat}
          onChange={(e) => setFiltruAngajat(e.target.value)}
        >
          <option value="">Toti angajatii</option>
          {angajati.map((a) => (
            <option key={a.id} value={a.id}>{a.prenume} {a.nume}</option>
          ))}
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-white"
          value={filtruTip}
          onChange={(e) => setFiltruTip(e.target.value)}
        >
          <option value="">Toate tipurile</option>
          {Object.entries(TIPURI_CONCEDIU).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="content-card">
        <table className="app-table">
          <thead>
            <tr>
              <th className="col-nr">#</th>
              <th>Angajat</th>
              <th>Tip</th>
              <th>Data start</th>
              <th>Data sfarsit</th>
              <th style={{ textAlign: "center" }}>Zile lucr.</th>
              <th>Observatii</th>
              <th style={{ textAlign: "center" }}>Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Se incarca...</td></tr>
            ) : concedii.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Niciun concediu gasit</td></tr>
            ) : concedii.map((c, i) => (
              <tr key={c.id}>
                <td className="col-nr">{i + 1}</td>
                <td className="col-bold">{c.angajati?.prenume} {c.angajati?.nume}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TIP_BADGE_COLORS[c.tip] || "bg-gray-400 text-white"}`}>
                    {c.tip}
                  </span>
                </td>
                <td>{formatDateRO(c.data_start)}</td>
                <td>{formatDateRO(c.data_sfarsit)}</td>
                <td style={{ textAlign: "center" }}>{c.zile_lucratoare}</td>
                <td className="text-gray-500 text-xs">{c.observatii || "-"}</td>
                <td style={{ textAlign: "center" }}>
                  <button className="btn-action btn-action-delete" onClick={() => handleDelete(c)} title="Sterge">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog adauga */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adauga concediu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Angajat</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={form.angajat_id}
                onChange={(e) => setForm({ ...form, angajat_id: e.target.value })}
              >
                <option value="">Selecteaza angajat...</option>
                {angajati.map((a) => (
                  <option key={a.id} value={a.id}>{a.prenume} {a.nume}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tip concediu</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={form.tip}
                onChange={(e) => setForm({ ...form, tip: e.target.value as typeof form.tip })}
              >
                {Object.entries(TIPURI_CONCEDIU).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data start</Label>
                <Input type="date" value={form.data_start} onChange={(e) => setForm({ ...form, data_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data sfarsit</Label>
                <Input type="date" value={form.data_sfarsit} onChange={(e) => setForm({ ...form, data_sfarsit: e.target.value })} />
              </div>
            </div>
            {zilePrev !== null && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800 font-semibold">{zilePrev} zile lucratoare</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observatii</Label>
              <Input value={form.observatii} onChange={(e) => setForm({ ...form, observatii: e.target.value })} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuleaza</Button>
              <Button onClick={handleSave}>Adauga</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
