import React, { useState, useEffect } from "react";
import { User, KeyRound, Monitor, LogIn, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="flex min-h-screen w-full select-none items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl">
        {/* Cabecera con Logo y Slogan Mint */}
        <div className="flex flex-col items-center border-b border-slate-100 bg-white px-6 pt-8 pb-6 text-center">
          <div className="rounded-2xl bg-white p-2">
            <img
              src={logoAsset.url}
              alt="La Casa del Disfraz"
              className="h-24 w-auto object-contain drop-shadow-sm"
            />
          </div>

          {/* Slogan Pill Mint */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-3.5 py-1 text-xs font-bold text-emerald-700 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Para toda ocasión, sin importar tu edad</span>
          </div>

          <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900">
            Punto de Venta y Alquiler
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Ingreso seguro para cajeros y personal autorizado
          </p>

          {/* Badge de Terminal / PC Actual */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-600">
            <Monitor className="h-3.5 w-3.5 text-red-600" />
            <span>Terminal: <strong className="text-slate-900">{terminal.nombreEquipo}</strong></span>
            <span>•</span>
            <span className="text-emerald-700 font-extrabold">{terminal.nombreCaja} ({terminal.prefijo})</span>
          </div>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleIngresar} className="p-6 space-y-4 bg-white">
          {/* Campo Usuario / Código */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-red-600" /> Usuario o Código de Acceso
            </label>
            <input
              type="text"
              required
              autoFocus
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value)}
              placeholder="Ej. ADMIN, SUPERADMIN o CAJA1"
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 text-xs font-black text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase placeholder:text-slate-400 shadow-xs transition-all"
            />
          </div>

          {/* Contraseña / PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Contraseña / PIN
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
            />
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            disabled={cargando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 font-black uppercase tracking-wider text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 active:scale-98 transition-all disabled:opacity-50 mt-5"
          >
            <LogIn className="h-4 w-4" />
            {cargando ? "Validando..." : "INGRESAR AL SISTEMA"}
          </button>
        </form>

        {/* Pie de seguridad */}
        <div className="border-t border-slate-100 bg-slate-50/80 p-3.5 text-center text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Acceso controlado por Roles (Super Admin, Admin, Cajero)</span>
        </div>
      </div>
    </div>
  );
}
