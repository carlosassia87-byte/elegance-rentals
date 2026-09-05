import { supabase } from "@/integrations/supabase/client";
import type { Accesorio } from "@/types/database.types";

export const CATEGORIAS_ACCESORIOS = [
  "TODAS",
  "SOMBREROS Y CORONAS",
  "ARMAS Y ESPADAS",
  "MÁSCARAS Y ANTIFAZ",
  "PELUCAS Y TOCADOS",
  "CAPAS, ALAS Y COLAS",
  "JOYERÍA Y ACCESORIOS",
  "GUANTES Y CALZADO",
  "BASTONES Y CETROS",
  "MAQUILLAJE Y PRÓTESIS",
  "OTROS",
];

export const ACCESORIOS_INICIALES: Accesorio[] = [
  {
    IDACCESORIO: 1,
    CODBARRAS: "ACC-1001",
    DESCRIPCION: "SOMBRERO PIRATA TRICORNIO CON PLUMA Y CALAVERA",
    CATEGORIA: "SOMBREROS Y CORONAS",
    TALLA: "U",
    STOCK: 12,
    VALOR: 15000,
    VALORDEPOSITO: 15000,
    NOTAS: "Sombrero de terciopelo negro",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 2,
    CODBARRAS: "ACC-1002",
    DESCRIPCION: "ESPADA PIRATA SABLE METÁLICO CON FUNDA",
    CATEGORIA: "ARMAS Y ESPADAS",
    TALLA: "U",
    STOCK: 10,
    VALOR: 12000,
    VALORDEPOSITO: 15000,
    NOTAS: "Sable curvo para pirata o corsario",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 3,
    CODBARRAS: "ACC-1003",
    DESCRIPCION: "MÁSCARA VENECIANA DORADA CON PLUMAS REALES",
    CATEGORIA: "MÁSCARAS Y ANTIFAZ",
    TALLA: "U",
    STOCK: 8,
    VALOR: 20000,
    VALORDEPOSITO: 20000,
    NOTAS: "Máscara de gala y carnaval",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 4,
    CODBARRAS: "ACC-1004",
    DESCRIPCION: "PELUCA AFRO NEGRA EXTRA VOLUMEN",
    CATEGORIA: "PELUCAS Y TOCADOS",
    TALLA: "U",
    STOCK: 15,
    VALOR: 15000,
    VALORDEPOSITO: 15000,
    NOTAS: "Peluca sintética lavable",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 5,
    CODBARRAS: "ACC-1005",
    DESCRIPCION: "CAPA DE DRÁCULA SATINADA NEGRO Y ROJO",
    CATEGORIA: "CAPAS, ALAS Y COLAS",
    TALLA: "L",
    STOCK: 9,
    VALOR: 25000,
    VALORDEPOSITO: 20000,
    NOTAS: "Capa con cuello rígido alto",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 6,
    CODBARRAS: "ACC-1006",
    DESCRIPCION: "VARITA MÁGICA CON LUZ LED Y SONIDO",
    CATEGORIA: "BASTONES Y CETROS",
    TALLA: "U",
    STOCK: 14,
    VALOR: 10000,
    VALORDEPOSITO: 10000,
    NOTAS: "Incluye pilas",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 7,
    CODBARRAS: "ACC-1007",
    DESCRIPCION: "CORONA REY DORADA CON GEMAS DE COLOR",
    CATEGORIA: "SOMBREROS Y CORONAS",
    TALLA: "U",
    STOCK: 6,
    VALOR: 18000,
    VALORDEPOSITO: 20000,
    NOTAS: "Corona metálica ajustable",
    ACTIVO: true,
  },
  {
    IDACCESORIO: 8,
    CODBARRAS: "ACC-1008",
    DESCRIPCION: "GUANTES LARGOS DE GALA BLANCOS SATINADOS",
    CATEGORIA: "GUANTES Y CALZADO",
    TALLA: "M",
    STOCK: 20,
    VALOR: 8000,
    VALORDEPOSITO: 10000,
    NOTAS: "Guantes hasta el codo",
    ACTIVO: true,
  },
];

const KEY_LOCAL_ACCESORIOS = "elegance_accesorios_catalogo";

export function getLocalAccesorios(): Accesorio[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_ACCESORIOS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ACCESORIOS_INICIALES;
}

export function saveLocalAccesorios(list: Accesorio[]) {
  try {
    localStorage.setItem(KEY_LOCAL_ACCESORIOS, JSON.stringify(list));
  } catch {}
}

// 1. Listar todos los accesorios con filtro de búsqueda y categoría
export async function listarAccesorios(search = "", categoria = "TODAS"): Promise<Accesorio[]> {
  try {
    let query = supabase.from("ACCESORIOS" as any).select("*").order("DESCRIPCION");

    if (categoria && categoria !== "TODAS") {
      query = query.eq("CATEGORIA", categoria);
    }

    if (search.trim()) {
      query = query.or(`DESCRIPCION.ilike.%${search}%,CODBARRAS.ilike.%${search}%,CATEGORIA.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(300);

    if (!error && data && data.length > 0) {
      saveLocalAccesorios(data as unknown as Accesorio[]);
      return data as unknown as Accesorio[];
    }
  } catch (e) {
    console.warn("Fallo lectura de ACCESORIOS en Supabase, usando local:", e);
  }

  // Fallback Local
  let localList = getLocalAccesorios();
  if (categoria && categoria !== "TODAS") {
    localList = localList.filter((a) => a.CATEGORIA?.toUpperCase() === categoria.toUpperCase());
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    localList = localList.filter(
      (a) =>
        a.DESCRIPCION?.toLowerCase().includes(q) ||
        a.CODBARRAS?.toLowerCase().includes(q) ||
        a.CATEGORIA?.toLowerCase().includes(q)
    );
  }
  return localList;
}

// 2. Buscar accesorio por código de barras exacto
export async function buscarAccesorioPorCodigo(codigo: string): Promise<Accesorio | null> {
  const cod = codigo.trim().toUpperCase();
  if (!cod) return null;

  try {
    const { data, error } = await supabase
      .from("ACCESORIOS" as any)
      .select("*")
      .eq("CODBARRAS", cod)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as Accesorio;
    }
  } catch {}

  const localList = getLocalAccesorios();
  return localList.find((a) => a.CODBARRAS?.trim().toUpperCase() === cod) || null;
}

// 3. Guardar o actualizar un accesorio
export async function guardarAccesorio(accesorio: Partial<Accesorio>): Promise<Accesorio | null> {
  try {
    const codBarras = (accesorio.CODBARRAS || (await generarCodigoAccesorio())).trim().toUpperCase();
    const cleanData = {
      CODBARRAS: codBarras,
      DESCRIPCION: (accesorio.DESCRIPCION || "").toUpperCase().trim(),
      CATEGORIA: (accesorio.CATEGORIA || "GENERAL").toUpperCase().trim(),
      TALLA: (accesorio.TALLA || "U").toUpperCase().trim(),
      STOCK: Number(accesorio.STOCK) || 0,
      VALOR: Number(accesorio.VALOR) || 0,
      VALORDEPOSITO: Number(accesorio.VALORDEPOSITO) || 0,
      IDARTICULO_PADRE: accesorio.IDARTICULO_PADRE || null,
      NOTAS: accesorio.NOTAS || "",
      ACTIVO: accesorio.ACTIVO !== undefined ? accesorio.ACTIVO : true,
    };

    let guardado: Accesorio | null = null;

    if (accesorio.IDACCESORIO && accesorio.IDACCESORIO > 0) {
      // Actualizar
      const { data, error } = await supabase
        .from("ACCESORIOS" as any)
        .update(cleanData)
        .eq("IDACCESORIO", accesorio.IDACCESORIO)
        .select()
        .single();

      if (!error && data) {
        guardado = data as unknown as Accesorio;
      }
    } else {
      // Insertar nuevo
      const { data, error } = await supabase
        .from("ACCESORIOS" as any)
        .insert(cleanData)
        .select()
        .single();

      if (!error && data) {
        guardado = data as unknown as Accesorio;
      }
    }

    // Actualizar local
    const localList = getLocalAccesorios();
    if (guardado) {
      const idx = localList.findIndex((a) => a.IDACCESORIO === guardado!.IDACCESORIO || a.CODBARRAS === guardado!.CODBARRAS);
      if (idx >= 0) {
        localList[idx] = guardado;
      } else {
        localList.unshift(guardado);
      }
    } else {
      const localItem: Accesorio = {
        ...cleanData,
        IDACCESORIO: accesorio.IDACCESORIO || Date.now(),
      };
      const idx = localList.findIndex((a) => a.CODBARRAS === localItem.CODBARRAS);
      if (idx >= 0) {
        localList[idx] = localItem;
      } else {
        localList.unshift(localItem);
      }
      guardado = localItem;
    }
    saveLocalAccesorios(localList);

    return guardado;
  } catch (err) {
    console.error("Error guardando accesorio:", err);
    return null;
  }
}

// 4. Eliminar accesorio
export async function eliminarAccesorio(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("ACCESORIOS" as any).delete().eq("IDACCESORIO", id);
    if (!error) {
      const localList = getLocalAccesorios().filter((a) => a.IDACCESORIO !== id);
      saveLocalAccesorios(localList);
      return true;
    }
  } catch {}

  const localList = getLocalAccesorios().filter((a) => a.IDACCESORIO !== id);
  saveLocalAccesorios(localList);
  return true;
}

// 5. Generar código de barras sugerido para accesorios
export async function generarCodigoAccesorio(): Promise<string> {
  try {
    const lista = await listarAccesorios();
    const count = lista.length + 1;
    return `ACC-${String(count).padStart(4, "0")}`;
  } catch {
    return `ACC-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

// 6. Extraer automáticamente nombre del traje y lista de piezas/accesorios predeterminados desde la descripción
export function extraerPiezasYNombreTraje(descripcion: string): { nombreTraje: string; piezas: string[] } {
  if (!descripcion) return { nombreTraje: "", piezas: [] };

  let nombre = descripcion.trim();
  let rawPiezas = "";

  if (descripcion.includes(":")) {
    const parts = descripcion.split(":");
    nombre = parts[0].trim();
    rawPiezas = parts.slice(1).join(" ").trim();
  } else if (descripcion.includes("\n")) {
    const lines = descripcion.split("\n");
    nombre = lines[0].trim();
    rawPiezas = lines.slice(1).join(" ").trim();
  }

  const piezas = rawPiezas
    ? rawPiezas
        .split(/[,;\n\r]+/)
        .map((p) => p.trim().replace(/^Y\s+/i, "").toUpperCase())
        .filter((p) => p.length > 1)
    : [];

  return { nombreTraje: nombre, piezas };
}

