import React, { useEffect } from "react";
import { toast } from "sonner";

export function ActualizadorPWA() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let refreshing = false;

    // Cuando el nuevo Service Worker toma el control, recargar limpiamente la página
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const aplicarActualizacionAutomatica = (worker: ServiceWorker) => {
      toast.info("Nueva versión detectada. Actualizando sistema automáticamente...", {
        duration: 1500,
      });
      setTimeout(() => {
        worker.postMessage({ type: "SKIP_WAITING" });
      }, 300);
    };

    const verificarActualizaciones = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // Siempre consultar al servidor si hay cambios
        });

        // 1. Si ya había un Service Worker nuevo esperando
        if (registration.waiting) {
          aplicarActualizacionAutomatica(registration.waiting);
          return;
        }

        // 2. Detectar cuando se descarga una nueva versión
        registration.addEventListener("updatefound", () => {
          const nuevoWorker = registration?.installing;
          if (nuevoWorker) {
            nuevoWorker.addEventListener("statechange", () => {
              if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Hay nueva versión: aplicar automáticamente de inmediato
                aplicarActualizacionAutomatica(nuevoWorker);
              }
            });
          }
        });

        // 3. Forzar chequeo inmediato al iniciar la app
        registration.update().catch(() => {});
      } catch (err) {
        console.warn("Aviso al verificar actualizaciones PWA:", err);
      }
    };

    verificarActualizaciones();

    // Re-comprobar cada vez que la app pasa a primer plano (focus / maximizar)
    const handleVisibilidad = () => {
      if (document.visibilityState === "visible" && registration && navigator.onLine) {
        registration.update().catch(() => {});
      }
    };

    // Re-comprobar periódicamente cada 5 minutos
    const interval = setInterval(() => {
      if (registration && navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 5 * 60 * 1000);

    document.addEventListener("visibilitychange", handleVisibilidad);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilidad);
    };
  }, []);

  return null;
}
