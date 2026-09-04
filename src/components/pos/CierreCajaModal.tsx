import React, { useState, useEffect } from "react";
import { DollarSign, Printer, X, Calendar, Wallet, ArrowDownRight, ArrowUpRight, TrendingDown, CheckCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { obtenerTerminalConfig, obtenerConfiguracionEmpresa, type EmpresaConfig } from "@/services/empresaCajaService";

interface CierreCajaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cajeroNombre?: string;
}

export function CierreCajaModal({ open, onOpenChange, cajeroNombre = "CAJERO PRINCIPAL" }: CierreCajaModalProps) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [cargando, setCargando] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const terminal = obtenerTerminalConfig();

  // Métricas del Arqueo
  const [totales, setTotales] = useState({
    alquilerEfectivo: 0,
    alquilerTransferencia: 0,
    totalAlquileres: 0,
    totalDepositosRecibidos: 0,
    totalDepositosDevueltos: 0,
    totalGastos: 0,
    efectivoEnCaja: 0,
    transferenciasEnCaja: 0,
    totalNetoCaja: 0,
    cantidadFacturas: 0,
  });

  const calcularArqueo = async () => {
    setCargando(true);
    try {
      const cfgEmpresa = await obtenerConfiguracionEmpresa();
      setEmpresa(cfgEmpresa);

      let alqEfec = 0;
      let alqTrans = 0;
      let depRecib = 0;
      let countFacts = 0;

      // 1. Facturas de hoy
      try {
        const { data: facts } = await supabase
          .from("FACTURA" as any)
          .select("*")
          .gte("FECHASALIDA", fecha);

        if (facts && facts.length > 0) {
          facts.forEach((f: any) => {
            alqEfec += Number(f.PAGOCONEFECTIVO || 0);
            alqTrans += Number(f.PAGOCONTRANFERENCIA || 0);
            depRecib += Number(f.FTOTALDEPOSITO || 0);
            countFacts++;
          });
        }
      } catch (e) {
        console.warn("Fallo lectura de facturas en Supabase:", e);
      }

      // Facturas locales
      try {
        const raw = localStorage.getItem("elegance_local_facturas");
        const localFacts = raw ? JSON.parse(raw) : [];
        if (localFacts && localFacts.length > 0 && countFacts === 0) {
          localFacts.forEach((f: any) => {
            alqEfec += Number(f.PAGOCONEFECTIVO || 0);
            alqTrans += Number(f.PAGOCONTRANFERENCIA || 0);
            depRecib += Number(f.FTOTALDEPOSITO || 0);
            countFacts++;
          });
        }
      } catch {}

      // 2. Gastos de hoy
      let gastosTotal = 0;
      try {
        const { data: gastos } = await supabase
          .from("GASTOS" as any)
          .select("*")
          .gte("FECHA", fecha);

        if (gastos) {
          gastos.forEach((g: any) => {
            gastosTotal += Number(g.VALORSALIDA || 0);
          });
        }
      } catch (e) {}

      // 3. Depósitos devueltos
      let depDevueltos = 0;
      try {
        const { data: deps } = await supabase
          .from("DEPOSITOENTREGADO" as any)
          .select("*")
          .gte("FECHA", fecha);

        if (deps) {
          deps.forEach((d: any) => {
            depDevueltos += Number(d.VALOR || 0);
          });
        }
      } catch (e) {}

      const efectivoEnCaja = Math.max(0, alqEfec + depRecib - depDevueltos - gastosTotal);
      const transferenciasEnCaja = alqTrans;
      const totalNeto = efectivoEnCaja + transferenciasEnCaja;

      setTotales({
        alquilerEfectivo: alqEfec,
        alquilerTransferencia: alqTrans,
        totalAlquileres: alqEfec + alqTrans,
        totalDepositosRecibidos: depRecib,
        totalDepositosDevueltos: depDevueltos,
        totalGastos: gastosTotal,
        efectivoEnCaja,
        transferenciasEnCaja,
        totalNetoCaja: totalNeto,
        cantidadFacturas: countFacts,
      });
    } catch (err) {
      console.error("Error calculando arqueo de caja:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      calcularArqueo();
    }
  }, [open, fecha]);

  const handleImprimirCierre = () => {
    window.print();
    toast.success("Imprimiendo comprobante de cierre de caja");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">
                ARQUEO Y CIERRE DE CAJA DEL DÍA
              </h2>
              <p className="text-[11px] text-slate-300">
                Resumen de ingresos por alquileres, garantías de depósitos y egresos
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* BARRA DE FILTRO Y DETALLES */}
          <div className="flex items-center justify-between rounded-md border border-slate-300 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-black uppercase text-slate-800">Fecha de Cuadre:</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-7 rounded border border-slate-400 bg-slate-50 px-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border">
                Caja: <strong className="text-red-700">{terminal.nombreCaja}</strong>
              </span>
              <button
                type="button"
                onClick={calcularArqueo}
                disabled={cargando}
                className="flex items-center gap-1 h-7 rounded bg-slate-700 px-2.5 text-xs font-bold text-white hover:bg-slate-900 shadow"
              >
                <RefreshCw className={`h-3 w-3 ${cargando ? "animate-spin" : ""}`} /> Recalcular
              </button>
            </div>
          </div>

          {/* TARJETA PRINCIPAL: TOTAL NETO ESPERADO */}
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-md text-center">
            <div className="text-xs font-black text-emerald-900 uppercase tracking-widest">
              TOTAL NETO EN CAJA (EFECTIVO + TRANSFERENCIAS)
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-1">
              ${totales.totalNetoCaja.toLocaleString("es-CO")}
            </div>
            <div className="text-xs font-semibold text-emerald-800 mt-1">
              Total facturas/operaciones procesadas hoy: <strong>{totales.cantidadFacturas}</strong>
            </div>
          </div>

          {/* DESGLOSE EN 2 COLUMNAS */}
          <div className="grid grid-cols-12 gap-3">
            {/* INGRESOS */}
            <div className="col-span-12 md:col-span-6 rounded-md border border-slate-300 bg-white p-3.5 shadow-sm space-y-2.5">
              <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b pb-1 text-emerald-700">
                <ArrowDownRight className="h-4 w-4" /> Ingresos Totales
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Alquileres (Efectivo):</span>
                  <span className="font-black text-slate-900">${totales.alquilerEfectivo.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Alquileres (Transferencia / Tarjeta):</span>
                  <span className="font-black text-slate-900">${totales.alquilerTransferencia.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Depósitos Recibidos (Garantía):</span>
                  <span className="font-black text-blue-700">${totales.totalDepositosRecibidos.toLocaleString("es-CO")}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-black text-slate-900">
                  <span>Total Ingresos Brutos:</span>
                  <span className="text-emerald-700">
                    ${(totales.totalAlquileres + totales.totalDepositosRecibidos).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>

            {/* EGRESOS Y SALIDAS */}
            <div className="col-span-12 md:col-span-6 rounded-md border border-slate-300 bg-white p-3.5 shadow-sm space-y-2.5">
              <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b pb-1 text-red-700">
                <ArrowUpRight className="h-4 w-4" /> Egresos y Salidas
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Depósitos Devueltos (Prendas):</span>
                  <span className="font-black text-red-600">-${totales.totalDepositosDevueltos.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Gastos / Salidas de Caja:</span>
                  <span className="font-black text-red-600">-${totales.totalGastos.toLocaleString("es-CO")}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-black text-slate-900">
                  <span>Total Egresos:</span>
                  <span className="text-red-700">
                    -${(totales.totalDepositosDevueltos + totales.totalGastos).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RESUMEN POR FORMA DE PAGO */}
          <div className="rounded-md border border-slate-300 bg-white p-3.5 shadow-sm space-y-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b pb-1">
              Desglose Disponible
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded bg-amber-50 p-2 border border-amber-200">
                <span className="text-[11px] font-bold text-amber-900 uppercase">Efectivo Físico en Caja:</span>
                <div className="text-base font-black text-amber-800 mt-0.5">
                  ${totales.efectivoEnCaja.toLocaleString("es-CO")}
                </div>
              </div>

              <div className="rounded bg-blue-50 p-2 border border-blue-200">
                <span className="text-[11px] font-bold text-blue-900 uppercase">Bancos / Datáfono / Transferencias:</span>
                <div className="text-base font-black text-blue-800 mt-0.5">
                  ${totales.transferenciasEnCaja.toLocaleString("es-CO")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between bg-slate-200 px-5 py-3 border-t border-slate-300">
          <button
            type="button"
            onClick={handleImprimirCierre}
            className="flex items-center gap-1.5 h-8 rounded bg-slate-800 px-4 text-xs font-black uppercase text-white hover:bg-black shadow"
          >
            <Printer className="h-4 w-4" /> Imprimir Comprobante de Arqueo
          </button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded bg-red-700 px-5 text-xs font-black uppercase text-white hover:bg-red-800 shadow"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
