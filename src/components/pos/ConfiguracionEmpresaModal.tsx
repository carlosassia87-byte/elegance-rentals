import React, { useState, useEffect } from "react";
import { Building2, Save, X, Phone, MapPin, Mail, FileText, DollarSign, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  obtenerConfiguracionEmpresa,
  guardarConfiguracionEmpresa,
  type EmpresaConfig,
  EMPRESA_DEFAULT,
} from "@/services/empresaCajaService";

interface ConfiguracionEmpresaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardadoExitoso?: (cfg: EmpresaConfig) => void;
}

export function ConfiguracionEmpresaModal({
  open,
  onOpenChange,
  onGuardadoExitoso,
}: ConfiguracionEmpresaModalProps) {
  const [form, setForm] = useState<EmpresaConfig>(EMPRESA_DEFAULT);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      obtenerConfiguracionEmpresa().then((cfg) => setForm(cfg));
    }
  }, [open]);

  const handleChange = (campo: keyof EmpresaConfig, valor: any) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreComercial.trim()) {
      toast.error("El nombre comercial es obligatorio");
      return;
    }

    setGuardando(true);
    try {
      const ok = await guardarConfiguracionEmpresa(form);
      if (ok) {
        toast.success("Configuración de empresa guardada con éxito");
        onGuardadoExitoso?.(form);
        onOpenChange(false);
      } else {
        toast.error("Error al guardar en el servidor. Se guardó localmente.");
      }
    } catch (err) {
      toast.error("Ocurrió un error inesperado al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">
                CONFIGURACIÓN DE EMPRESA Y FACTURACIÓN
              </h2>
              <p className="text-[11px] text-slate-300">
                Datos fiscales, razón social, contactos y pie de recibo de alquiler
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

        <form onSubmit={handleGuardar} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* BLOQUE 1: IDENTIFICACIÓN PRINCIPAL */}
          <div className="rounded-md border border-slate-300 bg-white p-3.5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
              <FileText className="h-4 w-4 text-blue-600" /> Identificación Comercial y Fiscal
            </h3>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-6">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Nombre Comercial / Marca</label>
                <input
                  type="text"
                  required
                  value={form.nombreComercial}
                  onChange={(e) => handleChange("nombreComercial", e.target.value)}
                  placeholder="Ej. LA CASA DEL DISFRAZ"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 uppercase"
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Razón Social Legal</label>
                <input
                  type="text"
                  value={form.razonSocial}
                  onChange={(e) => handleChange("razonSocial", e.target.value)}
                  placeholder="Ej. LA CASA DEL DISFRAZ S.A.S."
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 uppercase"
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="text-[11px] font-bold text-slate-700 uppercase">NIT / Cédula Fiscal</label>
                <input
                  type="text"
                  value={form.nit}
                  onChange={(e) => handleChange("nit", e.target.value)}
                  placeholder="Ej. 900.123.456-7"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 uppercase"
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Régimen Tributario / Estado</label>
                <input
                  type="text"
                  value={form.regimen}
                  onChange={(e) => handleChange("regimen", e.target.value)}
                  placeholder="Ej. Régimen Simplificado / No Responsable de IVA"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* BLOQUE 2: UBICACIÓN Y CONTACTO */}
          <div className="rounded-md border border-slate-300 bg-white p-3.5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" /> Ubicación y Canales de Contacto
            </h3>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-7">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Dirección Principal</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                  placeholder="Ej. Calle Principal # 10 - 25"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-12 md:col-span-5">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Ciudad / Municipio</label>
                <input
                  type="text"
                  value={form.ciudad}
                  onChange={(e) => handleChange("ciudad", e.target.value)}
                  placeholder="Ej. Cali, Colombia"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 uppercase"
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-500" /> Teléfono / WhatsApp 1
                </label>
                <input
                  type="text"
                  value={form.telefono1}
                  onChange={(e) => handleChange("telefono1", e.target.value)}
                  placeholder="Ej. 315 123 4567"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-500" /> Teléfono 2 (Opcional)
                </label>
                <input
                  type="text"
                  value={form.telefono2}
                  onChange={(e) => handleChange("telefono2", e.target.value)}
                  placeholder="Ej. 320 765 4321"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-500" /> Correo Electrónico
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* BLOQUE 3: POLÍTICAS DE ALQUILER Y TEXTO FACTURA */}
          <div className="rounded-md border border-slate-300 bg-white p-3.5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
              <DollarSign className="h-4 w-4 text-amber-600" /> Parámetros del Alquiler y Pie de Recibo
            </h3>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Días de Alquiler por Defecto</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.diasAlquilerDefault}
                  onChange={(e) => handleChange("diasAlquilerDefault", Number(e.target.value) || 3)}
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Moneda</label>
                <input
                  type="text"
                  value={form.moneda}
                  onChange={(e) => handleChange("moneda", e.target.value)}
                  placeholder="COP / USD"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 uppercase"
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Símbolo</label>
                <input
                  type="text"
                  value={form.simboloMoneda}
                  onChange={(e) => handleChange("simboloMoneda", e.target.value)}
                  placeholder="$"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-12">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Mensaje de Agradecimiento (Pie de Recibo)</label>
                <input
                  type="text"
                  value={form.mensajePieFactura}
                  onChange={(e) => handleChange("mensajePieFactura", e.target.value)}
                  placeholder="Mensaje al final de cada recibo impreso"
                  className="mt-1 h-8 w-full rounded border border-slate-400 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-12">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Términos y Condiciones del Alquiler</label>
                <textarea
                  rows={2}
                  value={form.terminosAlquiler}
                  onChange={(e) => handleChange("terminosAlquiler", e.target.value)}
                  placeholder="Términos legales, garantías, penalidades por retraso o daño de prenda..."
                  className="mt-1 w-full rounded border border-slate-400 bg-slate-50 p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-300">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded border border-slate-400 bg-white px-4 text-xs font-black uppercase text-slate-700 hover:bg-slate-100 shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 h-9 rounded bg-[#B80036] px-6 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-[#96002C] active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
