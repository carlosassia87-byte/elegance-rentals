import React, { useState, useEffect } from "react";
import { User, KeyRound, Monitor, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { loginPos, type UsuarioPos } from "@/services/authPosService";
import { obtenerTerminalConfig, type TerminalConfig } from "@/services/empresaCajaService";
import logoAsset from "@/assets/logo.asset.json";

interface PosLoginProps {
  onLoginSuccess: (usuario: UsuarioPos) => void;
}

export function PosLogin({ onLoginSuccess }: PosLoginProps) {
  const [usuarioInput, setUsuarioInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [terminal, setTerminal] = useState<TerminalConfig>(obtenerTerminalConfig());

  useEffect(() => {
    setTerminal(obtenerTerminalConfig());
  }, []);

  const handleIngresar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioInput.trim()) {
      toast.error("Ingresa tu usuario o código de acceso");
      return;
    }
    if (!passwordInput.trim()) {
      toast.error("Ingresa tu contraseña o PIN de seguridad");
      return;
    }

    setCargando(true);
    try {
      const user = await loginPos(usuarioInput, passwordInput);
      if (user) {
        toast.success(`¡Bienvenido, ${user.nombre} (${user.rol})!`);
        onLoginSuccess(user);
      } else {
        toast.error("Credenciales incorrectas. Verifica tu usuario y contraseña.");
      }
    } catch (err) {
      toast.error("Error al autenticar usuario");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full select-none items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-[#1A0B10] p-4 font-sans text-slate-100">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-[#161922] shadow-2xl backdrop-blur-md">
        {/* Cabecera con Logo */}
        <div className="flex flex-col items-center border-b border-slate-800 bg-[#12141C] p-6 text-center">
          <div className="rounded-2xl bg-white p-3 shadow-md ring-2 ring-red-600/30">
            <img
              src={logoAsset.url}
              alt="La Casa del Disfraz"
              className="h-20 w-auto object-contain drop-shadow"
            />
          </div>

          <h1 className="mt-4 text-lg font-black uppercase tracking-wider text-white">
            PUNTO DE VENTA Y ALQUILER
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Ingreso Seguro de Cajeros y Personal Autorizado
          </p>

          {/* Badge de Terminal / PC Actual */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-bold text-slate-300">
            <Monitor className="h-3.5 w-3.5 text-red-500" />
            <span>Terminal: <strong className="text-white">{terminal.nombreEquipo}</strong></span>
            <span>•</span>
            <span className="text-amber-400">{terminal.nombreCaja} ({terminal.prefijo})</span>
          </div>
        </div>

        {/* Formulario de Login Limpio */}
        <form onSubmit={handleIngresar} className="p-6 space-y-4">
          {/* Campo Usuario / Código */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-red-500" /> Usuario o Código de Acceso
            </label>
            <input
              type="text"
              required
              autoFocus
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value)}
              placeholder="Ej. ADMIN, SUPERADMIN o CAJA1"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-black text-white focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 uppercase placeholder:text-slate-500"
            />
          </div>

          {/* Contraseña / PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Contraseña / PIN
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-bold text-white focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            />
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            disabled={cargando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/30 hover:from-red-700 hover:to-red-800 active:scale-98 transition-all disabled:opacity-50 mt-4"
          >
            <LogIn className="h-4 w-4" />
            {cargando ? "Validando Credenciales..." : "INGRESAR AL SISTEMA"}
          </button>
        </form>

        {/* Pie de seguridad */}
        <div className="border-t border-slate-800/80 bg-[#12141C] p-3 text-center text-[10px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Control de Acceso por Roles (Super Admin, Admin, Cajero)
        </div>
      </div>
    </div>
  );
}
