import { createFileRoute } from "@tanstack/react-router";
import { PuntoDeVenta } from "@/components/pos/PuntoDeVenta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Punto de Venta — Alquiler de Trajes y Disfraces" },
      { name: "description", content: "Sistema de Alquiler de Trajes, Clientes, Facturación y Control de Depósitos." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return <PuntoDeVenta />;
}
