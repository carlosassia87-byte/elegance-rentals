import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import {
  subscribeSyncState,
  procesarColaSincronizacion,
  precargarDatosOffline,
  SyncState,
} from "@/services/offlineSyncService";
import { toast } from "sonner";

export function IndicadorModoOffline() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newState) => {
      setSyncState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleForzarSincronizacion = async () => {
    if (!syncState.isOnline) {
      toast.warning("Sin conexión a Internet", {
        description: "El sistema está operando en Modo Local. Los datos se sincronizarán al volver la red.",
      });
      return;
    }

    toast.info("Sincronizando con el servidor...", { duration: 2000 });
    const res = await procesarColaSincronizacion();
    await precargarDatosOffline();

    if (res.fallidas > 0) {
      toast.error(`Sincronizados: ${res.exitosas}, Pendientes con error: ${res.fallidas}`);
    } else if (res.exitosas > 0) {
      toast.success(`¡Sincronización completada! ${res.exitosas} transacciones subidas.`);
    } else {
      toast.success("Base de datos local actualizada y al día.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {syncState.isOnline ? (
        <div
          onClick={handleForzarSincronizacion}
          title={
            syncState.pendingCount > 0
              ? `${syncState.pendingCount} operaciones pendientes por subir. Clic para sincronizar.`
              : "Conectado al Servidor (Online). Clic para sincronizar base local."
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all border shadow-2xs ${
            syncState.pendingCount > 0
              ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          {syncState.isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin text-cyan-600" />
          ) : syncState.pendingCount > 0 ? (
            <AlertTriangle className="h-3 w-3 text-amber-600" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}

          <span>
            {syncState.isSyncing
              ? "Sincronizando..."
              : syncState.pendingCount > 0
              ? `${syncState.pendingCount} Pendientes`
              : "En Línea"}
          </span>
        </div>
      ) : (
        <div
          title="Modo Offline Activo: Puedes seguir facturando, consultando catálogo y clientes sin internet."
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs animate-pulse"
        >
          <WifiOff className="h-3 w-3 text-rose-600" />
          <span>
            Modo Local
            {syncState.pendingCount > 0 ? ` (${syncState.pendingCount} pend.)` : " (Offline)"}
          </span>
        </div>
      )}
    </div>
  );
}
