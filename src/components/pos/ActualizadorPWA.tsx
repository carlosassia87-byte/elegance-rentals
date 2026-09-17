import React, { useEffect } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    forzarActualizacionPOS?: () => Promise<void>;
  }
}

export function ActualizadorPWA() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Función global accesible desde cualquier menú o botón
    window.forzarActualizacionPOS = async () => {
      const toastId = toast.loading("Comprobando y descargando última versión...");
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            if (reg.active) {
              reg.active.postMessage({ type: "CLEAR_ALL_CACHES" });
            }
            await reg.update();
            await reg.unregister();
          }
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        toast.success("¡Sistema actualizado! Recargando...", { id: toastId });
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (e) {
        console.error("Error al forzar actualización:", e);
        window.location.reload();
      }
    };

    if (!("serviceWorker" in navigator)) return;

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
      toast.info("⚡ Nueva versión detectada. Actualizando POS automáticamente...", {
        duration: 2500,
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
    const handleFocus = () => {
      if (registration && navigator.onLine) {
        registration.update().catch(() => {});
      }
    };

    // Re-comprobar periódicamente cada 60 segundos
    const interval = setInterval(() => {
      if (registration && navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 60 * 1000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  return null;
}
