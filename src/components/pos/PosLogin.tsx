import React, { useState, useEffect } from "react";
import { Lock, User, KeyRound, Monitor, Sparkles, LogIn, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { loginPos, listarUsuariosPos, type UsuarioPos } from "@/services/authPosService";
import { obtenerTerminalConfig, type TerminalConfig } from "@/services/empresaCajaService";
import logoAsset from "@/assets/logo.asset.json";

interface PosLoginProps {
  onLoginSuccess: (usuario: UsuarioPos) => void;
}

export function PosLogin({ onLoginSuccess }: PosLoginProps) {
  const [usuarios, setUsuarios] = useState<UsuarioPos[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [terminal, setTerminal] = useState<TerminalConfig>(obtenerTerminalConfig());

  useEffect(() => {
    listarUsuariosPos().then((list) => {
      setUsuarios(list);
      if (list.length > 0 && list[0]) {
        setUsuarioSeleccionado(list[0].nombre);
      }
    });
    setTerminal(obtenerTerminalConfig());
  }, []);

  const handleIngresar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSeleccionado.trim()) {
      toast.error("Selecciona o escribe el nombre del cajero");
      return;
    }

    setCargando(true);
    try {
      const user = await loginPos(usuarioSeleccionado, password);
      if (user) {
        toast.success(`¡Bienvenido al sistema, ${user.nombre}!`);
        onLoginSuccess(user);
      } else {
        toast.error("Contraseña incorrecta o usuario no autorizado");
      }
    } catch (err) {
      toast.error("Error al iniciar sesión en el POS");
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
            Ingreso de Cajero y Control de Turnos
          </p>

          {/* Badge de Terminal / PC Actual */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-bold text-slate-300">
            <Monitor className="h-3.5 w-3.5 text-red-500" />
            <span>Terminal: <strong className="text-white">{terminal.nombreEquipo}</strong></span>
            <span>•</span>
            <span className="text-amber-400">{terminal.nombreCaja} ({terminal.prefijo})</span>
          </div>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleIngresar} className="p-6 space-y-4">
          {/* Selector de Usuario / Cajero */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-red-500" /> Cajero / Usuario
            </label>
            <div className="relative">
              <select
                value={usuarioSeleccionado}
                onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-black text-white focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 uppercase"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.nombre}>
                    {u.nombre} {u.apellido} — ({u.rol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de Acceso Rápido */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {usuarios.slice(0, 3).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUsuarioSeleccionado(u.nombre)}
                className={`h-8 rounded border px-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  usuarioSeleccionado === u.nombre
                    ? "border-red-600 bg-red-600/20 text-red-400 font-bold"
                    : "border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {u.nombre}
              </button>
            ))}
          </div>

          {/* Contraseña / PIN (Opcional) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Contraseña / PIN
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa PIN (opcional)"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-bold text-white focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            />
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            disabled={cargando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/30 hover:from-red-700 hover:to-red-800 active:scale-98 transition-all disabled:opacity-50 mt-2"
          >
            <LogIn className="h-4 w-4" />
            {cargando ? "Iniciando Turno..." : "INICIAR TURNO / INGRESAR"}
          </button>
        </form>

        {/* Pie con información de seguridad */}
        <div className="border-t border-slate-800/80 bg-[#12141C] p-3 text-center text-[10px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Sistema Protegido • Modo Local & Sincronización en Nube
        </div>
      </div>
    </div>
  );
}
