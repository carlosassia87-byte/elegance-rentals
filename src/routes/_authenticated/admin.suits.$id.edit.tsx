import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSuit, updateSuit } from "@/lib/suits.functions";
import { listCategories } from "@/lib/categories.functions";
import { listSizes } from "@/lib/sizes.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/suits/$id/edit")({
  head: () => ({
    meta: [
      { title: "Editar Traje — La Casa del Disfraz" },
      { name: "description", content: "Editar una prenda del catálogo de La Casa del Disfraz." },
    ],
  }),
  component: EditSuitPage,
});

function EditSuitPage() {
  const { id } = useParams({ from: "/_authenticated/admin/suits/$id/edit" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchSuit = useServerFn(getSuit);
  const fetchCategories = useServerFn(listCategories);
  const fetchSizes = useServerFn(listSizes);
  const { data: suit, isLoading } = useQuery({
    queryKey: ["suit", id],
    queryFn: () => fetchSuit({ data: { id } }),
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: sizes = [] } = useQuery({ queryKey: ["sizes"], queryFn: fetchSizes });
  const updateSuitFn = useServerFn(updateSuit);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    color: "",
    price_per_day: "",
    images: [] as string[],
    sizes: [] as { size_id: string; stock: number }[],
  });

  useEffect(() => {
    if (!suit) return;
    setForm({
      name: suit.name,
      description: suit.description ?? "",
      category_id: suit.category_id ?? "",
      color: suit.color ?? "",
      price_per_day: String(suit.price_per_day),
      images: suit.images ?? [],
      sizes:
        (suit.suit_sizes as { size_id: string; stock: number }[] | undefined)?.map((s) => ({
          size_id: s.size_id,
          stock: s.stock,
        })) ?? [],
    });
  }, [suit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSuitFn({
        data: {
          id,
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
      queryClient.invalidateQueries({ queryKey: ["suit", id] });
      toast.success("Prenda actualizada correctamente");
      navigate({ to: "/admin/suits" });
    } catch (err) {
      toast.error("Error al actualizar la prenda");
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

  if (isLoading || !suit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Cargando datos de la prenda...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300/60 text-emerald-800 text-xs font-bold mb-2">
              Edición de Prenda
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Modificar Traje / Disfraz
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/admin/suits" })}
            className="rounded-xl text-xs font-bold border-slate-300"
          >
            ← Volver a Trajes
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">Nombre de la Prenda</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">Descripción / Piezas</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase">Categoría</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900">
                    <SelectValue placeholder="Seleccionar categoría" />
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
                  className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">Precio por Día ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.price_per_day}
                onChange={(e) => setForm((f) => ({ ...f, price_per_day: e.target.value }))}
                required
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold text-slate-800 uppercase">Tallas y Stock</Label>
                <button
                  type="button"
                  onClick={addSize}
                  className="rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 transition-colors"
                >
                  + Agregar Talla
                </button>
              </div>

              {form.sizes.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={s.size_id} onValueChange={(v) => updateSize(i, { size_id: v })}>
                    <SelectTrigger className="flex-1 h-9 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold">
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
                    className="w-24 h-9 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeSize(i)}
                    className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate({ to: "/admin/suits" })}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-5 py-2.5 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-6 py-2.5 text-xs shadow-sm active:scale-95 transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
