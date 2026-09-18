import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, Lock, X, KeyRound, Check, Delete } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { validarPinSupervisor } from "@/services/authPosService";
import { toast } from "sonner";

interface PinAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo?: string;
  motivo?: string;
  onAutorizado: (nombreSupervisor?: string) => void;
}

export function PinAdminModal({
  open,
  onOpenChange,
  titulo = "AUTORIZACIÓN DE ADMINISTRADOR",
  motivo = "Esta acción requiere la clave o PIN de un Supervisor o Administrador para continuar.",
  onAutorizado,
}: PinAdminModalProps) {
  const [pin, setPin] = useState("");
  const [validando, setValidando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleValidar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      toast.error("Ingresa el PIN o Contraseña de Administrador");
      inputRef.current?.focus();
      return;
    }

    setValidando(true);
    try {
      const res = await validarPinSupervisor(pin);
      if (res.ok) {
        toast.success(`✓ Acción autorizada por: ${res.nombreAdmin || "ADMINISTRADOR"}`);
        onOpenChange(false);
        onAutorizado(res.nombreAdmin);
      } else {
        toast.error("❌ PIN o Contraseña de Administrador incorrecta", {
          description: "Verifica las credenciales del supervisor e inténtalo de nuevo.",
        });
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      toast.error("Error al validar autorización");
    } finally {
      setValidando(false);
    }
  };

  const agregarDigito = (d: string) => {
    setPin((prev) => prev + d);
  };

  const borrarUltimo = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md bg-white p-0 border border-slate-200/90 shadow-2xl overflow-hidden rounded-2xl">
        {/* Cabecera de Seguridad */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3.5 text-white select-none">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              {titulo}
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleValidar} className="p-5 space-y-4 bg-slate-50/50">
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-xs font-medium text-amber-950 flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p>{motivo}</p>
          </div>

          {/* Campo de Entrada de PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-700 block text-center">
              Ingresa PIN o Clave de Administrador
            </label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="password"
                maxLength={20}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-center font-mono text-2xl font-black text-slate-900 tracking-widest placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-xs"
              />
              {pin.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPin("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Keypad Numérico Táctil Rápido */}
          <div className="grid grid-cols-3 gap-2 pt-1 select-none">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => agregarDigito(num)}
                className="h-11 rounded-xl bg-white border border-slate-200 font-mono text-base font-black text-slate-800 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={borrarUltimo}
              className="h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 active:scale-95 transition-all"
              title="Borrar dígito"
            >
              <Delete className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => agregarDigito("0")}
              className="h-11 rounded-xl bg-white border border-slate-200 font-mono text-base font-black text-slate-800 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleValidar()}
              disabled={validando}
              className="h-11 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1 shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
              title="Confirmar autorización"
            >
              <Check className="h-4 w-4" /> OK
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={validando}
              className="h-9 flex-1 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase shadow-xs transition-all active:scale-95"
            >
              {validando ? "Validando..." : "Autorizar Acción"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
