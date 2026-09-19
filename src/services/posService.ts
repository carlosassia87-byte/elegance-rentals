import { supabase } from "@/integrations/supabase/client";
import type {
  Articulo,
  Cliente,
  Factura,
  CampoFactura,
  AbonoCliente,
  DepositoEntregado,
  Gasto,
  Caja,
} from "@/types/database.types";
import {
  buscarArticuloPorBarrasOffline,
  buscarClientePorCedulaOffline,
  buscarFacturaPorNumeroOffline,
  consumirSiguienteNumeroOffline,
  encolarOperacionOffline,
  guardarFacturasLote,
  guardarClientesLote,
  guardarArticulosLote,
  obtenerTodosLosArticulosOffline,
  obtenerTodosLosClientesOffline,
} from "./offlineDbService";
import { renovarBloqueConsecutivosOffline } from "./offlineSyncService";

// ==========================================
// CACHÉ EN MEMORIA ULTRA-RÁPIDO (SWR & O(1) LOOKUPS)
// ==========================================
let _cacheArticulos: Articulo[] | null = null;
let _cacheArticulosTimestamp = 0;
const _mapArticulosPorBarras = new Map<string, Articulo>();
const _mapArticulosPorId = new Map<number, Articulo>();

let _cacheClientes: Cliente[] | null = null;
let _cacheClientesTimestamp = 0;
const _mapClientesPorCedula = new Map<number, Cliente>();

const CACHE_TTL_MS = 45000; // 45 segundos

export function invalidarCacheArticulos() {
  _cacheArticulos = null;
  _cacheArticulosTimestamp = 0;
  _mapArticulosPorBarras.clear();
  _mapArticulosPorId.clear();
}

export function invalidarCacheClientes() {
  _cacheClientes = null;
  _cacheClientesTimestamp = 0;
  _mapClientesPorCedula.clear();
}

function indexarArticulosEnMemoria(arts: Articulo[]) {
  _cacheArticulos = arts;
  _cacheArticulosTimestamp = Date.now();
  _mapArticulosPorBarras.clear();
  _mapArticulosPorId.clear();
  for (let i = 0; i < arts.length; i++) {
    const a = arts[i];
    if (a.CODBARRAS) {
      _mapArticulosPorBarras.set(a.CODBARRAS.trim().toUpperCase(), a);
    }
    if (a.IDARTICULO) {
      _mapArticulosPorId.set(a.IDARTICULO, a);
    }
  }
}

function indexarClientesEnMemoria(clis: Cliente[]) {
  _cacheClientes = clis;
  _cacheClientesTimestamp = Date.now();
  _mapClientesPorCedula.clear();
  for (let i = 0; i < clis.length; i++) {
    const c = clis[i];
    if (c.CEDULA) {
      _mapClientesPorCedula.set(Number(c.CEDULA), c);
    }
  }
}

// ==========================================
// CANAL BROADCAST EN TIEMPO REAL MULTI-PC (<50ms)
// ==========================================
let _broadcastPosChannel: any = null;

export function getPosBroadcastChannel() {
  if (!_broadcastPosChannel) {
    _broadcastPosChannel = supabase.channel("pos_realtime_instant_broadcast", {
      config: { broadcast: { self: false } },
    });
    _broadcastPosChannel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        console.log("⚡ [Realtime POS] Conectado a canal broadcast multi-PC");
      }
    });
  }
  return _broadcastPosChannel;
}

export function emitirEventoRealtime(evento: string, payload: any) {
  try {
    const ch = getPosBroadcastChannel();
    ch.send({
      type: "broadcast",
      event: evento,
      payload: { ...payload, timestamp: Date.now() },
    });
  } catch (e) {
    console.warn("Aviso emitiendo broadcast:", e);
  }
}

// ==========================================
// SERVICIO DE CLIENTES
// ==========================================
export async function buscarClientePorCedula(cedula: number | string): Promise<Cliente | null> {
  const cedulaNum = typeof cedula === "string" ? parseInt(cedula, 10) : cedula;
  if (isNaN(cedulaNum)) return null;

  // 0. Búsqueda instantánea en Caché RAM O(1)
  if (_mapClientesPorCedula.has(cedulaNum)) {
    return _mapClientesPorCedula.get(cedulaNum)!;
  }

  // 1. Si hay conexión, intentar Supabase primero
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from("CLIENTES" as any)
        .select("*")
        .eq("CEDULA", cedulaNum)
        .maybeSingle();

      if (!error && data) {
        const cli = data as unknown as Cliente;
        _mapClientesPorCedula.set(cedulaNum, cli);
        return cli;
      }
    } catch (err) {
      console.warn("Fallo Supabase al buscar cliente, usando IndexedDB:", err);
    }
  }

  // 2. Fallback instantáneo en IndexedDB
  try {
    const cliOffline = await buscarClientePorCedulaOffline(cedulaNum);
    if (cliOffline) {
      const cli = cliOffline as unknown as Cliente;
      _mapClientesPorCedula.set(cedulaNum, cli);
      return cli;
    }
  } catch {}

  return null;
}

export async function buscarClientesPorNombre(query: string): Promise<Cliente[]> {
  try {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from("CLIENTES" as any)
      .select("*")
      .ilike("NOMBRE", `%${query}%`)
      .limit(20);

    if (error) throw error;
    return (data as unknown as Cliente[]) ?? [];
  } catch (err) {
    console.error("Excepción en buscarClientesPorNombre:", err);
    return [];
  }
}

export async function guardarCliente(cliente: Partial<Cliente>): Promise<Cliente | null> {
  try {
    const cedulaNum = typeof cliente.CEDULA === "string" ? parseInt(cliente.CEDULA, 10) : cliente.CEDULA;
    
    // 1. Si viene con IDCLIENTES > 0, actualizar por ID
    if (cliente.IDCLIENTES && cliente.IDCLIENTES > 0) {
      const { data, error } = await supabase
        .from("CLIENTES" as any)
        .update({
          CEDULA: cedulaNum || 0,
          NOMBRE: (cliente.NOMBRE || "").toUpperCase(),
          DIRECCION: cliente.DIRECCION || "",
          TELEFONO: cliente.TELEFONO || "",
          TELEFONO2: cliente.TELEFONO2 || "",
          EMPRESA: cliente.EMPRESA || "",
          DIRECCIONEMP: cliente.DIRECCIONEMP || "",
          SALDO: cliente.SALDO ?? 0,
          NOTA: cliente.NOTA || "",
        })
        .eq("IDCLIENTES", cliente.IDCLIENTES)
        .select()
        .single();
      if (!error && data) return data as unknown as Cliente;
    }

    // 2. Si tiene cédula válida, verificar si ya existe en Supabase
    if (cedulaNum && cedulaNum > 0) {
      const { data: existente } = await supabase
        .from("CLIENTES" as any)
        .select("IDCLIENTES")
        .eq("CEDULA", cedulaNum)
        .maybeSingle();

      if (existente && (existente as any).IDCLIENTES) {
        const { data, error } = await supabase
          .from("CLIENTES" as any)
          .update({
            NOMBRE: (cliente.NOMBRE || "").toUpperCase(),
            DIRECCION: cliente.DIRECCION || "",
            TELEFONO: cliente.TELEFONO || "",
            TELEFONO2: cliente.TELEFONO2 || "",
            EMPRESA: cliente.EMPRESA || "",
            DIRECCIONEMP: cliente.DIRECCIONEMP || "",
            SALDO: cliente.SALDO ?? 0,
            NOTA: cliente.NOTA || "",
          })
          .eq("IDCLIENTES", (existente as any).IDCLIENTES)
          .select()
          .single();
        if (!error && data) return data as unknown as Cliente;
      }
    }

    // 3. Si no existe, insertar nuevo
    const payloadCli = {
      CEDULA: cedulaNum || 0,
      NOMBRE: (cliente.NOMBRE || "").toUpperCase(),
      DIRECCION: cliente.DIRECCION || "",
      TELEFONO: cliente.TELEFONO || "",
      TELEFONO2: cliente.TELEFONO2 || "",
      EMPRESA: cliente.EMPRESA || "",
      DIRECCIONEMP: cliente.DIRECCIONEMP || "",
      SALDO: cliente.SALDO ?? 0,
      NOTA: cliente.NOTA || "",
    };

    let { data, error } = await supabase
      .from("CLIENTES" as any)
      .insert(payloadCli)
      .select()
      .single();

    if (error && (error.code === "23505" || error.message?.includes("CLIENTES_pkey") || error.message?.includes("duplicate key"))) {
      const { data: maxRows } = await supabase
        .from("CLIENTES" as any)
        .select("IDCLIENTES")
        .order("IDCLIENTES", { ascending: false })
        .limit(1);

      const maxId = Number((maxRows as any[])?.[0]?.IDCLIENTES) || 0;
      const resRetry = await supabase
        .from("CLIENTES" as any)
        .insert({ ...payloadCli, IDCLIENTES: maxId + 1 })
        .select()
        .single();

      if (!resRetry.error && resRetry.data) {
        data = resRetry.data;
        error = null;
      }
    }

    let clienteFinal: any = null;
    if (!error && data) {
      clienteFinal = data;
    } else {
      clienteFinal = {
        ...cliente,
        IDCLIENTES: cliente.IDCLIENTES || Date.now(),
        CEDULA: cedulaNum || 0,
        NOMBRE: (cliente.NOMBRE || "").toUpperCase(),
      };
    }

    // Guardar en IndexedDB
    guardarClientesLote([clienteFinal as any]).catch(() => {});

    // Emitir a todos los otros PCs en 50ms
    emitirEventoRealtime("CLIENTE_ACTUALIZADO", { cliente: clienteFinal });

    // Si falló Supabase o estamos offline, encolar para sincronizar
    if (error || (typeof navigator !== "undefined" && !navigator.onLine)) {
      encolarOperacionOffline("NUEVO_CLIENTE", { cliente: clienteFinal }).catch(() => {});
    }

    return clienteFinal as unknown as Cliente;
  } catch (err) {
    console.error("Error guardando cliente:", err);
    const fallbackCli = {
      ...cliente,
      IDCLIENTES: cliente.IDCLIENTES || Date.now(),
      CEDULA: typeof cliente.CEDULA === "string" ? parseInt(cliente.CEDULA, 10) : cliente.CEDULA || 0,
      NOMBRE: (cliente.NOMBRE || "").toUpperCase(),
    };
    guardarClientesLote([fallbackCli as any]).catch(() => {});
    encolarOperacionOffline("NUEVO_CLIENTE", { cliente: fallbackCli }).catch(() => {});
    return fallbackCli as unknown as Cliente;
  }
}

export async function contarClientesTotal(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("CLIENTES" as any)
      .select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listarTodosLosClientes(search = "", limite = 100000, forzarRecarga = false): Promise<Cliente[]> {
  const queryTrim = search.trim().toLowerCase();

  // 0. Si no hay búsqueda o se consulta la lista general, responder desde memoria si está fresca
  if (!queryTrim && !forzarRecarga && _cacheClientes && (Date.now() - _cacheClientesTimestamp < CACHE_TTL_MS)) {
    return _cacheClientes;
  }

  // 1. Si hay conexión, intentar Supabase primero
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const BATCH_SIZE = 1000;
      let todos: Cliente[] = [];
      let from = 0;

      while (from < limite) {
        const to = Math.min(from + BATCH_SIZE - 1, limite - 1);
        let query = supabase.from("CLIENTES" as any).select("*").order("NOMBRE").range(from, to);

        if (queryTrim) {
          const isNum = !isNaN(Number(queryTrim));
          if (isNum) {
            query = query.or(`NOMBRE.ilike.%${queryTrim}%,EMPRESA.ilike.%${queryTrim}%,TELEFONO.ilike.%${queryTrim}%,CEDULA.eq.${Number(queryTrim)}`);
          } else {
            query = query.or(`NOMBRE.ilike.%${queryTrim}%,EMPRESA.ilike.%${queryTrim}%,TELEFONO.ilike.%${queryTrim}%,DIRECCION.ilike.%${queryTrim}%`);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        todos.push(...(data as unknown as Cliente[]));
        if (data.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }

      if (todos.length > 0) {
        if (!queryTrim) {
          indexarClientesEnMemoria(todos);
        }
        setTimeout(() => {
          guardarClientesLote(todos as any).catch(() => {});
        }, 0);
        return todos;
      }
    } catch (err) {
      console.warn("Fallo Supabase listando clientes, usando IndexedDB offline:", err);
    }
  }

  // 2. Fallback IndexedDB
  try {
    const offlineClis = await obtenerTodosLosClientesOffline();
    if (offlineClis && offlineClis.length > 0) {
      const clisArray = offlineClis as unknown as Cliente[];
      if (!queryTrim) {
        indexarClientesEnMemoria(clisArray);
      }
      if (queryTrim) {
        return clisArray.filter((c) =>
          (c.NOMBRE && c.NOMBRE.toLowerCase().includes(queryTrim)) ||
          (c.CEDULA && String(c.CEDULA).includes(queryTrim)) ||
          (c.TELEFONO && c.TELEFONO.includes(queryTrim)) ||
          (c.EMPRESA && c.EMPRESA.toLowerCase().includes(queryTrim))
        );
      }
      return clisArray;
    }
  } catch (errOff) {
    console.warn("Error leyendo clientes de IndexedDB:", errOff);
  }

  return _cacheClientes || [];
}

export async function eliminarCliente(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("CLIENTES" as any).delete().eq("IDCLIENTES", id);
    if (error) throw error;
    if (_cacheClientes) {
      _cacheClientes = _cacheClientes.filter((c) => c.IDCLIENTES !== id);
    }
    return true;
  } catch (err) {
    console.error("Error eliminando cliente:", err);
    return false;
  }
}

// ==========================================
// SERVICIO DE ARTÍCULOS / TRAJES / DISFRACES
// ==========================================
export async function listarArticulos(search = "", limite = 50000, forzarRecarga = false): Promise<Articulo[]> {
  const queryTrim = search.trim().toLowerCase();

  // 0. Devolver inmediatamente desde RAM en 0ms si la caché está disponible
  if (!queryTrim && !forzarRecarga && _cacheArticulos && (Date.now() - _cacheArticulosTimestamp < CACHE_TTL_MS)) {
    return _cacheArticulos;
  }

  // 1. Si hay conexión, intentar Supabase
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const BATCH_SIZE = 1000;
      let todos: Articulo[] = [];
      let from = 0;

      while (from < limite) {
        const to = Math.min(from + BATCH_SIZE - 1, limite - 1);
        let query = supabase.from("ARTICULO" as any).select("*").order("DESCRIPCION").range(from, to);

        if (queryTrim) {
          query = query.or(`DESCRIPCION.ilike.%${queryTrim}%,CODBARRAS.ilike.%${queryTrim}%,TALLA.ilike.%${queryTrim}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        todos.push(...(data as unknown as Articulo[]));
        if (data.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }

      if (todos.length > 0) {
        if (!queryTrim) {
          indexarArticulosEnMemoria(todos);
        }
        // Guardar en IndexedDB en microtask sin bloquear la UI
        setTimeout(() => {
          guardarArticulosLote(todos as any).catch(() => {});
        }, 0);
        return todos;
      }
    } catch (err) {
      console.warn("Fallo Supabase listando artículos, buscando en IndexedDB offline:", err);
    }
  }

  // 2. Fallback IndexedDB
  try {
    const offlineArts = await obtenerTodosLosArticulosOffline();
    if (offlineArts && offlineArts.length > 0) {
      const artsArray = offlineArts as unknown as Articulo[];
      if (!queryTrim) {
        indexarArticulosEnMemoria(artsArray);
      }
      if (queryTrim) {
        return artsArray.filter((a) =>
          (a.DESCRIPCION && a.DESCRIPCION.toLowerCase().includes(queryTrim)) ||
          (a.CODBARRAS && a.CODBARRAS.toLowerCase().includes(queryTrim)) ||
          (a.TALLA && a.TALLA.toLowerCase().includes(queryTrim))
        );
      }
      return artsArray;
    }
  } catch (errOff) {
    console.warn("Error leyendo artículos de IndexedDB:", errOff);
  }

  return _cacheArticulos || [];
}

export async function buscarArticuloPorCodigoBarras(codigo: string): Promise<Articulo | null> {
  if (!codigo) return null;
  const cleanCode = codigo.trim().toUpperCase();

  // 0. Búsqueda O(1) instantánea en RAM (0.01ms)
  if (_mapArticulosPorBarras.has(cleanCode)) {
    return _mapArticulosPorBarras.get(cleanCode)!;
  }

  // 1. Si hay conexión, consultar Supabase
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from("ARTICULO" as any)
        .select("*")
        .eq("CODBARRAS", cleanCode)
        .maybeSingle();
      if (!error && data) {
        const art = data as unknown as Articulo;
        _mapArticulosPorBarras.set(cleanCode, art);
        if (art.IDARTICULO) _mapArticulosPorId.set(art.IDARTICULO, art);
        return art;
      }
    } catch (err) {
      console.warn("Fallo Supabase en artículo, buscando en IndexedDB:", err);
    }
  }

  // 2. Fallback instantáneo en IndexedDB
  try {
    const artOffline = await buscarArticuloPorBarrasOffline(cleanCode);
    if (artOffline) {
      const art = artOffline as unknown as Articulo;
      _mapArticulosPorBarras.set(cleanCode, art);
      return art;
    }
  } catch {}

  return null;
}

export async function guardarArticulo(articulo: Partial<Articulo>): Promise<Articulo | null> {
  try {
    let artGuardado: Articulo | null = null;

    if (articulo.IDARTICULO && Number(articulo.IDARTICULO) > 0) {
      const { data, error } = await supabase
        .from("ARTICULO" as any)
        .update(articulo)
        .eq("IDARTICULO", articulo.IDARTICULO)
        .select()
        .single();
      if (error) throw error;
      artGuardado = data as unknown as Articulo;
    } else {
      // 1. Omitir IDARTICULO para permitir auto-incremento de PostgreSQL
      const payload: any = { ...articulo };
      delete payload.IDARTICULO;

      let { data, error } = await supabase
        .from("ARTICULO" as any)
        .insert(payload)
        .select()
        .single();

      // 2. Si la secuencia en PostgreSQL está desfasada (error 23505 duplicate key / ARTICULO_pkey),
      // calcular el ID máximo actual y reintentar con maxId + 1 automáticamente
      if (error && (error.code === "23505" || error.message?.includes("ARTICULO_pkey") || error.message?.includes("duplicate key"))) {
        console.warn("Detectada secuencia desfasada en ARTICULO. Calculando siguiente ID manual...");
        const { data: maxRows } = await supabase
          .from("ARTICULO" as any)
          .select("IDARTICULO")
          .order("IDARTICULO", { ascending: false })
          .limit(1);

        const maxId = Number((maxRows as any[])?.[0]?.IDARTICULO) || 0;
        const nuevoId = maxId + 1;

        const resRetry = await supabase
          .from("ARTICULO" as any)
          .insert({ ...payload, IDARTICULO: nuevoId })
          .select()
          .single();

        if (resRetry.error) throw resRetry.error;
        data = resRetry.data;
        error = null;
      } else if (error) {
        throw error;
      }

      artGuardado = data as unknown as Articulo;
    }

    // Actualizar caché en memoria inmediatamente
    if (artGuardado) {
      if (artGuardado.CODBARRAS) _mapArticulosPorBarras.set(artGuardado.CODBARRAS.trim().toUpperCase(), artGuardado);
      if (artGuardado.IDARTICULO) _mapArticulosPorId.set(artGuardado.IDARTICULO, artGuardado);
      if (_cacheArticulos) {
        const idx = _cacheArticulos.findIndex((a) => a.IDARTICULO === artGuardado!.IDARTICULO);
        if (idx >= 0) {
          _cacheArticulos[idx] = artGuardado;
        } else {
          _cacheArticulos.unshift(artGuardado);
        }
      }
      setTimeout(() => {
        guardarArticulosLote([artGuardado as any]).catch(() => {});
      }, 0);

      // Emitir a todos los otros PCs en 50ms
      emitirEventoRealtime("ARTICULO_ACTUALIZADO", { articulo: artGuardado });
    }

    return artGuardado;
  } catch (err) {
    console.error("Error guardando artículo:", err);
    throw err;
  }
}

export async function eliminarArticulo(idArticulo: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("ARTICULO" as any).delete().eq("IDARTICULO", idArticulo);
    if (error) throw error;
    if (_cacheArticulos) {
      _cacheArticulos = _cacheArticulos.filter((a) => a.IDARTICULO !== idArticulo);
    }
    _mapArticulosPorId.delete(idArticulo);
    emitirEventoRealtime("ARTICULO_ELIMINADO", { idArticulo });
    return true;
  } catch (err) {
    console.error("Error eliminando artículo:", err);
    return false;
  }
}

export async function toggleDisponibilidadArticulo(idArticulo: number, disponible: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ARTICULO" as any)
      .update({ DISPONIBLE: disponible })
      .eq("IDARTICULO", idArticulo);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error actualizando disponibilidad del artículo:", err);
    return false;
  }
}

// Claves de persistencia de respaldo
const KEY_LOCAL_FACTURAS = "elegance_local_facturas";
const KEY_LOCAL_CAMPOS = "elegance_local_campos_factura";
const KEY_LOCAL_ABONOS = "elegance_local_abonos";

function getLocalFacturas(): Factura[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_FACTURAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFactura(factura: Factura, campos: CampoFactura[]) {
  try {
    const facts = getLocalFacturas();
    const existingIdx = facts.findIndex((f) => f.NUMEROFACT === factura.NUMEROFACT);
    if (existingIdx >= 0) {
      facts[existingIdx] = factura;
    } else {
      facts.unshift(factura);
    }
    localStorage.setItem(KEY_LOCAL_FACTURAS, JSON.stringify(facts));

    // Guardar campos
    const rawCampos = localStorage.getItem(KEY_LOCAL_CAMPOS);
    const allCampos: CampoFactura[] = rawCampos ? JSON.parse(rawCampos) : [];
    const filteredCampos = allCampos.filter((c) => c.NUMEROFACT !== factura.NUMEROFACT);
    localStorage.setItem(KEY_LOCAL_CAMPOS, JSON.stringify([...campos, ...filteredCampos]));
  } catch (e) {
    console.warn("No se pudo guardar factura local:", e);
  }
}

function getLocalAbonos(): AbonoCliente[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_ABONOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAbono(abono: AbonoCliente) {
  try {
    const abonos = getLocalAbonos();
    abonos.push(abono);
    localStorage.setItem(KEY_LOCAL_ABONOS, JSON.stringify(abonos));
  } catch (e) {
    console.warn("No se pudo guardar abono local:", e);
  }
}

/**
 * Extrae de forma segura el número secuencial de un código de factura,
 * respetando el prefijo para evitar confusiones con números dentro del prefijo (ej: "POS2-50" -> 50).
 */
export function extraerNumeroFactura(numFactura: string, prefijo = ""): number {
  if (!numFactura) return 0;
  const str = String(numFactura).trim();
  const pfxTrim = (prefijo || "").trim();

  // 1. Si se conoce el prefijo y el string empieza por él (insensible a mayúsculas)
  if (pfxTrim && str.toUpperCase().startsWith(pfxTrim.toUpperCase())) {
    const resto = str.slice(pfxTrim.length).trim();
    const n = parseInt(resto, 10);
    if (!isNaN(n)) return n;
  }

  // 2. Si no coincide con el prefijo dado, intentar extraer la secuencia numérica al final de la cadena
  const matchFinal = str.match(/(\d+)$/);
  if (matchFinal) {
    const n = parseInt(matchFinal[1], 10);
    if (!isNaN(n)) return n;
  }

  // 3. Fallback a cualquier grupo de dígitos
  const matchAny = str.match(/\d+/);
  return matchAny ? parseInt(matchAny[0], 10) : 0;
}

// ==========================================
// SERVICIO DE FACTURACIÓN Y CAJAS (EXACTO A WINDEV)
// ==========================================
export async function generarNumeroFactura(nombreCaja = "SERVIDOR", prefijoDefault = "G"): Promise<string> {
  try {
    let pfx = prefijoDefault;
    let baseConsecutivo = 0;
    let cajaEncontrada = false;

    // 1. Consultar CAJAS para nombreCaja en Supabase
    try {
      const { data: cajaRaw, error: errCaja } = await supabase
        .from("CAJAS" as any)
        .select("*")
        .eq("NOMBRECAJA", nombreCaja)
        .maybeSingle();

      const caja = cajaRaw as any;
      if (!errCaja && caja) {
        if (caja.PREFIJO !== undefined && caja.PREFIJO !== null) pfx = caja.PREFIJO;
        baseConsecutivo = Number(caja.NUMERACION) || 0;
        cajaEncontrada = true;
      }
    } catch (e) {
      console.warn("Error consultando caja en Supabase:", e);
    }

    // 2. Consultar CAJAS en LocalStorage
    try {
      const rawCajas = localStorage.getItem("elegance_lista_cajas");
      if (rawCajas) {
        const list: any[] = JSON.parse(rawCajas);
        const cajaLocal = list.find((c) => c.NOMBRECAJA === nombreCaja);
        if (cajaLocal) {
          if (cajaLocal.PREFIJO !== undefined && cajaLocal.PREFIJO !== null) pfx = cajaLocal.PREFIJO;
          const numLocal = Number(cajaLocal.NUMERACION) || 0;
          if (!cajaEncontrada || numLocal > baseConsecutivo) {
            baseConsecutivo = numLocal;
          }
        }
      }
    } catch {}

    let maxNum = Math.max(0, baseConsecutivo - 1);
    const pfxTrim = (pfx || "").trim().toUpperCase();

    // 3. Consultar FACTURA en Supabase para obtener el mayor número registrado PARA ESTE PREFIJO
    try {
      const { data: facts } = await supabase
        .from("FACTURA" as any)
        .select("NUMEROFACT, IDFACTURA")
        .order("IDFACTURA", { ascending: false })
        .limit(300);

      if (facts && facts.length > 0) {
        for (const f of facts as any[]) {
          const numFact = String(f.NUMEROFACT || "").trim();
          if (!numFact) continue;

          if (pfxTrim) {
            // Solo considerar facturas que pertenezcan a este prefijo específico
            if (numFact.toUpperCase().startsWith(pfxTrim)) {
              const n = extraerNumeroFactura(numFact, pfx);
              if (n > maxNum) {
                maxNum = n;
              }
            }
          } else {
            // Sin prefijo: sólo considerar facturas netamente numéricas
            if (/^\d+$/.test(numFact)) {
              const n = extraerNumeroFactura(numFact);
              if (n > maxNum) {
                maxNum = n;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error consultando última factura:", e);
    }

    // 4. Consultar facturas locales en LocalStorage PARA ESTE PREFIJO
    try {
      const localFacts = getLocalFacturas();
      for (const f of localFacts) {
        const numFact = String(f.NUMEROFACT || "").trim();
        if (!numFact) continue;

        if (pfxTrim) {
          if (numFact.toUpperCase().startsWith(pfxTrim)) {
            const n = extraerNumeroFactura(numFact, pfx);
            if (n > maxNum) {
              maxNum = n;
            }
          }
        } else {
          if (/^\d+$/.test(numFact)) {
            const n = extraerNumeroFactura(numFact);
            if (n > maxNum) {
              maxNum = n;
            }
          }
        }
      }
    } catch {}

    const sigNumero = maxNum + 1;
    if (pfx && pfx.trim()) {
      return `${pfx.trim()}${sigNumero}`;
    }
    return String(sigNumero).padStart(6, "0");
  } catch {
    const localFacts = getLocalFacturas();
    const sig = localFacts.length + 1;
    return prefijoDefault ? `${prefijoDefault}${sig}` : String(sig).padStart(6, "0");
  }
}

export async function registrarAlquilerFactura(
  facturaData: Omit<Factura, "IDFACTURA">,
  items: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[],
  nombreCaja = "SERVIDOR",
  prefijoDefault = "G"
): Promise<{ factura: Factura; items: CampoFactura[] }> {
  // 1. Obtener el número consecutivo garantizado y evitar colisiones concurrentes entre PCs
  let sNumeroFactura = facturaData.NUMEROFACT || (await generarNumeroFactura(nombreCaja, prefijoDefault));

  try {
    // Validar si otra PC ya registró una factura con este mismo número
    const { data: existente } = await supabase
      .from("FACTURA" as any)
      .select("NUMEROFACT")
      .eq("NUMEROFACT", sNumeroFactura)
      .maybeSingle();

    if (existente && (existente as any).NUMEROFACT) {
      sNumeroFactura = await generarNumeroFactura(nombreCaja, prefijoDefault);
    }
  } catch {}

  const numeroEntero = extraerNumeroFactura(sNumeroFactura, prefijoDefault);

  try {
    // 2. Actualizar numeración de la caja en Supabase y Local
    try {
      const { data: cajaRaw } = await supabase
        .from("CAJAS" as any)
        .select("*")
        .eq("NOMBRECAJA", nombreCaja)
        .maybeSingle();

      const caja = cajaRaw as any;
      if (caja) {
        await supabase
          .from("CAJAS" as any)
          .update({ NUMERACION: numeroEntero })
          .eq("NOMBRECAJA", nombreCaja);
      } else {
        await supabase
          .from("CAJAS" as any)
          .insert({
            NOMBRECAJA: nombreCaja,
            NUMERACION: numeroEntero,
            PREFIJO: prefijoDefault,
            RESOLUCION: "AUTORIZADO",
          });
      }
    } catch (e) {
      console.warn("No se pudo actualizar CAJAS en Supabase:", e);
    }

    // Actualizar también en LocalStorage
    try {
      const rawCajas = localStorage.getItem("elegance_lista_cajas");
      if (rawCajas) {
        const list: any[] = JSON.parse(rawCajas);
        const idx = list.findIndex((c) => c.NOMBRECAJA === nombreCaja);
        if (idx >= 0) {
          list[idx].NUMERACION = numeroEntero;
          localStorage.setItem("elegance_lista_cajas", JSON.stringify(list));
        }
      }
    } catch {}

    const cleanFacturaData: Record<string, any> = {
      NUMEROFACT: sNumeroFactura,
      FECHASALIDA: facturaData.FECHASALIDA || new Date().toISOString().split("T")[0],
      FECHAENTRADA: facturaData.FECHAENTRADA || new Date().toISOString().split("T")[0],
      FTOTALDEPOSITO: Number(facturaData.FTOTALDEPOSITO) || 0,
      FTOTALVENTADEPOSITO: Number(facturaData.FTOTALVENTADEPOSITO) || 0,
      FORMAPAGO: facturaData.FORMAPAGO || "EFECTIVO",
      MODO: facturaData.MODO || "ALQUILER",
      VENDEDOR: facturaData.VENDEDOR || "ADMINISTRADOR",
      CCLIENTE: (facturaData.CCLIENTE || "GENERAL").toUpperCase(),
      CAMBIOS: Number(facturaData.CAMBIOS) || 0,
      PAGACON: Number(facturaData.PAGACON) || 0,
      ESTADOCLIENTE: facturaData.ESTADOCLIENTE || "EN ALQUILER",
      CDIRECCION: facturaData.CDIRECCION || "",
      CTELEFONO: facturaData.CTELEFONO || "",
      CTELEFONO1: facturaData.CTELEFONO1 || "",
      CEMPRESA: facturaData.CEMPRESA || "",
      CCEDULA: String(facturaData.CCEDULA || ""),
      PAGOCONEFECTIVO: Number(facturaData.PAGOCONEFECTIVO) || 0,
      PAGOCONTRANFERENCIA: Number(facturaData.PAGOCONTRANFERENCIA) || 0,
      FTOTALALQUILER: Number(facturaData.FTOTALALQUILER) || 0,
      FPAGOTRANS: facturaData.FPAGOTRANS || "",
      DESCUENTO: Number(facturaData.DESCUENTO) || 0,
      TOTAL_SALDO: Number(facturaData.TOTAL_SALDO) || 0,
      FECHA_RECIBO: facturaData.FECHA_RECIBO || new Date().toISOString().split("T")[0],
    };

    let facturaInsertada: Factura | null = null;
    let guardadoEnSupabase = false;
    let intentosGuardado = 0;
    const maxIntentos = 3;

    while (intentosGuardado < maxIntentos && !guardadoEnSupabase) {
      try {
        cleanFacturaData["NUMEROFACT"] = sNumeroFactura;
        const { data: facturaRaw, error: errorFactura } = await supabase
          .from("FACTURA" as any)
          .insert(cleanFacturaData)
          .select()
          .single();

        if (!errorFactura && facturaRaw) {
          facturaInsertada = facturaRaw as unknown as Factura;
          guardadoEnSupabase = true;
          break;
        } else if (errorFactura) {
          // Si hubo colisión de concurrencia con otra PC (código 23505 / duplicate key en NUMEROFACT)
          if (errorFactura.code === "23505" || errorFactura.message?.includes("duplicate key") || errorFactura.message?.includes("NUMEROFACT")) {
            console.warn(`[POS Concurrencia] Colisión detectada en factura ${sNumeroFactura}. Reintentando con siguiente número...`);
            sNumeroFactura = await generarNumeroFactura(nombreCaja, prefijoDefault);
            intentosGuardado++;
            continue;
          } else {
            console.error("Error insertando FACTURA en Supabase:", errorFactura.message);
            break;
          }
        }
      } catch (e: any) {
        console.error("Excepción insertando FACTURA en Supabase:", e?.message);
        break;
      }
    }

    if (!facturaInsertada) {
      facturaInsertada = {
        ...cleanFacturaData,
        IDFACTURA: Date.now(),
        NUMEROFACT: sNumeroFactura,
      } as Factura;
    }

    // 4. Insertar los ítems en CAMPOFACTURA en Supabase (sin AUTOMATIC para permitir auto-serial de PostgreSQL)
    const camposParaSupabase = items.map((item) => ({
      DESCRIPCION: item.DESCRIPCION || "",
      CANTIDAD: Number(item.CANTIDAD) || 1,
      VALOR: Number(item.VALOR) || 0,
      TOTAL: Number(item.TOTAL) || 0,
      BARRAS: item.BARRAS || "0",
      NUMEROFACT: sNumeroFactura,
      IDFACTURA: Number(facturaInsertada.IDFACTURA) || Date.now(),
      VALORDEPOSITO: Number(item.VALORDEPOSITO) || 0,
      TOTALALQUILER: Number(item.TOTALALQUILER) || 0,
      TOTALDEPOSITO: Number(item.TOTALDEPOSITO) || 0,
      ES_ACCESORIO: Boolean((item as any).ES_ACCESORIO),
      ID_TRAJE_PADRE: (item as any).ID_TRAJE_PADRE || "",
      PIEZAS_INCLUIDAS: (item as any).PIEZAS_INCLUIDAS || "",
    }));

    try {
      const { error: errCampos } = await supabase
        .from("CAMPOFACTURA" as any)
        .insert(camposParaSupabase);
      if (errCampos) {
        console.error("Error insertando CAMPOFACTURA en Supabase:", errCampos.message);
      }
    } catch (e: any) {
      console.error("Excepción insertando CAMPOFACTURA en Supabase:", e?.message);
    }

    // 5. Guardar en IndexedDB y LocalStorage
    try {
      await guardarFacturasLote(
        [cleanFacturaData as any],
        camposParaSupabase as any
      );
    } catch (eDb) {
      console.warn("Aviso guardando en IndexedDB:", eDb);
    }
    saveLocalFactura(facturaInsertada as Factura, camposParaSupabase as CampoFactura[]);

    // 5.1 Si no hubo conexión o falló la inserción en la nube, encolar para sincronización
    if (!guardadoEnSupabase || (typeof navigator !== "undefined" && !navigator.onLine)) {
      try {
        await encolarOperacionOffline("NUEVA_FACTURA", {
          factura: cleanFacturaData,
          items: camposParaSupabase,
        });
      } catch (eQueue) {
        console.warn("Aviso encolando factura offline:", eQueue);
      }
    } else {
      // Si estamos online, renovar reserva de consecutivos en segundo plano
      renovarBloqueConsecutivosOffline().catch(() => {});
    }

    // 6. Descontar Stock de cada ARTICULO o ACCESORIO en inventario
    for (const item of items) {
      if ((item as any).ES_ACCESORIO || item.BARRAS?.startsWith("ACC-")) {
        // Descontar de ACCESORIOS
        try {
          const { data: accRaw } = await supabase
            .from("ACCESORIOS" as any)
            .select("*")
            .or(`CODBARRAS.eq.${item.BARRAS},DESCRIPCION.ilike.%${item.DESCRIPCION}%`)
            .maybeSingle();

          const acc = accRaw as any;
          if (acc && acc.STOCK > 0) {
            await supabase
              .from("ACCESORIOS" as any)
              .update({ STOCK: Math.max(0, acc.STOCK - item.CANTIDAD) })
              .eq("IDACCESORIO", acc.IDACCESORIO);
          }
        } catch (errAcc) {
          console.warn("No se pudo descontar stock de accesorio:", item.DESCRIPCION, errAcc);
        }
      } else if (item.DESCRIPCION) {
        try {
          const { data: artRaw } = await supabase
            .from("ARTICULO" as any)
            .select("*")
            .eq("DESCRIPCION", item.DESCRIPCION)
            .maybeSingle();

          const art = artRaw as any;
          if (art && art.STOCK > 0) {
            await supabase
              .from("ARTICULO" as any)
              .update({ STOCK: Math.max(0, art.STOCK - item.CANTIDAD) })
              .eq("IDARTICULO", art.IDARTICULO);
          }
        } catch (errStock) {
          console.warn("No se pudo descontar stock para:", item.DESCRIPCION, errStock);
        }
      }
    }

    // Emitir evento instantáneo a todos los PCs (50ms)
    emitirEventoRealtime("VENTA_REGISTRADA", {
      numeroFactura: sNumeroFactura,
      items: items,
      modo: facturaData.MODO || "ALQUILER",
      caja: (facturaInsertada as any)?.CAJA || nombreCaja,
    });

    return {
      factura: facturaInsertada as unknown as Factura,
      items: camposParaSupabase as unknown as CampoFactura[],
    };
  } catch (err) {
    console.error("Error al registrar factura de alquiler:", err);
    // Fallback completo seguro
    const facturaLocal: Factura = {
      ...facturaData,
      IDFACTURA: Date.now(),
      NUMEROFACT: sNumeroFactura,
    };
    const camposLocal: CampoFactura[] = items.map((item, idx) => ({
      ...item,
      IDFACTURA: facturaLocal.IDFACTURA,
      NUMEROFACT: sNumeroFactura,
      AUTOMATIC: idx + 1,
    }));
    saveLocalFactura(facturaLocal, camposLocal);

    return {
      factura: facturaLocal,
      items: camposLocal,
    };
  }
}

// ==========================================
// SERVICIO DE ABONOS Y ENTREGA VESTIDO APARTADO
// ==========================================
export interface ItemApartadoConEstado extends CampoFactura {
  estadoPrenda: "DEVUELTO A TIENDA" | "EN BODEGA" | "EN ALQUILER";
  fechaDevolucion?: string;
  diasParaEntrega?: number;
}

export async function buscarFacturaApartado(numeroFact: string): Promise<{
  factura: Factura | null;
  items: ItemApartadoConEstado[];
  abonos: AbonoCliente[];
  yaDevuelto: boolean;
  totalDevuelto: number;
}> {
  try {
    const term = numeroFact.trim().toUpperCase();
    if (!term) return { factura: null, items: [], abonos: [], yaDevuelto: false, totalDevuelto: 0 };

    let facturaEncontrada: any = null;
    let itemsEncontrados: any[] = [];
    let abonosEncontrados: any[] = [];

    // 1. Buscar en Supabase por igualdad exacta o ilike
    try {
      const { data: facts } = await supabase
        .from("FACTURA" as any)
        .select("*")
        .ilike("NUMEROFACT", `%${term}%`)
        .limit(1);

      if (facts && facts.length > 0) {
        facturaEncontrada = facts[0];

        // Cargar ítems
        const { data: items } = await supabase
          .from("CAMPOFACTURA" as any)
          .select("*")
          .eq("NUMEROFACT", facturaEncontrada.NUMEROFACT);

        if (items && items.length > 0) {
          itemsEncontrados = items;
        }

        // Cargar abonos
        const { data: abonos } = await supabase
          .from("ABONO_CLIENTE" as any)
          .select("*")
          .eq("AFACTURA", facturaEncontrada.NUMEROFACT)
          .order("IDABONO_CLIENTE", { ascending: true });

        if (abonos && abonos.length > 0) {
          abonosEncontrados = abonos;
        }
      }
    } catch (e) {
      console.warn("Error consultando supabase FACTURA:", e);
    }

    // 2. Si no se encontró en Supabase, buscar en IndexedDB
    if (!facturaEncontrada) {
      try {
        const offRes = await buscarFacturaPorNumeroOffline(term);
        if (offRes.factura) {
          facturaEncontrada = offRes.factura;
          if (offRes.items.length > 0) itemsEncontrados = offRes.items;
          if (offRes.abonos.length > 0) abonosEncontrados = offRes.abonos;
        }
      } catch {}
    }

    // 2.1 Si aún no se encontró, buscar en LocalStorage
    if (!facturaEncontrada) {
      const localFacts = getLocalFacturas();
      const match = localFacts.find((f) => 
        String(f.NUMEROFACT || "").trim().toUpperCase() === term ||
        String(f.NUMEROFACT || "").trim().toUpperCase().includes(term)
      );

      if (match) {
        facturaEncontrada = match;

        try {
          const rawCampos = localStorage.getItem(KEY_LOCAL_CAMPOS);
          const allCampos: CampoFactura[] = rawCampos ? JSON.parse(rawCampos) : [];
          itemsEncontrados = allCampos.filter((c) => 
            String(c.NUMEROFACT || "").trim().toUpperCase() === String(match.NUMEROFACT).trim().toUpperCase()
          );
        } catch {}
      }
    }

    // Cargar abonos locales si existen
    const localAbonos = getLocalAbonos().filter((a) => 
      facturaEncontrada && String(a.AFACTURA || "").trim().toUpperCase() === String(facturaEncontrada.NUMEROFACT).trim().toUpperCase()
    );
    if (localAbonos.length > 0 && abonosEncontrados.length === 0) {
      abonosEncontrados = localAbonos;
    }

    if (!facturaEncontrada) {
      return { factura: null, items: [], abonos: [], yaDevuelto: false, totalDevuelto: 0 };
    }

    // 3. Consultar si ya tiene devoluciones / reintegros registrados
    let totalDevuelto = 0;
    try {
      const { data: depsRaw } = await supabase
        .from("DEPOSITOENTREGADO" as any)
        .select("*")
        .eq("NUMEROFACTURA", facturaEncontrada.NUMEROFACT);
      if (depsRaw && depsRaw.length > 0) {
        totalDevuelto = depsRaw.reduce((acc: number, d: any) => acc + (Number(d.VALOR) || 0), 0);
      }
    } catch {}

    const rawLocalDeps = localStorage.getItem("elegance_local_depositos_entregados");
    if (rawLocalDeps) {
      try {
        const localDepsList: any[] = JSON.parse(rawLocalDeps);
        const matchDeps = localDepsList.filter((d: any) => d.NUMEROFACTURA === facturaEncontrada.NUMEROFACT);
        if (matchDeps.length > 0 && totalDevuelto === 0) {
          totalDevuelto = matchDeps.reduce((acc: number, d: any) => acc + (Number(d.VALOR) || 0), 0);
        }
      } catch {}
    }

    // 4. Leer mapa de estados de prendas override
    let overrides: Record<string, any> = {};
    try {
      const rawOv = localStorage.getItem("elegance_estados_prendas_override");
      if (rawOv) overrides = JSON.parse(rawOv);
    } catch {}

    const facturaDevuelta = totalDevuelto > 0 || facturaEncontrada.ESTADOCLIENTE === "DEVUELTO" || facturaEncontrada.ESTADOFIN === "DEVUELTO";

    const itemsConEstado: ItemApartadoConEstado[] = itemsEncontrados.map((it) => {
      const cod = it.BARRAS || "";
      const desc = it.DESCRIPCION || "";
      const keyOv = `${facturaEncontrada.NUMEROFACT}_${cod || desc}`;
      const ov = overrides[keyOv];

      let estadoPrenda: "DEVUELTO A TIENDA" | "EN BODEGA" | "EN ALQUILER" = "EN BODEGA";

      if (ov?.estado === "DEVUELTO A TIENDA" || facturaDevuelta) {
        estadoPrenda = "DEVUELTO A TIENDA";
      } else if (
        ov?.estado === "EN ALQUILER" ||
        facturaEncontrada.ESTADOCLIENTE === "ENTREGADO" ||
        facturaEncontrada.ESTADOFIN === "EN ALQUILER" ||
        facturaEncontrada.MODO === "EN ALQUILER"
      ) {
        estadoPrenda = "EN ALQUILER";
      } else {
        estadoPrenda = "EN BODEGA";
      }

      return {
        ...it,
        estadoPrenda,
        fechaDevolucion: ov?.fechaDevolucion,
      };
    });

    const todasDevueltas = itemsConEstado.length > 0 && itemsConEstado.every((i) => i.estadoPrenda === "DEVUELTO A TIENDA");
    const yaDevuelto = facturaDevuelta || todasDevueltas;

    return {
      factura: facturaEncontrada as Factura,
      items: itemsConEstado,
      abonos: abonosEncontrados as AbonoCliente[],
      yaDevuelto,
      totalDevuelto,
    };
  } catch (err) {
    console.error("Error buscando factura de apartado:", err);
    return { factura: null, items: [], abonos: [], yaDevuelto: false, totalDevuelto: 0 };
  }
}

export async function registrarAbonoCliente(params: {
  numeroFactura: string;
  cliente: string;
  pagoEfectivo: number;
  pagoTransferencia: number;
  saldoAnterior: number;
  saldoDeber: number;
  totalAbono: number;
  fecha?: string | undefined;
}): Promise<AbonoCliente | null> {
  try {
    const numeroAbono = `AB-${Date.now().toString().slice(-4)}`;
    const fecha = params.fecha || new Date().toISOString().split("T")[0];

    const abonoObj: AbonoCliente = {
      NUMEROABONO: numeroAbono,
      ACLIENTE: params.cliente,
      AFACTURA: params.numeroFactura,
      PAGOEFECTIVO: params.pagoEfectivo,
      PAGOTRANFE: params.pagoTransferencia,
      FECHAABONO: fecha,
      SALDOANTERIOR: params.saldoAnterior,
      SALDODEBER: params.saldoDeber,
      TOTAL_ABONO: params.totalAbono,
    };

    let guardadoSupabase = false;
    try {
      const { data: abono, error: errAbono } = await supabase
        .from("ABONO_CLIENTE" as any)
        .insert(abonoObj)
        .select()
        .single();

      if (!errAbono && abono) {
        guardadoSupabase = true;
        // Actualizar FACTURA en Supabase
        await supabase
          .from("FACTURA" as any)
          .update({ TOTAL_SALDO: params.saldoDeber })
          .eq("NUMEROFACT", params.numeroFactura);
      }
    } catch (e) {
      console.warn("Fallo guardado de abono en Supabase, usando local:", e);
    }

    // Si no se guardó en Supabase o estamos offline, encolar
    if (!guardadoSupabase || (typeof navigator !== "undefined" && !navigator.onLine)) {
      try {
        await encolarOperacionOffline("NUEVO_ABONO", {
          abono: abonoObj,
          facturaNumero: params.numeroFactura,
          nuevoSaldo: params.saldoDeber,
        });
      } catch (eQueue) {
        console.warn("Aviso encolando abono offline:", eQueue);
      }
    }

    // Guardar en respaldo local
    saveLocalAbono(abonoObj);

    // Actualizar factura local
    const facts = getLocalFacturas();
    const factIdx = facts.findIndex((f) => f.NUMEROFACT === params.numeroFactura);
    if (factIdx >= 0 && facts[factIdx]) {
      facts[factIdx]!.TOTAL_SALDO = params.saldoDeber;
      localStorage.setItem(KEY_LOCAL_FACTURAS, JSON.stringify(facts));
    }

    return abonoObj;
  } catch (err) {
    console.error("Error registrando abono cliente:", err);
    return null;
  }
}

export async function registrarSalidaVestidoApartado(
  numeroFactura: string,
  fechaSalidaPersonalizada?: string,
  fechaDevolucionPersonalizada?: string
): Promise<{ ok: boolean; fechaSalida: string; fechaDevolucion: string }> {
  try {
    const hoy = fechaSalidaPersonalizada || new Date().toISOString().split("T")[0];
    
    // Si no se pasa fecha de devolución, se cuentan automáticamente los 3 días hábiles/reglamentarios
    let dDevolucion = fechaDevolucionPersonalizada;
    if (!dDevolucion) {
      const d = new Date(hoy + "T12:00:00");
      d.setDate(d.getDate() + 3);
      dDevolucion = d.toISOString().split("T")[0];
    }

    try {
      await supabase
        .from("FACTURA" as any)
        .update({
          ESTADOCLIENTE: "EN ALQUILER",
          ESTADOFIN: "EN ALQUILER",
          MODO: "ALQUILER",
          FECHASALIDA: hoy,
          FECHAENTRADA: dDevolucion,
        })
        .eq("NUMEROFACT", numeroFactura);
    } catch (e) {
      console.warn("Error actualizando salida en Supabase:", e);
    }

    // Actualizar local
    const facts = getLocalFacturas();
    const factIdx = facts.findIndex((f) => f.NUMEROFACT === numeroFactura);
    if (factIdx >= 0 && facts[factIdx]) {
      facts[factIdx]!.ESTADOCLIENTE = "EN ALQUILER";
      facts[factIdx]!.MODO = "ALQUILER";
      facts[factIdx]!.FECHASALIDA = hoy;
      facts[factIdx]!.FECHAENTRADA = dDevolucion;
      localStorage.setItem(KEY_LOCAL_FACTURAS, JSON.stringify(facts));
    }

    // Actualizar mapa de estados de prendas override para esta factura a "EN ALQUILER"
    try {
      const rawOv = localStorage.getItem("elegance_estados_prendas_override");
      const overrides = rawOv ? JSON.parse(rawOv) : {};

      // Buscar ítems de esta factura en local
      const rawCampos = localStorage.getItem(KEY_LOCAL_CAMPOS);
      const allCampos: CampoFactura[] = rawCampos ? JSON.parse(rawCampos) : [];
      const itemsFact = allCampos.filter((c) => c.NUMEROFACT === numeroFactura);

      for (const item of itemsFact) {
        const key = `${numeroFactura}_${item.BARRAS || item.DESCRIPCION}`;
        overrides[key] = {
          estado: "EN ALQUILER",
          fechaSalida: hoy,
          fechaEntregaPactada: dDevolucion,
        };
      }
      localStorage.setItem("elegance_estados_prendas_override", JSON.stringify(overrides));
    } catch (e) {
      console.warn("Error actualizando override de prendas:", e);
    }

    return { ok: true, fechaSalida: hoy, fechaDevolucion: dDevolucion };
  } catch (err) {
    console.error("Error registrando salida de vestido:", err);
    return { ok: false, fechaSalida: "", fechaDevolucion: "" };
  }
}

// ==========================================
// SERVICIO DE DEVOLUCIÓN DE VESTIDOS (DEPÓSITOS)
// ==========================================
export async function registrarDevolucionVestido(params: {
  numeroFactura: string;
  montoDevuelto: number;
  fecha?: string | undefined;
  observaciones?: string | undefined;
}): Promise<DepositoEntregado | null> {
  try {
    const fecha = params.fecha || new Date().toISOString().split("T")[0];
    const depData: DepositoEntregado = {
      NUMEROFACTURA: params.numeroFactura,
      VALOR: params.montoDevuelto,
      FECHA: fecha,
    };

    try {
      const { data, error } = await supabase
        .from("DEPOSITOENTREGADO" as any)
        .insert(depData)
        .select()
        .single();
      if (!error && data) {
        return data as unknown as DepositoEntregado;
      }
    } catch (e) {
      console.warn("Error guardando devolución en Supabase:", e);
    }

    return depData;
  } catch (err) {
    console.error("Error en registrarDevolucionVestido:", err);
    return null;
  }
}

// ==========================================
// SERVICIO DE GASTOS
// ==========================================
export async function registrarGasto(params: {
  DESCRIPCIONSALIDA: string;
  VALORSALIDA: number | string;
  NUMEROGASTO?: string | undefined;
  FECHA?: string | undefined;
}): Promise<Gasto | null> {
  try {
    const { data, error } = await supabase
      .from("GASTOS" as any)
      .insert({
        DESCRIPCIONSALIDA: params.DESCRIPCIONSALIDA,
        VALORSALIDA: String(params.VALORSALIDA),
        NUMEROGASTO: params.NUMEROGASTO || `GA-${Date.now()}`,
        FECHA: params.FECHA || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Gasto;
  } catch (err) {
    console.error("Error registrando gasto:", err);
    return null;
  }
}
