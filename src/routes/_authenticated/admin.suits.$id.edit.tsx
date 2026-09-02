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
      { title: "Editar Traje — Elegance Rent" },
      { name: "description", content: "Editar un traje del catálogo." },
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
      toast.success("Traje actualizado");
      navigate({ to: "/admin/suits" });
    } catch (err) {
      toast.error("Error al actualizar el traje");
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

  if (isLoading || !suit) return <div className="p-12 text-center">Cargando...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Editar traje</h1>
      <Card className="mt-8">
        <CardContent className="pt-6">
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
            <div className="flex gap-2 pt-4">
              <Button type="submit">Guardar cambios</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/suits" })}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
