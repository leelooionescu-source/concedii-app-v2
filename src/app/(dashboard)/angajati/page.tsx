"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { validate, angajatSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-log";
import type { Angajat } from "@/lib/types";

const emptyForm = {
  nume: "",
  prenume: "",
  departament: "",
  zile_co_an: 21,
  data_angajare: "",
  activ: true,
};

export default function AngajatiPage() {
  const supabase = createClient();
  const [angajati, setAngajati] = useState<Angajat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("angajati").select("*").order("activ", { ascending: false }).order("nume");
    setAngajati(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = angajati.filter((a) => {
    const q = search.toLowerCase();
    return `${a.prenume} ${a.nume} ${a.departament}`.toLowerCase().includes(q);
  });

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Angajat) {
    setEditId(a.id);
    setForm({
      nume: a.nume,
      prenume: a.prenume,
      departament: a.departament || "",
      zile_co_an: a.zile_co_an,
      data_angajare: a.data_angajare || "",
      activ: a.activ,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const v = validate(angajatSchema, form);
    if (!v.success) return;

    if (editId) {
      const { error } = await supabase.from("angajati").update(v.data).eq("id", editId);
      if (error) { toast.error("Eroare la actualizare"); return; }
      logActivity("update", "angajati", editId, `${form.prenume} ${form.nume}`);
      toast.success("Angajat actualizat");
    } else {
      const { error } = await supabase.from("angajati").insert(v.data);
      if (error) { toast.error("Eroare la adaugare"); return; }
      logActivity("create", "angajati", null, `${form.prenume} ${form.nume}`);
      toast.success("Angajat adaugat");
    }
    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(a: Angajat) {
    if (!confirm(`Stergi angajatul ${a.prenume} ${a.nume}? Toate concediile asociate vor fi sterse.`)) return;
    const { error } = await supabase.from("angajati").delete().eq("id", a.id);
    if (error) { toast.error("Eroare la stergere"); return; }
    logActivity("delete", "angajati", a.id, `${a.prenume} ${a.nume}`);
    toast.success("Angajat sters");
    fetchData();
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title"><Users className="h-5 w-5" /> Angajati</h1>
        <button className="btn-add" onClick={openCreate}><Plus className="h-4 w-4" /> Adauga</button>
      </div>

      <div className="search-bar">
        <Input
          placeholder="Cauta angajat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-search"><Search className="h-4 w-4" /> Cauta</button>
      </div>

      <div className="content-card">
        <table className="app-table">
          <thead>
            <tr>
              <th className="col-nr">#</th>
              <th>Prenume</th>
              <th>Nume</th>
              <th>Departament</th>
              <th>Data angajare</th>
              <th style={{ textAlign: "center" }}>Zile CO/an</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Se incarca...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Niciun angajat gasit</td></tr>
            ) : filtered.map((a, i) => (
              <tr key={a.id}>
                <td className="col-nr">{i + 1}</td>
                <td className="col-bold">{a.prenume}</td>
                <td className="col-bold">{a.nume}</td>
                <td>{a.departament || "-"}</td>
                <td>{a.data_angajare || "-"}</td>
                <td style={{ textAlign: "center" }}>{a.zile_co_an}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={a.activ ? "badge-activ" : "badge-suspendat"}>
                    {a.activ ? "Activ" : "Inactiv"}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div className="flex items-center justify-center gap-1">
                    <button className="btn-action btn-action-edit" onClick={() => openEdit(a)} title="Editeaza">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="btn-action btn-action-delete" onClick={() => handleDelete(a)} title="Sterge">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog adauga/editeaza */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editeaza angajat" : "Adauga angajat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prenume</Label>
                <Input value={form.prenume} onChange={(e) => setForm({ ...form, prenume: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input value={form.nume} onChange={(e) => setForm({ ...form, nume: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Departament</Label>
              <Input value={form.departament} onChange={(e) => setForm({ ...form, departament: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zile CO/an</Label>
                <Input type="number" min={1} max={50} value={form.zile_co_an} onChange={(e) => setForm({ ...form, zile_co_an: parseInt(e.target.value) || 21 })} />
              </div>
              <div className="space-y-2">
                <Label>Data angajare</Label>
                <Input type="date" value={form.data_angajare} onChange={(e) => setForm({ ...form, data_angajare: e.target.value })} />
              </div>
            </div>
            {editId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activ"
                  checked={form.activ}
                  onChange={(e) => setForm({ ...form, activ: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="activ">Activ</Label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuleaza</Button>
              <Button onClick={handleSave}>{editId ? "Salveaza" : "Adauga"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
