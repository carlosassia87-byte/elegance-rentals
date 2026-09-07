import { createFileRoute } from "@tanstack/react-router";
import { CatalogoWeb } from "@/components/catalogo/CatalogoWeb";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo de Trajes & Disfraces — Alquiler Online" },
      { name: "description", content: "Explora nuestra colección de disfraces y trajes en alquiler. Consulta disponibilidad y aparta directamente por WhatsApp." },
    ],
  }),
  component: CatalogoPage,
});

function CatalogoPage() {
  return <CatalogoWeb />;
}

