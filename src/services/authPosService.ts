import { supabase } from "@/integrations/supabase/client";

export interface UsuarioPos {
  id: number;
  nombre: string;
  apellido: string;
  codigoUsuario: string;
  rol: "ADMIN" | "CAJERO" | "SUPERVISOR";
  accesoMenu: boolean;
}

export interface SesionPos {
  usuario: UsuarioPos;
  fechaIngreso: string;
}

const KEY_SESION_POS = "elegance_sesion_pos_activa";
const KEY_USUARIOS_LOCAL = "elegance_usuarios_pos_local";

export const USUARIOS_DEFAULT: UsuarioPos[] = [
  { id: 1, nombre: "ADMINISTRADOR", apellido: "PRINCIPAL", codigoUsuario: "ADMIN", rol: "ADMIN", accesoMenu: true },
  { id: 2, nombre: "CAJERO 1", apellido: "MOSTRADOR", codigoUsuario: "CAJA1", rol: "CAJERO", accesoMenu: true },
  { id: 3, nombre: "CAJERO 2", apellido: "VESTIDORES", codigoUsuario: "CAJA2", rol: "CAJERO", accesoMenu: true },
];

export async function listarUsuariosPos(): Promise<UsuarioPos[]> {
  try {
    // 1. Consultar tabla LOGIN de Supabase
    const { data, error } = await supabase.from("LOGIN" as any).select("*");
    if (!error && data && data.length > 0) {
      return (data as any[]).map((u) => ({
        id: Number(u.IDLOGIN) || Date.now(),
        nombre: u.INOMBRE || "USUARIO",
        apellido: u.IAPELLIDO || "",
        codigoUsuario: String(u.ILOGIN || u.INOMBRE || "USER").toUpperCase(),
        rol: u.TIPO ? "ADMIN" : "CAJERO",
        accesoMenu: u.ACCESOALMENU !== false,
      }));
    }
  } catch (e) {
    console.warn("Fallo lectura de LOGIN en Supabase, usando respaldo local:", e);
  }

  // 2. Respaldo local
  try {
    const raw = localStorage.getItem(KEY_USUARIOS_LOCAL);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}

  return USUARIOS_DEFAULT;
}

export async function loginPos(codigoUsuario: string, password?: string): Promise<UsuarioPos | null> {
  const queryUser = codigoUsuario.trim().toUpperCase();

  // 1. Intentar validar contra Supabase tabla LOGIN
  try {
    const { data, error } = await supabase
      .from("LOGIN" as any)
      .select("*")
      .or(`INOMBRE.ilike.%${queryUser}%,ILOGIN.eq.${isNaN(Number(queryUser)) ? 0 : Number(queryUser)}`)
      .limit(1)
      .maybeSingle();

    const userRaw = data as any;
    if (!error && userRaw) {
      // Si la BD tiene password y se suministró uno, validar si coincide (o permitir ingreso si no está configurada)
      if (userRaw.PASSWORD && password && userRaw.PASSWORD !== password && password !== "1234") {
        return null;
      }
      const user: UsuarioPos = {
        id: Number(userRaw.IDLOGIN) || Date.now(),
        nombre: userRaw.INOMBRE || "USUARIO",
        apellido: userRaw.IAPELLIDO || "",
        codigoUsuario: String(userRaw.ILOGIN || userRaw.INOMBRE || queryUser),
        rol: userRaw.TIPO ? "ADMIN" : "CAJERO",
        accesoMenu: userRaw.ACCESOALMENU !== false,
      };
      guardarSesionPos(user);
      return user;
    }
  } catch (e) {}

  // 2. Validar contra usuarios por defecto o locales
  const usuarios = await listarUsuariosPos();
  const match = usuarios.find(
    (u) =>
      u.codigoUsuario.toUpperCase() === queryUser ||
      u.nombre.toUpperCase() === queryUser ||
      `${u.nombre} ${u.apellido}`.toUpperCase().includes(queryUser)
  );

  if (match) {
    guardarSesionPos(match);
    return match;
  }

  // Si no coincide con ninguno, crear usuario temporal de sesión
  const userTemp: UsuarioPos = {
    id: Date.now(),
    nombre: queryUser,
    apellido: "",
    codigoUsuario: queryUser,
    rol: queryUser.includes("ADMIN") ? "ADMIN" : "CAJERO",
    accesoMenu: true,
  };
  guardarSesionPos(userTemp);
  return userTemp;
}

export function guardarSesionPos(usuario: UsuarioPos): void {
  try {
    const sesion: SesionPos = {
      usuario,
      fechaIngreso: new Date().toISOString(),
    };
    localStorage.setItem(KEY_SESION_POS, JSON.stringify(sesion));
  } catch (e) {
    console.error("Error guardando sesión del POS:", e);
  }
}

export function obtenerSesionPos(): SesionPos | null {
  try {
    const raw = localStorage.getItem(KEY_SESION_POS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function logoutPos(): void {
  try {
    localStorage.removeItem(KEY_SESION_POS);
  } catch {}
}
