import { createFileRoute, Link } from "@tanstack/react-router";
import { Shirt, CalendarCheck, ArrowRight, Sparkles } from "lucide-react";
import logoAsset from "@/assets/logo.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel de Administración — La Casa del Disfraz" },
      { name: "description", content: "Panel de administración de La Casa del Disfraz: gestión de trajes y reservas." },
    ],
  }),
  component: AdminPage,
});

const items = [
  {
    title: "Trajes",
    description: "Gestiona el catálogo: crea trajes, asigna tallas y controla el stock disponible.",
    href: "/admin/suits",
    icon: Shirt,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Reservas",
    description: "Consulta y administra las reservas de tus clientes: confirma, actualiza o cancela.",
    href: "/admin/rentals",
    icon: CalendarCheck,
    accent: "bg-amber-100 text-amber-700",
  },
];

function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-background to-background">
      {/* Encabezado con marca */}
      <header className="border-b border-emerald-900/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:px-6">
          <img
            src={logoAsset.url}
            alt="La Casa del Disfraz"
            className="h-28 w-auto drop-shadow-md sm:h-36"
          />
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Para toda ocasión, sin importar tu edad
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Panel de administración
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Bienvenido. Selecciona una sección para continuar.
            </p>
          </div>
        </div>
      </header>

      {/* Tarjetas de secciones */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <Link key={item.title} to={item.href} className="group">
              <div className="relative h-full overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-emerald-300 group-hover:shadow-lg group-hover:shadow-emerald-900/10">
                <div className="flex items-center gap-4">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${item.accent}`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition-transform duration-200 group-hover:translate-x-1">
                  Ir a {item.title.toLowerCase()}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
