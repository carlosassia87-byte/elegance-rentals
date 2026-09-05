import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  X,
  Shirt,
  User,
  Phone,
  DollarSign,
  Calendar,
  AlertCircle,
  FileCheck2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  buscarFacturaParaDevolucion,
  registrarDevolucionCompleta,
  type FacturaDevolucionDetalle,
  type ItemDevolucionInfo,
  type ComprobanteDevolucionData,
} from "@/services/devolucionesService";
import type { EmpresaConfig } from "@/services/empresaCajaService";

interface DevolucionTrajesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: EmpresaConfig;
  facturaPreseleccionada?: string;
  cajeroNombre?: string;
  onDevolucionExitosa?: () => void;
}

export function DevolucionTrajesModal({
  open,
  onOpenChange,
  empresa,
  facturaPreseleccionada = "",
  cajeroNombre = "ADMINISTRADOR",
  onDevolucionExitosa,
}: DevolucionTrajesModalProps) {
  const [busqueda, setBusqueda] = useState(facturaPreseleccionada);
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState<FacturaDevolucionDetalle | null>(null);

  // Estados del formulario de devolución
  const [items, setItems] = useState<ItemDevolucionInfo[]>([]);
  const [deduccionPenalidad, setDeduccionPenalidad] = useState<string>("0");
  const [motivoDeduccion, setMotivoDeduccion] = useState<string>("");
  const [formaReintegro, setFormaReintegro] = useState<string>("EFECTIVO");
  const [procesando, setProcesando] = useState(false);

  // Modal de Comprobante / Recibo de Devolución
  const [comprobanteActivo, setComprobanteActivo] = useState<ComprobanteDevolucionData | null>(null);
  const [modalComprobanteOpen, setModalComprobanteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (facturaPreseleccionada) {
        setBusqueda(facturaPreseleccionada);
        ejecutarBusqueda(facturaPreseleccionada);
      } else {
        setBusqueda("");
        setDetalle(null);
        setItems([]);
      }
    }
  }, [open, facturaPreseleccionada]);

  const ejecutarBusqueda = async (term: string) => {
    if (!term.trim()) {
      toast.error("Ingresa el número de recibo o cédula a buscar");
      return;
    }
    setCargando(true);
    try {
      const res = await buscarFacturaParaDevolucion(term);
      if (!res) {
        toast.error("Factura no encontrada. Verifica el número o cédula.");
        setDetalle(null);
        setItems([]);
        return;
      }
      setDetalle(res);
      setItems(res.items);
      setDeduccionPenalidad("0");
      setMotivoDeduccion("");
      toast.success(`Factura #${res.factura.NUMEROFACT} cargada exitosamente`);
    } catch (e) {
      console.error(e);
      toast.error("Error al consultar la factura");
    } finally {
      setCargando(false);
    }
  };

  // Manejo de toggle de items seleccionados
  const toggleSeleccionItem = (index: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, seleccionadoParaDevolver: !it.seleccionadoParaDevolver } : it
      )
    );
  };

  const setCondicionItem = (index: number, condicion: ItemDevolucionInfo["condicionPrenda"]) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, condicionPrenda: condicion } : it))
    );
  };

  // Cálculos financieros en tiempo real
  const itemsSeleccionados = useMemo(() => {
    return items.filter((it) => it.seleccionadoParaDevolver);
  }, [items]);

  const totalDepositoSeleccionado = useMemo(() => {
    return itemsSeleccionados.reduce((acc, it) => acc + (it.valorDeposito * it.cantidad), 0);
  }, [itemsSeleccionados]);

  // Cálculo de retraso de 3 días y recargo de $7.000 / día
  const infoRetraso = useMemo(() => {
    if (!detalle?.fechaSalida) return null;
    const dSalida = new Date(detalle.fechaSalida);
    dSalida.setHours(0, 0, 0, 0);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffTime = Math.max(0, hoy.getTime() - dSalida.getTime());
    const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diasPermitidos = 3;
    const diasRetraso = Math.max(0, diasTranscurridos - diasPermitidos);
    const costoPorDia = 7000;
    const recargoSugerido = diasRetraso * costoPorDia;

    return {
      diasTranscurridos,
      diasPermitidos,
      diasRetraso,
      costoPorDia,
      recargoSugerido,
      tieneRetraso: diasRetraso > 0,
    };
  }, [detalle]);

  const penalidadNum = parseFloat(deduccionPenalidad) || 0;
  const montoNetoReintegrar = Math.max(0, totalDepositoSeleccionado - penalidadNum);

  // Confirmar y procesar la devolución
  const handleConfirmarDevolucion = async () => {
    if (!detalle) return;
    if (itemsSeleccionados.length === 0) {
      toast.error("Selecciona al menos una prenda para devolver");
      return;
    }

    setProcesando(true);
    try {
      const res = await registrarDevolucionCompleta({
        numeroFactura: detalle.factura.NUMEROFACT,
        clienteNombre: detalle.clienteNombre,
        clienteCedula: detalle.clienteCedula,
        clienteTelefono: detalle.clienteTelefono,
        itemsDevueltos: itemsSeleccionados.map((it) => ({
          codigoBarras: it.codigoBarras,
          descripcion: it.descripcion,
          talla: it.talla,
          cantidad: it.cantidad,
          valorDeposito: it.valorDeposito,
          condicion: it.condicionPrenda,
        })),
        depositoOriginalItems: totalDepositoSeleccionado,
        montoDeduccionPenalidad: penalidadNum,
        motivoDeduccion: penalidadNum > 0 ? motivoDeduccion : undefined,
        montoNetoDevuelto: montoNetoReintegrar,
        formaPago: formaReintegro,
        cajero: cajeroNombre,
      });

      if (res.ok && res.comprobante) {
        toast.success(`Devolución de $${montoNetoReintegrar.toLocaleString("es-CO")} procesada con éxito`);
        setComprobanteActivo(res.comprobante);
        setModalComprobanteOpen(true);
        if (onDevolucionExitosa) onDevolucionExitosa();

        // Recargar datos de la factura
        ejecutarBusqueda(detalle.factura.NUMEROFACT);
      } else {
        toast.error("No se pudo registrar la devolución");
      }
    } catch (err) {
      console.error("Error confirmando devolución:", err);
      toast.error("Error al procesar la devolución");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] lg:max-w-5xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900 h-[90vh] flex flex-col">
          {/* CABECERA */}
          <div className="flex items-center justify-between bg-slate-900 px-6 py-3.5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white font-black shadow-xs">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black tracking-wide uppercase">
                    DEVOLUCIÓN DE TRAJES & REINTEGRO DE DEPÓSITO
                  </h2>
                  <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-teal-300 border border-teal-500/30">
                    Control de Garantías
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Recepción de prendas alquiladas, inspección física y devolución formal del dinero de depósito al cliente
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* BUSCADOR DE FACTURA */}
          <div className="bg-white border-b border-slate-200 p-4 shrink-0 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ejecutarBusqueda(busqueda)}
                  placeholder="Escribe el N° de Factura / Recibo o Cédula del Cliente..."
                  className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => ejecutarBusqueda(busqueda)}
                disabled={cargando}
                className="flex items-center gap-1.5 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0"
              >
                <Search className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
                <span>Buscar Factura</span>
              </button>

              {detalle && (
                <div className="flex items-center gap-2 ml-auto text-xs">
                  <span className="font-bold text-slate-500">Factura:</span>
                  <span className="font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    #{detalle.factura.NUMEROFACT}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CUERPO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {!detalle ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400 space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 border border-teal-100 text-teal-600">
                  <Shirt className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-black text-sm text-slate-700">Ingresa una Factura para Iniciar la Devolución</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    El sistema verificará las prendas alquiladas, los depósitos dejados en garantía y calculará el monto exacto a reintegrar.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* TARJETA RESUMEN DEL CLIENTE Y FACTURA */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Cliente</span>
                    <h3 className="text-xs font-black text-slate-900 uppercase mt-0.5 truncate">{detalle.clienteNombre}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">CC: {detalle.clienteCedula}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Teléfono & Contacto</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{detalle.clienteTelefono}</p>
                    <p className="text-[10px] text-slate-500 truncate">{detalle.clienteDireccion}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Fechas de Alquiler</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      Salida: <strong className="text-slate-900">{detalle.fechaSalida}</strong>
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      Pactada: <strong className="text-slate-900">{detalle.fechaEntregaPactada}</strong>
                    </p>
                  </div>

                  <div className="bg-teal-50/80 p-2.5 rounded-xl border border-teal-200 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-teal-900 uppercase">Depósito en Garantía</span>
                    <div className="text-base font-black text-teal-900 font-mono mt-0.5">
                      ${detalle.depositoDisponible.toLocaleString("es-CO")}
                    </div>
                    {detalle.totalDepositoYaDevuelto > 0 && (
                      <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                        Ya devuelto: ${detalle.totalDepositoYaDevuelto.toLocaleString("es-CO")}
                      </span>
                    )}
                  </div>
                </div>

                {/* TABLA DE PRENDAS A DEVOLVER */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-100 px-4 py-2.5 border-b border-slate-200">
                    <span className="text-xs font-black uppercase text-slate-800">
                      1. Selecciona las prendas que el cliente está entregando
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Prendas seleccionadas: <strong className="text-teal-900">{itemsSeleccionados.length}</strong> de {items.length}
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">Devolver</th>
                        <th className="p-2.5">Cód</th>
                        <th className="p-2.5">Descripción de la Prenda</th>
                        <th className="p-2.5 text-center">Talla</th>
                        <th className="p-2.5 text-center">Cant</th>
                        <th className="p-2.5 text-right">Depósito</th>
                        <th className="p-2.5 text-center">Estado Actual</th>
                        <th className="p-2.5 text-center">Condición de Recepción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const yaDevuelto = item.estadoActual === "DEVUELTO A TIENDA";

                        return (
                          <tr
                            key={item.id || idx}
                            className={`transition-colors ${
                              yaDevuelto
                                ? "bg-slate-50/70 opacity-60"
                                : item.seleccionadoParaDevolver
                                ? "bg-teal-50/60 font-semibold"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                disabled={yaDevuelto}
                                checked={item.seleccionadoParaDevolver}
                                onChange={() => toggleSeleccionItem(idx)}
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-600 font-bold">{item.codigoBarras || "S/C"}</td>
                            <td className="p-2.5 font-black text-slate-900 uppercase">{item.descripcion}</td>
                            <td className="p-2.5 text-center font-bold text-slate-800">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                                {item.talla}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-black text-slate-900">{item.cantidad}</td>
                            <td className="p-2.5 text-right font-black text-teal-800 font-mono text-xs">
                              ${(item.valorDeposito * item.cantidad).toLocaleString("es-CO")}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                  yaDevuelto
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                              >
                                {item.estadoActual}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <select
                                disabled={yaDevuelto || !item.seleccionadoParaDevolver}
                                value={item.condicionPrenda}
                                onChange={(e) => setCondicionItem(idx, e.target.value as any)}
                                className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="EXCELENTE">✨ Excelente / Impecable</option>
                                <option value="BUENO">👍 Buen Estado Completo</option>
                                <option value="MANCHADO">⚠️ Manchado (Lavandería)</option>
                                <option value="DANADO">❌ Roto / Dañado</option>
                                <option value="INCOMPLETO">❗ Accesorio Faltante</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SECCIÓN DE LIQUIDACIÓN Y REINTEGRO DE DINERO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Deducciones / Penalidades / Mora por Retraso */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800 border-b pb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>2. Ajustes, Retraso & Penalidades</span>
                    </div>

                    {/* Alerta de Retraso de 3 Días & $7.000 / Día */}
                    {infoRetraso?.tieneRetraso ? (
                      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 space-y-2 shadow-xs">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-950">
                            <p className="font-black text-amber-900">
                              ⚠️ RETRASO DETECTADO: {infoRetraso.diasRetraso} día(s) de mora
                            </p>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                              El cliente lleva <strong>{infoRetraso.diasTranscurridos} días</strong> con el traje (límite permitido: <strong>3 días</strong>). Costo: <strong>$7.000 COP / día</strong>.
                              <br />
                              Recargo acumulado: <strong className="text-rose-700 font-mono">${infoRetraso.recargoSugerido.toLocaleString("es-CO")} COP</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200">
                          <span className="text-[10px] font-black uppercase text-amber-900">¿Descontar del depósito?</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDeduccionPenalidad(String(infoRetraso.recargoSugerido));
                              setMotivoDeduccion(`Recargo por ${infoRetraso.diasRetraso} día(s) de retraso ($7.000/día)`);
                              toast.info(`Descuento de $${infoRetraso.recargoSugerido.toLocaleString("es-CO")} aplicado`);
                            }}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[11px] font-black shadow-xs transition-all active:scale-95"
                          >
                            ✓ Sí, Descontar ${infoRetraso.recargoSugerido.toLocaleString("es-CO")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeduccionPenalidad("0");
                              setMotivoDeduccion("");
                              toast.info("Mora condonada (Sin descuento)");
                            }}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-black shadow-xs transition-all active:scale-95"
                          >
                            ✕ Condonar Mora ($0)
                          </button>
                        </div>
                      </div>
                    ) : infoRetraso ? (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Entrega a tiempo (Día {infoRetraso.diasTranscurridos} de 3 permitidos). Sin recargo por mora.</span>
                      </div>
                    ) : null}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Valor de Descuento / Penalidad a deducir del depósito ($)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={deduccionPenalidad}
                        onChange={(e) => setDeduccionPenalidad(e.target.value)}
                        className="h-8.5 w-full rounded-xl border border-rose-300 bg-rose-50/60 px-3 font-mono font-black text-rose-800 focus:bg-white focus:outline-none focus:border-rose-500 shadow-2xs text-sm"
                      />
                    </div>

                    {penalidadNum > 0 && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Motivo del descuento o deducción
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Recargo por días de retraso o falta de accesorio"
                          value={motivoDeduccion}
                          onChange={(e) => setMotivoDeduccion(e.target.value)}
                          className="h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-2xs"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Forma de Reintegro de Dinero al Cliente
                      </label>
                      <select
                        value={formaReintegro}
                        onChange={(e) => setFormaReintegro(e.target.value)}
                        className="h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none shadow-2xs"
                      >
                        <option value="EFECTIVO">💵 EFECTIVO (Salida de Caja)</option>
                        <option value="TRANSFERENCIA">💳 TRANSFERENCIA / NEQUI</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumen Total de Reintegro */}
                  <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-teal-700/50 pb-2">
                        <span className="text-xs font-black uppercase text-teal-300">
                          3. Liquidación de Depósito
                        </span>
                        <span className="text-[10px] text-slate-300 font-semibold">Cajero: {cajeroNombre}</span>
                      </div>

                      <div className="space-y-1.5 py-3 text-xs font-semibold text-slate-200">
                        <div className="flex justify-between">
                          <span>Depósito de prendas devueltas:</span>
                          <span className="font-mono font-bold">${totalDepositoSeleccionado.toLocaleString("es-CO")}</span>
                        </div>
                        {penalidadNum > 0 && (
                          <div className="flex justify-between text-rose-300">
                            <span>(-) Deducciones / Penalidades:</span>
                            <span className="font-mono font-bold">-${penalidadNum.toLocaleString("es-CO")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-teal-700/60 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-teal-200">
                          TOTAL A DEVOLVER AL CLIENTE:
                        </span>
                        <span className="text-2xl font-black font-mono text-emerald-300">
                          ${montoNetoReintegrar.toLocaleString("es-CO")}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={procesando || itemsSeleccionados.length === 0}
                        onClick={handleConfirmarDevolucion}
                        className="mt-4 w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirmar Devolución & Reintegro</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PIE */}
          <div className="flex items-center justify-between bg-slate-100 px-6 py-3 border-t border-slate-200 shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Al confirmar la devolución, las prendas seleccionadas volverán al inventario y se registrará la salida del dinero de depósito.
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 text-xs font-bold uppercase transition-all"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: COMPROBANTE DE DEVOLUCIÓN DE PRENDA Y DEPÓSITO
      ========================================================= */}
      <Dialog open={modalComprobanteOpen} onOpenChange={setModalComprobanteOpen}>
        <DialogContent className="max-w-md bg-white p-6 border border-slate-200 shadow-2xl rounded-2xl">
          {comprobanteActivo && (
            <div className="font-mono text-xs text-slate-900 space-y-2">
              <div className="border-b border-dashed border-slate-400 pb-3 text-center">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                  {empresa?.nombreComercial || "LA CASA DEL DISFRAZ"}
                </h2>
                <p className="text-xs font-semibold text-teal-800">Comprobante de Devolución de Depósito</p>
                <p className="text-[10px] text-slate-500">Recibo Original #{comprobanteActivo.numeroFactura}</p>
                <p className="mt-1.5 font-black text-sm text-slate-900">
                  COMPROBANTE N° {comprobanteActivo.numeroComprobante}
                </p>
                <p className="text-[10px] text-slate-500">
                  Fecha: {comprobanteActivo.fecha} {comprobanteActivo.hora} · Cajero: {comprobanteActivo.cajero}
                </p>
              </div>

              <div className="py-2 text-xs space-y-0.5 border-b border-dashed border-slate-400 font-semibold">
                <p><strong>CLIENTE:</strong> {comprobanteActivo.clienteNombre.toUpperCase()}</p>
                <p><strong>CÉDULA:</strong> {comprobanteActivo.clienteCedula}</p>
                <p><strong>TELÉFONO:</strong> {comprobanteActivo.clienteTelefono}</p>
                <p><strong>FORMA DE PAGO:</strong> {comprobanteActivo.formaPago}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-black pb-1 text-[11px]">
                  <span>PRENDAS RECIBIDAS</span>
                  <span>ESTADO</span>
                </div>
                {comprobanteActivo.itemsDevueltos.map((it, i) => (
                  <div key={i} className="flex justify-between py-0.5 text-xs font-bold">
                    <span>{it.cantidad}x {it.descripcion} ({it.talla})</span>
                    <span className="text-[10px] text-teal-800 uppercase">{it.condicion}</span>
                  </div>
                ))}
              </div>

              <div className="py-2 space-y-1 text-right text-xs font-bold">
                <p>Depósito Original de Prendas: ${comprobanteActivo.depositoOriginal.toLocaleString("es-CO")}</p>
                {comprobanteActivo.deduccionPenalidad > 0 && (
                  <p className="text-rose-700">
                    (-) Deducción / Daño: -${comprobanteActivo.deduccionPenalidad.toLocaleString("es-CO")}
                    {comprobanteActivo.motivoDeduccion && ` (${comprobanteActivo.motivoDeduccion})`}
                  </p>
                )}
                <p className="text-base font-black border-t pt-1.5 text-slate-900">
                  DEPÓSITO ENTREGADO: ${comprobanteActivo.totalReintegrado.toLocaleString("es-CO")}
                </p>
              </div>

              <p className="mt-2 text-center text-[10px] text-slate-500 italic font-semibold">
                Prenda recibida a satisfacción en tienda y fianza reintegrada al cliente.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalComprobanteOpen(false)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 border border-slate-300"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-slate-900 hover:bg-black px-5 py-2 text-xs font-black text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-4 w-4 text-emerald-400" /> Imprimir Comprobante
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
