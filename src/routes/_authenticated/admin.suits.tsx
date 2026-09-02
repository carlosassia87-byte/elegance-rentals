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
      { title: "Administrar Trajes — Elegance Rent" },
      { name: "description", content: "Gestiona el catálogo de trajes de Elegance Rent." },
    ],
  }),
  component: AdminSuitsPage,
});

function AdminSuitsPage() {
  const queryClient = useQueryClient();
  const { data: suits = [], isLoading } = useQuery({ queryKey: ["admin-suits"], queryFn: useServerFn(listSuits) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: useServerFn(listCategories) });
  const { data: sizes = [] } = useQuery({ queryKey: ["sizes"], queryFn: useServerFn(listSizes) });
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

  if (isLoading) return <div className="p-12 text-center">Cargando...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Trajes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo traje
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar traje</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Precio por día</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price_per_day}
                  onChange={(e) => setForm((f) => ({ ...f, price_per_day: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>URLs de imágenes (separadas por coma)</Label>
                <Input
                  value={form.images.join(", ")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      images: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tallas y stock</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSize}>
                    Agregar talla
                  </Button>
                </div>
                {form.sizes.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={s.size_id} onValueChange={(v) => updateSize(i, { size_id: v })}>
                      <SelectTrigger className="flex-1">
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
                      className="w-24"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSize(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full">
                Guardar traje
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {suits.map((suit) => (
          <Card key={suit.id}>
            <CardHeader>
              <CardTitle className="text-lg">{suit.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {(suit.categories as { name: string } | null)?.name ?? "Sin categoría"} · {suit.color ?? "Sin color"}
              </p>
              <p className="mt-1 font-medium text-foreground">${suit.price_per_day.toLocaleString()} / día</p>
              <div className="mt-4 flex items-center gap-2">
                <Link to="/admin/suits/$id/edit" params={{ id: suit.id }}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(suit.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {suits.length === 0 && (
        <div className="mt-12 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">No hay trajes cargados todavía.</p>
          <p className="mt-2 text-sm text-muted-foreground">Usa el botón "Nuevo traje" para agregar uno.</p>
        </div>
      )}
    </div>
  );
}
