import React, { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Clock,
  FileText,
  DollarSign,
  Undo2,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";
import {
  subscribeSyncState,
  procesarColaSincronizacion,
  precargarDatosOffline,
  SyncState,
} from "@/services/offlineSyncService";
import {
  obtenerColaSincronizacion,
  SyncQueueItem,
} from "@/services/offlineDbService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function IndicadorModoOffline() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [colaItems, setColaItems] = useState<SyncQueueItem[]>([]);
  const [cargandoCola, setCargandoCola] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newState) => {
      setSyncState(newState);
    });
    return () => unsubscribe();
  }, []);

  const cargarDetalleCola = async () => {
    setCargandoCola(true);
    try {
      const items = await obtenerColaSincronizacion();
      setColaItems(items);
    } catch (e) {
      console.warn("Error cargando cola:", e);
    } finally {
      setCargandoCola(false);
    }
  };

  const abrirModal = async () => {
    await cargarDetalleCola();
    setModalOpen(true);
  };

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
    await cargarDetalleCola();

    if (res.fallidas > 0) {
      toast.error(`Sincronizados: ${res.exitosas}, Pendientes con error: ${res.fallidas}`);
    } else if (res.exitosas > 0) {
      toast.success(`¡Sincronización completada! ${res.exitosas} transacciones subidas a la nube.`);
    } else {
      toast.success("Catálogo local e información sincronizada con éxito.");
    }
  };

  const renderIconoTipo = (tipo: SyncQueueItem["tipo"]) => {
    switch (tipo) {
      case "NUEVA_FACTURA":
        return <FileText className="h-4 w-4 text-sky-600" />;
      case "NUEVO_ABONO":
        return <DollarSign className="h-4 w-4 text-emerald-600" />;
      case "DEVOLUCION_TRAJE":
        return <Undo2 className="h-4 w-4 text-amber-600" />;
      case "NUEVO_CLIENTE":
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      default:
        return <Database className="h-4 w-4 text-slate-500" />;
    }
  };

  const renderDetalleItem = (item: SyncQueueItem) => {
    const fecha = new Date(item.timestamp).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    switch (item.tipo) {
      case "NUEVA_FACTURA":
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                Factura #{item.datos?.factura?.NUMEROFACT || "Pendiente"}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {fecha}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 truncate">
              Cliente: {item.datos?.factura?.CCLIENTE || "General"} · Total: $
              {Number(item.datos?.factura?.FTOTALVENTADEPOSITO || 0).toLocaleString("es-CO")}
            </p>
          </div>
        );
      case "NUEVO_ABONO":
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 text-xs">
                Abono Factura #{item.datos?.facturaNumero || item.datos?.abono?.AFACTURA || "—"}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {fecha}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 truncate">
              Valor: ${Number(item.datos?.abono?.AVALOR || 0).toLocaleString("es-CO")} · Saldo restante: $
              {Number(item.datos?.nuevoSaldo ?? item.datos?.abono?.ASALDO_NUEVO ?? 0).toLocaleString("es-CO")}
            </p>
          </div>
        );
      case "DEVOLUCION_TRAJE":
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800 text-xs">
                Devolución Prendas #{item.datos?.numeroFact || "—"}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {fecha}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 truncate">
              Prendas devueltas: {item.datos?.itemsDevueltos?.length || 1} · Depósito devuelto: $
              {Number(item.datos?.montoNetoDevuelto || 0).toLocaleString("es-CO")}
            </p>
          </div>
        );
      case "NUEVO_CLIENTE":
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-800 text-xs">
                Nuevo Cliente C.C. {item.datos?.cliente?.CEDULA || "—"}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {fecha}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 truncate">
              {item.datos?.cliente?.NOMBRE} · Tel: {item.datos?.cliente?.TELEFONO || "—"}
            </p>
          </div>
        );
      default:
        return <span className="text-xs text-slate-700">Operación local guardada</span>;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {syncState.isOnline ? (
          <button
            type="button"
            onClick={abrirModal}
            title={
              syncState.pendingCount > 0
                ? `${syncState.pendingCount} operaciones pendientes por subir a la nube. Clic para ver cola.`
                : "Conectado al Servidor (En Línea). Clic para ver estado de sincronización."
            }
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all border shadow-xs select-none ${
              syncState.pendingCount > 0
                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400 animate-pulse"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
            }`}
          >
            {syncState.isSyncing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-600" />
            ) : syncState.pendingCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
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
                ? `${syncState.pendingCount} Pendiente${syncState.pendingCount > 1 ? "s" : ""}`
                : "En Línea"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={abrirModal}
            title="Modo Offline Activo: Haz clic para ver las transacciones acumuladas en la cola local."
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100 hover:border-rose-400 shadow-xs cursor-pointer select-none animate-pulse"
          >
            <WifiOff className="h-3.5 w-3.5 text-rose-600" />
            <span>
              Modo Local
              {syncState.pendingCount > 0 ? ` (${syncState.pendingCount} pend.)` : " (Offline)"}
            </span>
          </button>
        )}
      </div>

      {/* MODAL DETALLE DE LA COLA DE SINCRONIZACIÓN */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/15">
                  <Layers className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Cola de Sincronización Local</h3>
                  <p className="text-xs text-slate-300">
                    {syncState.isOnline ? "Conectado a Supabase" : "Sin conexión a Internet (Modo Local)"}
                  </p>
                </div>
              </div>

              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                  syncState.isOnline
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}
              >
                {syncState.isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {syncState.isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="p-5 max-h-[380px] overflow-y-auto space-y-3">
            {cargandoCola ? (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-600" />
                <p className="text-xs">Cargando cola de operaciones...</p>
              </div>
            ) : colaItems.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-slate-800 text-sm">¡Todo está sincronizado!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  No hay ventas, abonos ni devoluciones pendientes en la cola local. Todos los registros están al día en la base de datos central.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Transacciones locales acumuladas ({colaItems.length})</span>
                  <span>Orden cronológico</span>
                </div>

                {colaItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs mt-0.5">
                      {renderIconoTipo(item.tipo)}
                    </div>
                    {renderDetalleItem(item)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              {colaItems.length > 0
                ? `${colaItems.length} operación(es) pendiente(s)`
                : "Base local y remota sincronizadas"}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setModalOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={handleForzarSincronizacion}
                disabled={syncState.isSyncing || !syncState.isOnline}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncState.isSyncing ? "animate-spin" : ""}`} />
                {syncState.isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

