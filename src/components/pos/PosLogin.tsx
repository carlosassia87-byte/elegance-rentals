import React, { useState, useEffect } from "react";
import { User, KeyRound, Monitor, LogIn, ShieldCheck, Sparkles, Settings, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { loginPos, type UsuarioPos } from "@/services/authPosService";
import {
  obtenerTerminalConfig,
  guardarTerminalConfig,
  listarCajas,
  type TerminalConfig,
  type CajaDetalle,
} from "@/services/empresaCajaService";
import logoAsset from "@/assets/logo.asset.json";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PosLoginProps {
  onLoginSuccess: (usuario: UsuarioPos) => void;
}

export function PosLogin({ onLoginSuccess }: PosLoginProps) {
  const [usuarioInput, setUsuarioInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [terminal, setTerminal] = useState<TerminalConfig>(obtenerTerminalConfig());
  const [cajasDisponibles, setCajasDisponibles] = useState<CajaDetalle[]>([]);
  const [modalConfigCaja, setModalConfigCaja] = useState(false);
  const [tempNombreEquipo, setTempNombreEquipo] = useState(terminal.nombreEquipo);

  useEffect(() => {
    setTerminal(obtenerTerminalConfig());
    listarCajas().then(setCajasDisponibles);
  }, []);

  const handleSeleccionarCaja = (caja: CajaDetalle) => {
    const nuevaCfg: TerminalConfig = {
      ...terminal,
      idCajaAsignada: caja.IDCAJAS,
      nombreCaja: caja.NOMBRECAJA,
      prefijo: caja.PREFIJO || "G",
      nombreEquipo: tempNombreEquipo || terminal.nombreEquipo,
    };
    guardarTerminalConfig(nuevaCfg);
    setTerminal(nuevaCfg);
    setModalConfigCaja(false);
    toast.success(`Este PC fue asignado a: ${caja.NOMBRECAJA} (Prefijo: ${caja.PREFIJO})`);
  };

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

          {/* Badge de Terminal / PC Actual con botón para cambiar de caja */}
          <button
            type="button"
            onClick={() => {
              setTempNombreEquipo(terminal.nombreEquipo);
              setModalConfigCaja(true);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs transition-all cursor-pointer group"
            title="Haz clic aquí para asignar qué Caja y Nombre tiene este computador"
          >
            <Monitor className="h-3.5 w-3.5 text-red-600 group-hover:scale-110 transition-transform" />
            <span>Terminal: <strong className="text-slate-900">{terminal.nombreEquipo}</strong></span>
            <span>•</span>
            <span className="text-emerald-700 font-extrabold">{terminal.nombreCaja} ({terminal.prefijo})</span>
            <span className="text-[10px] text-slate-400 font-normal underline ml-1">Cambiar</span>
          </button>
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Contraseña / PIN
              </label>
              <span className="text-[10px] text-emerald-600 font-bold">Por defecto: 123</span>
            </div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="123 (opcional)"
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            disabled={cargando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 font-black uppercase tracking-wider text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 active:scale-98 transition-all disabled:opacity-50 mt-5 cursor-pointer"
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

      {/* MODAL DE SELECCIÓN DE CAJA PARA ESTE COMPUTADOR */}
      <Dialog open={modalConfigCaja} onOpenChange={setModalConfigCaja}>
        <DialogContent className="max-w-md bg-white p-6 border border-slate-200 shadow-2xl rounded-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Monitor className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase">Asignar Caja a este Computador</h3>
              <p className="text-[11px] text-slate-500">Selecciona qué puesto de trabajo o caja física es este equipo</p>
            </div>
          </div>

          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase block">Nombre de este PC / Dispositivo:</label>
              <input
                type="text"
                value={tempNombreEquipo}
                onChange={(e) => setTempNombreEquipo(e.target.value)}
                placeholder="Ej. PC-CAJA-02 o MOSTRADOR-ENTRADA"
                className="h-9 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-900 uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase block">Selecciona la Caja:</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {cajasDisponibles.map((caja) => {
                  const esActual = terminal.idCajaAsignada === caja.IDCAJAS || terminal.nombreCaja === caja.NOMBRECAJA;
                  return (
                    <button
                      key={caja.IDCAJAS}
                      type="button"
                      onClick={() => handleSeleccionarCaja(caja)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        esActual
                          ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div>
                        <div className="font-black text-xs uppercase flex items-center gap-2">
                          <span>{caja.NOMBRECAJA}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                            Prefijo: {caja.PREFIJO || "G"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {caja.DESCRIPCION_UBICACION || `Puesto #${caja.IDCAJAS}`}
                        </div>
                      </div>
                      {esActual && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
