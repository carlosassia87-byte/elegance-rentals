import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  User,
  KeyRound,
  CheckSquare,
  Square,
  Shield,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listarUsuariosPos,
  guardarUsuarioPos,
  eliminarUsuarioPos,
  obtenerPermisosPorDefecto,
  type UsuarioPos,
  type RolUsuario,
  type PermisosUsuario,
} from "@/services/authPosService";

interface GestionUsuariosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuarioActual?: UsuarioPos | null;
}

export function GestionUsuariosModal({
  open,
  onOpenChange,
  usuarioActual,
}: GestionUsuariosModalProps) {
  const [usuarios, setUsuarios] = useState<UsuarioPos[]>([]);
  const [usuarioEditando, setUsuarioEditando] = useState<Partial<UsuarioPos> | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = async () => {
    const list = await listarUsuariosPos();
    setUsuarios(list);
  };

  useEffect(() => {
    if (open) {
      cargarUsuarios();
    }
  }, [open]);

  const handleCrearNuevo = () => {
    const defaultRol: RolUsuario = "CAJERO";
    setUsuarioEditando({
      id: 0,
      nombre: "",
      apellido: "",
      codigoUsuario: "",
      password: "123",
      rol: defaultRol,
      accesoMenu: true,
      permisos: obtenerPermisosPorDefecto(defaultRol),
    });
  };

  const handleCambiarRol = (nuevoRol: RolUsuario) => {
    if (!usuarioEditando) return;
    setUsuarioEditando((prev) => ({
      ...prev,
      rol: nuevoRol,
      permisos: obtenerPermisosPorDefecto(nuevoRol),
    }));
  };

  const handleTogglePermiso = (campo: keyof PermisosUsuario) => {
    if (!usuarioEditando || !usuarioEditando.permisos) return;
    setUsuarioEditando((prev) => ({
      ...prev,
      permisos: {
        ...prev!.permisos!,
        [campo]: !prev!.permisos![campo],
      },
    }));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando || !usuarioEditando.nombre?.trim()) {
      toast.error("El nombre del usuario es obligatorio");
      return;
    }
    if (!usuarioEditando.codigoUsuario?.trim()) {
      toast.error("El código / usuario es obligatorio");
      return;
    }

    setGuardando(true);
    try {
      await guardarUsuarioPos(usuarioEditando);
      toast.success("Usuario y permisos guardados con éxito");
      setUsuarioEditando(null);
      await cargarUsuarios();
    } catch (err) {
      toast.error("Error al guardar usuario");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (usuarioActual && id === usuarioActual.id) {
      toast.error("No puedes eliminar tu propio usuario en sesión activa");
      return;
    }
    if (usuarios.length <= 1) {
      toast.error("Debe existir al menos un usuario en el sistema");
      return;
    }
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      await eliminarUsuarioPos(id);
      toast.info("Usuario eliminado");
      await cargarUsuarios();
    }
  };

  const getRolBadgeClass = (rol: RolUsuario) => {
    switch (rol) {
      case "SUPER ADMIN":
        return "bg-purple-600/20 text-purple-700 border-purple-300 font-black";
      case "ADMIN":
        return "bg-blue-600/20 text-blue-700 border-blue-300 font-black";
      case "CAJERO":
      default:
        return "bg-emerald-600/20 text-emerald-700 border-emerald-300 font-bold";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">
                GESTIÓN DE USUARIOS, ROLES Y PERMISOS
              </h2>
              <p className="text-[11px] text-slate-300">
                Define quién es Super Admin, Admin o Cajero y qué módulos puede ver y operar
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

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* BOTÓN CREAR NUEVO USUARIO */}
          {!usuarioEditando && (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Usuarios Registrados ({usuarios.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Personal con acceso al sistema y sus roles de autorización
                </p>
              </div>

              <button
                type="button"
                onClick={handleCrearNuevo}
                className="flex items-center gap-1.5 h-8 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" /> NUEVO USUARIO
              </button>
            </div>
          )}

          {/* FORMULARIO DE CREAR / EDITAR USUARIO */}
          {usuarioEditando && (
            <form
              onSubmit={handleGuardar}
              className="rounded-2xl border border-emerald-300 bg-white p-4 shadow-sm space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-black uppercase text-emerald-700 flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {usuarioEditando.id ? `Editar Usuario: ${usuarioEditando.nombre}` : "Crear Nuevo Usuario"}
                </h4>
                <button
                  type="button"
                  onClick={() => setUsuarioEditando(null)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              {/* CAMPOS PRINCIPALES */}
              <div className="grid grid-cols-12 gap-3 text-xs">
                <div className="col-span-12 md:col-span-4">
                  <label className="font-bold text-slate-700 uppercase">Nombre</label>
                  <input
                    type="text"
                    required
                    value={usuarioEditando.nombre || ""}
                    onChange={(e) =>
                      setUsuarioEditando((p) => ({ ...p, nombre: e.target.value }))
                    }
                    placeholder="Ej. CARLOS"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 font-bold text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="font-bold text-slate-700 uppercase">Apellido (Opcional)</label>
                  <input
                    type="text"
                    value={usuarioEditando.apellido || ""}
                    onChange={(e) =>
                      setUsuarioEditando((p) => ({ ...p, apellido: e.target.value }))
                    }
                    placeholder="Ej. PÉREZ"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 font-bold text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="font-bold text-slate-700 uppercase">Código / Usuario para Ingresar</label>
                  <input
                    type="text"
                    required
                    value={usuarioEditando.codigoUsuario || ""}
                    onChange={(e) =>
                      setUsuarioEditando((p) => ({ ...p, codigoUsuario: e.target.value }))
                    }
                    placeholder="Ej. CAJA1, ADMIN, CARLOS"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 font-black text-emerald-700 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="font-bold text-slate-700 uppercase">Contraseña / PIN</label>
                  <input
                    type="text"
                    required
                    value={usuarioEditando.password || ""}
                    onChange={(e) =>
                      setUsuarioEditando((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="PIN o contraseña"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="font-bold text-slate-700 uppercase">Rol Asignado</label>
                  <select
                    value={usuarioEditando.rol || "CAJERO"}
                    onChange={(e) => handleCambiarRol(e.target.value as RolUsuario)}
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-2 font-black text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="SUPER ADMIN">SUPER ADMIN (Acceso Total)</option>
                    <option value="ADMIN">ADMINISTRADOR (Gestión & Ventas)</option>
                    <option value="CAJERO">CAJERO (Atención & Ventas)</option>
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4 flex items-end">
                  <div className="rounded-xl bg-slate-100/80 p-2 border border-slate-200 w-full text-[11px] font-semibold text-slate-600">
                    Rol: <strong className="text-emerald-700">{usuarioEditando.rol}</strong>
                  </div>
                </div>
              </div>

              {/* MATRIZ DE PERMISOS GRANULARES */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <h5 className="text-[11px] font-black uppercase text-slate-800 tracking-wide border-b border-slate-200 pb-1.5">
                  Permisos de Visualización y Operación (¿Qué ve y qué no ve este usuario?)
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: "puntoDeVenta", label: "Punto de Venta / Facturación" },
                    { key: "catalogoArticulos", label: "Ver Archivo de Artículos" },
                    { key: "nuevoArticulo", label: "Crear Nuevos Vestidos/Trajes" },
                    { key: "modificarArticulo", label: "Modificar Precios/Stock" },
                    { key: "eliminarArticulo", label: "Eliminar Artículos" },
                    { key: "directorioClientes", label: "Directorio de Clientes" },
                    { key: "crearModificarClientes", label: "Registrar/Editar Clientes" },
                    { key: "apartadosAbonos", label: "Apartados y Abonos" },
                    { key: "devolucionVestidos", label: "Devolución / Entrada Vestido" },
                    { key: "movimientosTrajes", label: "Control de Movimientos y Trajes" },
                    { key: "gastosSalidas", label: "Registrar Gastos de Caja" },
                    { key: "reimpresion", label: "Reimprimir Recibos" },
                    { key: "cierreCaja", label: "Arqueo y Cierre de Caja" },
                    { key: "configEmpresa", label: "Configuración de Empresa" },
                    { key: "configCajas", label: "Multi-Cajas y Asignar PC" },
                    { key: "configResoluciones", label: "Resoluciones de Pantalla" },
                    { key: "gestionUsuarios", label: "Gestión de Usuarios y Roles" },
                    { key: "hacerDescuentos", label: "Autorizar Descuentos" },
                  ].map((p) => {
                    const activo = !!usuarioEditando.permisos?.[p.key as keyof PermisosUsuario];
                    return (
                      <label
                        key={p.key}
                        onClick={() => handleTogglePermiso(p.key as keyof PermisosUsuario)}
                        className={`flex items-center gap-2 rounded-xl border p-2 cursor-pointer transition-all select-none ${
                          activo
                            ? "bg-white border-emerald-500 font-bold text-slate-900 shadow-xs ring-1 ring-emerald-500/20"
                            : "bg-slate-100/70 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {activo ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="text-[11px] leading-tight">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUsuarioEditando(null)}
                  className="h-8 rounded-xl border border-slate-300 bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-1.5 h-8 rounded-xl bg-emerald-600 px-5 text-xs font-black uppercase text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-95"
                >
                  <Save className="h-3.5 w-3.5" />
                  {guardando ? "Guardando..." : "Guardar Usuario y Permisos"}
                </button>
              </div>
            </form>
          )}

          {/* TABLA DE USUARIOS */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                  <th className="p-3">ID</th>
                  <th className="p-3">Usuario / Código</th>
                  <th className="p-3">Nombre Completo</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3 text-center">Permisos Activos</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => {
                  const numPermisos = Object.values(u.permisos || {}).filter(Boolean).length;
                  const esActual = usuarioActual?.id === u.id;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 ${esActual ? "bg-emerald-50/40" : ""}`}>
                      <td className="p-3 font-bold text-slate-500">#{u.id}</td>
                      <td className="p-3 font-black text-emerald-700 uppercase">
                        {u.codigoUsuario}
                        {esActual && (
                          <span className="ml-1.5 text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900 uppercase">
                        {u.nombre} {u.apellido}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] ${getRolBadgeClass(u.rol)}`}>
                          <Shield className="h-3 w-3" /> {u.rol}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {numPermisos} / 17 módulos
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setUsuarioEditando(u)}
                            title="Editar Usuario y Permisos"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(u.id)}
                            disabled={esActual}
                            title={esActual ? "No puedes eliminar tu usuario activo" : "Eliminar Usuario"}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between bg-slate-50 px-5 py-3.5 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-600">
            Sesión iniciada como: <strong className="text-slate-900">{usuarioActual?.nombre || "CAJERO"}</strong> ({usuarioActual?.rol || "CAJERO"})
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-5 text-xs font-bold uppercase shadow-2xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
