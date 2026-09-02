import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shirt, CalendarDays, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSuit } from "@/lib/suits.functions";
import { useServerFn } from "@tanstack/react-start";
import { format, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/suits/$id")({
  head: () => ({
    meta: [
      { title: "Detalle del Traje — Elegance Rent" },
      { name: "description", content: "Ver disponibilidad y detalles del traje seleccionado." },
    ],
  }),
  component: SuitDetailPage,
});

function SuitDetailPage() {
  const { id } = Route.useParams();
  const { data: suit, isLoading } = useQuery({
    queryKey: ["suit", id],
    queryFn: () => useServerFn(getSuit)({ data: { id } }),
  });

  if (isLoading) return <div className="p-12 text-center">Cargando...</div>;
  if (!suit) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Traje no encontrado</h1>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const sizes = (suit.suit_sizes as { id: string; size_id: string; stock: number; sizes: { name: string } }[] | undefined) ?? [];
  const rentals = (suit.rentals as { id: string; start_date: string; end_date: string; status: string; suit_size_id: string | null }[] | undefined) ?? [];

  function isSizeAvailable(sizeId: string, dateStr: string) {
    const date = parseISO(dateStr);
    const activeRentals = rentals.filter(
      (r) =>
        r.suit_size_id === sizeId &&
        !["cancelled", "completed"].includes(r.status)
    );
    return !activeRentals.some((r) =>
      isWithinInterval(date, { start: parseISO(r.start_date), end: parseISO(r.end_date) })
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
          {suit.images && suit.images.length > 0 ? (
            <img src={suit.images[0]} alt={suit.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="h-24 w-24" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            {(suit.categories as { name: string } | null)?.name && (
              <Badge variant="secondary">{(suit.categories as { name: string }).name}</Badge>
            )}
            {suit.color && <Badge variant="outline">{suit.color}</Badge>}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{suit.name}</h1>
          <p className="mt-2 text-muted-foreground">{suit.description ?? "Sin descripción"}</p>
          <p className="mt-6 text-2xl font-medium text-primary">${suit.price_per_day.toLocaleString()} / día</p>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">Tallas disponibles</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <Badge key={s.id} variant={s.stock > 0 ? "default" : "secondary"}>
                  {s.sizes.name} (stock: {s.stock})
                </Badge>
              ))}
              {sizes.length === 0 && <p className="text-sm text-muted-foreground">Sin tallas configuradas.</p>}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">Disponibilidad por talla</h2>
            <p className="text-sm text-muted-foreground">
              Las fechas resaltadas están ocupadas para esa talla.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {sizes.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="font-medium text-foreground">{s.sizes.name}</div>
                    <div className="mt-2 space-y-1">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i);
                        const dateStr = format(date, "yyyy-MM-dd");
                        const available = isSizeAvailable(s.id, dateStr);
                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                              available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700 line-through"
                            }`}
                          >
                            <span>{format(date, "EEE d MMM", { locale: es })}</span>
                            <span>{available ? "Libre" : "Ocupado"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Link to="/suits/$id/rent" params={{ id: suit.id }}>
              <Button size="lg" className="w-full sm:w-auto">
                <CalendarDays className="mr-2 h-5 w-5" /> Reservar ahora
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
