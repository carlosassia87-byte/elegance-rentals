import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSuits, createSuit, deleteSuit } from "@/lib/suits.functions";
import { listCategories } from "@/lib/categories.functions";
import { listSizes } from "@/lib/sizes.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/suits")({
  head: () => ({
    meta: [
      { title: "Administrar Trajes — La Casa del Disfraz" },
      { name: "description", content: "Gestiona el catálogo de trajes y disfraces." },
    ],
  }),
  component: AdminSuitsPage,
});

function AdminSuitsPage() {
  const queryClient = useQueryClient();
  const fetchSuits = useServerFn(listSuits);
  const fetchCategories = useServerFn(listCategories);
  const fetchSizes = useServerFn(listSizes);
  const { data: suits = [], isLoading } = useQuery({ queryKey: ["admin-suits"], queryFn: fetchSuits });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: sizes = [] } = useQuery({ queryKey: ["sizes"], queryFn: fetchSizes });
  const createSuitFn = useServerFn(createSuit);
  const deleteSuitFn = useServerFn(deleteSuit);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    color: "",
    price_per_day: "",
    images: [] as string[],
    sizes: [] as { size_id: string; stock: number }[],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createSuitFn({
        data: {
          name: form.name,
          description: form.description,
          category_id: form.category_id || undefined,
          color: form.color,
          price_per_day: Number(form.price_per_day),
          images: form.images,
          sizes: form.sizes,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-suits"] });
      setOpen(false);
      setForm({ name: "", description: "", category_id: "", color: "", price_per_day: "", images: [], sizes: [] });
      toast.success("Traje creado correctamente");
    } catch (err) {
      toast.error("Error al crear el traje");
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este traje?")) return;
    try {
      await deleteSuitFn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["admin-suits"] });
      toast.success("Traje eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
      console.error(err);
    }
  }

  function addSize() {
    setForm((f) => ({ ...f, sizes: [...f.sizes, { size_id: "", stock: 1 }] }));
  }

  function updateSize(index: number, patch: Partial<{ size_id: string; stock: number }>) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function removeSize(index: number) {
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== index) }));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Cargando catálogo de trajes...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300/60 text-emerald-800 text-xs font-bold mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Catálogo de Alquiler
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Gestión de Trajes y Disfraces
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Control de inventario, stock por tallas y precios de alquiler por día.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 text-xs font-bold transition-all"
            >
              ← Volver al Panel
            </Link>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold shadow-sm active:scale-95 transition-all text-xs h-9">
                  <Plus className="mr-1.5 h-4 w-4" /> Nuevo Traje
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white p-0 border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden">
                <DialogHeader className="px-6 py-4 bg-slate-900 text-white">
                  <DialogTitle className="text-sm font-black uppercase tracking-wider text-slate-100">
                    Agregar Nuevo Traje / Disfraz
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Nombre de la Prenda</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ej. Traje Smoking Negro de Gala"
                      required
                      className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Descripción / Piezas</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Ej. Saco, chaleco, pantalón, corbatín"
                      className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Categoría</Label>
                      <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                        <SelectTrigger className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Color</Label>
                      <Input
                        value={form.color}
                        onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                        placeholder="Ej. Negro, Azul Marino"
                        className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Precio Alquiler por Día ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.price_per_day}
                      onChange={(e) => setForm((f) => ({ ...f, price_per_day: e.target.value }))}
                      required
                      placeholder="0"
                      className="h-9 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm font-black text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">URLs de Fotos (separadas por coma)</Label>
                    <Input
                      value={form.images.join(", ")}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          images: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="https://..."
                      className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-extrabold text-slate-800 uppercase">Tallas y Stock</Label>
                      <button
                        type="button"
                        onClick={addSize}
                        className="rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 transition-colors"
                      >
                        + Agregar Talla
                      </button>
                    </div>
                    {form.sizes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Select value={s.size_id} onValueChange={(v) => updateSize(i, { size_id: v })}>
                          <SelectTrigger className="flex-1 h-8 rounded-lg border border-slate-300 bg-white text-xs font-bold">
                            <SelectValue placeholder="Talla" />
                          </SelectTrigger>
                          <SelectContent>
                            {sizes.map((sz) => (
                              <SelectItem key={sz.id} value={sz.id}>
                                {sz.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          value={s.stock}
                          onChange={(e) => updateSize(i, { stock: Number(e.target.value) })}
                          className="w-20 h-8 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => removeSize(i)}
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-5 py-2 text-xs shadow-sm active:scale-95"
                    >
                      Guardar Traje
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* TARJETAS DE TRAJES */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {suits.map((suit) => (
            <div
              key={suit.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{suit.name}</h3>
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800 border border-emerald-200 font-mono">
                    ${Number(suit.price_per_day).toLocaleString()} / día
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 font-medium">
                  {(suit.categories as { name: string } | null)?.name ?? "General"} {suit.color ? `· Color: ${suit.color}` : ""}
                </p>
                {suit.description && (
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {suit.description}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <Link to="/admin/suits/$id/edit" params={{ id: suit.id }}>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold border-slate-300 h-8">
                    <Pencil className="mr-1.5 h-3.5 w-3.5 text-slate-600" /> Editar Ficha
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(suit.id)}
                  className="rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {suits.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <p className="text-sm font-bold text-slate-700">No hay trajes cargados todavía en el catálogo.</p>
            <p className="mt-1 text-xs text-slate-500">Usa el botón "Nuevo Traje" para comenzar a registrar prendas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
