import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid, Shirt, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administración — Elegance Rent" },
      { name: "description", content: "Panel de administración de Elegance Rent." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const items = [
    { title: "Trajes", description: "Gestionar catálogo de trajes, tallas y stock.", href: "/admin/suits", icon: Shirt },
    { title: "Reservas", description: "Ver y administrar las reservas de clientes.", href: "/admin/rentals", icon: CalendarCheck },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Panel de administración</h1>
      <p className="mt-2 text-muted-foreground">Bienvenido. Selecciona una sección para continuar.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.title} to={item.href} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
