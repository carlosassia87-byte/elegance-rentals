import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shirt, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSuits } from "@/lib/suits.functions";
import { listCategories } from "@/lib/categories.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo de Trajes — Elegance Rent" },
      { name: "description", content: "Descubre y reserva trajes para novio, quinceañero, smoking y más eventos en Elegance Rent." },
      { property: "og:title", content: "Catálogo de Trajes — Elegance Rent" },
      { property: "og:description", content: "Descubre y reserva trajes para novio, quinceañero, smoking y más eventos." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: suits = [], isLoading } = useQuery({ queryKey: ["suits"], queryFn: useServerFn(listSuits) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: useServerFn(listCategories) });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = suits.filter((suit) => {
    const matchesSearch = suit.name.toLowerCase().includes(search.toLowerCase()) ||
      (suit.color ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || suit.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/50 px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          El traje perfecto para tu evento
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Alquiler de trajes de novio, quinceañero, smoking y más. Reserva online y vístete elegante.
        </p>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("all")}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 text-center text-muted-foreground">Cargando catálogo...</div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
            <Shirt className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No encontramos trajes con esos filtros.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((suit) => (
              <Link key={suit.id} to="/suits/$id" params={{ id: suit.id }}>
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="aspect-[4/3] bg-muted">
                    {suit.images && suit.images.length > 0 ? (
                      <img
                        src={suit.images[0]}
                        alt={suit.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Shirt className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{suit.name}</h3>
                      {(suit.categories as { name: string } | null)?.name && (
                        <Badge variant="secondary">{(suit.categories as { name: string }).name}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{suit.description ?? "Sin descripción"}</p>
                    <p className="mt-3 font-medium text-primary">${suit.price_per_day.toLocaleString()} / día</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
