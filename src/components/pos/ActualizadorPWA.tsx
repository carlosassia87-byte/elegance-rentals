import React, { useEffect, useState } from "react";
import { Sparkles, RefreshCw, X, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActualizadorPWA() {
  const [hayNuevaVersion, setHayNuevaVersion] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const verificarActualizaciones = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // 1. Si ya había un worker esperando activación
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setHayNuevaVersion(true);
        }

        // 2. Detectar cuando se descarga una nueva versión
        registration.addEventListener("updatefound", () => {
          const nuevoWorker = registration?.installing;
          if (nuevoWorker) {
            nuevoWorker.addEventListener("statechange", () => {
              if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(nuevoWorker);
                setHayNuevaVersion(true);
              }
            });
          }
        });

        // 3. Forzar chequeo de actualización de inmediato al abrir la app
        registration.update().catch(() => {});
      } catch (err) {
        console.warn("Aviso al verificar actualizaciones PWA:", err);
      }
    };

    verificarActualizaciones();

    // Re-comprobar cada vez que la app vuelve a primer plano (focus)
    const handleVisibilidad = () => {
      if (document.visibilityState === "visible" && registration) {
        registration.update().catch(() => {});
      }
    };

    // Re-comprobar periódicamente cada 10 minutos
    const interval = setInterval(() => {
      if (registration && navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 10 * 60 * 1000);

    document.addEventListener("visibilitychange", handleVisibilidad);

    // Escuchar cuando el nuevo Service Worker tome el control
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilidad);
    };
  }, []);

  const handleActualizarAhora = () => {
    setActualizando(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  };

  if (!hayNuevaVersion) return null;

  return (
    <aside aria-label="Notificación de actualización" className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 max-w-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black">
          <ArrowUpCircle className="h-5 w-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 leading-none">
            Nueva Versión Disponible
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            Hay mejoras y actualizaciones listas para tu aplicación.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleActualizarAhora}
            disabled={actualizando}
            className="h-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3 rounded-xl gap-1 shadow-xs cursor-pointer"
          >
            {actualizando ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {actualizando ? "Actualizando..." : "Actualizar"}
          </Button>

          <button
            onClick={() => setHayNuevaVersion(false)}
            title="Cerrar notificación"
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
