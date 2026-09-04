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

// ==========================================
// SERVICIO DE CLIENTES
// ==========================================
export async function buscarClientePorCedula(cedula: number | string): Promise<Cliente | null> {
  try {
    const cedulaNum = typeof cedula === "string" ? parseInt(cedula, 10) : cedula;
    if (isNaN(cedulaNum)) return null;

    const { data, error } = await supabase
      .from("CLIENTES" as any)
      .select("*")
      .eq("CEDULA", cedulaNum)
      .maybeSingle();

    if (error) {
      console.warn("Error consultando cliente por cédula:", error.message);
      return null;
    }
    return data as unknown as Cliente | null;
  } catch (err) {
    console.error("Excepción en buscarClientePorCedula:", err);
    return null;
  }
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
    if (cliente.IDCLIENTES && cliente.IDCLIENTES > 0) {
      const { data, error } = await supabase
        .from("CLIENTES" as any)
        .update({
          CEDULA: cliente.CEDULA,
          NOMBRE: cliente.NOMBRE,
          DIRECCION: cliente.DIRECCION,
          TELEFONO: cliente.TELEFONO,
          TELEFONO2: cliente.TELEFONO2,
          EMPRESA: cliente.EMPRESA,
          DIRECCIONEMP: cliente.DIRECCIONEMP,
          SALDO: cliente.SALDO ?? 0,
          NOTA: cliente.NOTA,
        })
        .eq("IDCLIENTES", cliente.IDCLIENTES)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Cliente;
    } else {
      const { data, error } = await supabase
        .from("CLIENTES" as any)
        .insert({
          CEDULA: cliente.CEDULA,
          NOMBRE: cliente.NOMBRE,
          DIRECCION: cliente.DIRECCION,
          TELEFONO: cliente.TELEFONO,
          TELEFONO2: cliente.TELEFONO2,
          EMPRESA: cliente.EMPRESA,
          DIRECCIONEMP: cliente.DIRECCIONEMP,
          SALDO: cliente.SALDO ?? 0,
          NOTA: cliente.NOTA,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Cliente;
    }
  } catch (err) {
    console.error("Error guardando cliente:", err);
    return cliente as unknown as Cliente;
  }
}

export async function listarTodosLosClientes(search = ""): Promise<Cliente[]> {
  try {
    let query = supabase.from("CLIENTES" as any).select("*").order("NOMBRE");
    if (search.trim()) {
      const isNum = !isNaN(Number(search));
      if (isNum) {
        query = query.or(`NOMBRE.ilike.%${search}%,EMPRESA.ilike.%${search}%,TELEFONO.ilike.%${search}%,CEDULA.eq.${Number(search)}`);
      } else {
        query = query.or(`NOMBRE.ilike.%${search}%,EMPRESA.ilike.%${search}%,TELEFONO.ilike.%${search}%,DIRECCION.ilike.%${search}%`);
      }
    }
    const { data, error } = await query.limit(300);
    if (error) throw error;
    return (data as unknown as Cliente[]) ?? [];
  } catch (err) {
    console.error("Error listando clientes:", err);
    return [];
  }
}

export async function eliminarCliente(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("CLIENTES" as any).delete().eq("IDCLIENTES", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error eliminando cliente:", err);
    return false;
  }
}

// ==========================================
// SERVICIO DE ARTÍCULOS / TRAJES / DISFRACES
// ==========================================
export async function listarArticulos(search = ""): Promise<Articulo[]> {
  try {
    let query = supabase.from("ARTICULO" as any).select("*").order("DESCRIPCION");
    if (search.trim()) {
      query = query.or(`DESCRIPCION.ilike.%${search}%,CODBARRAS.ilike.%${search}%,TALLA.ilike.%${search}%`);
    }
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return (data as unknown as Articulo[]) ?? [];
  } catch (err) {
    console.error("Error listando artículos:", err);
    return [];
  }
}

export async function buscarArticuloPorCodigoBarras(codigo: string): Promise<Articulo | null> {
  try {
    const { data, error } = await supabase
      .from("ARTICULO" as any)
      .select("*")
      .eq("CODBARRAS", codigo)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Articulo | null;
  } catch (err) {
    console.error("Error buscando por código de barras:", err);
    return null;
  }
}

export async function guardarArticulo(articulo: Partial<Articulo>): Promise<Articulo | null> {
  try {
    if (articulo.IDARTICULO && articulo.IDARTICULO > 0) {
      const { data, error } = await supabase
        .from("ARTICULO" as any)
        .update(articulo)
        .eq("IDARTICULO", articulo.IDARTICULO)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Articulo;
    } else {
      const { data, error } = await supabase
        .from("ARTICULO" as any)
        .insert(articulo)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Articulo;
    }
  } catch (err) {
    console.error("Error guardando artículo:", err);
    throw err;
  }
}

export async function eliminarArticulo(idArticulo: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("ARTICULO" as any).delete().eq("IDARTICULO", idArticulo);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error eliminando artículo:", err);
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

// ==========================================
// SERVICIO DE FACTURACIÓN Y CAJAS (EXACTO A WINDEV)
// ==========================================
export async function generarNumeroFactura(nombreCaja = "SERVIDOR", prefijoDefault = "G"): Promise<string> {
  try {
    // 1. Consultar CAJAS para nombreCaja en Supabase o Local
    try {
      const { data: cajaRaw, error: errCaja } = await supabase
        .from("CAJAS" as any)
        .select("*")
        .eq("NOMBRECAJA", nombreCaja)
        .maybeSingle();

      const caja = cajaRaw as any;
      if (!errCaja && caja && caja.NUMERACION) {
        const nuevoNumero = (Number(caja.NUMERACION) || 0) + 1;
        const pfx = caja.PREFIJO || prefijoDefault;
        return `${pfx}${nuevoNumero}`;
      }
    } catch (e) {
      console.warn("Error consultando caja en Supabase:", e);
    }

    // 2. Fallback con Cajas de LocalStorage
    try {
      const rawCajas = localStorage.getItem("elegance_lista_cajas");
      if (rawCajas) {
        const list: any[] = JSON.parse(rawCajas);
        const cajaLocal = list.find((c) => c.NOMBRECAJA === nombreCaja);
        if (cajaLocal && cajaLocal.NUMERACION) {
          const nuevoNumero = (Number(cajaLocal.NUMERACION) || 0) + 1;
          const pfx = cajaLocal.PREFIJO || prefijoDefault;
          return `${pfx}${nuevoNumero}`;
        }
      }
    } catch {}

    // 3. Fallback con última factura en Supabase
    const { data } = await supabase
      .from("FACTURA" as any)
      .select("IDFACTURA, NUMEROFACT")
      .order("IDFACTURA", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastFact = data[0] as any;
      const numMatch = String(lastFact.NUMEROFACT || "").match(/\d+/);
      const ultimoNum = numMatch ? parseInt(numMatch[0], 10) + 1 : Number(lastFact.IDFACTURA) + 1;
      return `${prefijoDefault}${ultimoNum}`;
    }

    // 4. Fallback con local facturas
    const localFacts = getLocalFacturas();
    if (localFacts.length > 0) {
      const nextId = localFacts.length + 1;
      return `${prefijoDefault}${nextId}`;
    }

    return `${prefijoDefault}1`;
  } catch {
    const localFacts = getLocalFacturas();
    return `${prefijoDefault}${localFacts.length + 1}`;
  }
}

export async function registrarAlquilerFactura(
  facturaData: Omit<Factura, "IDFACTURA">,
  items: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[],
  nombreCaja = "SERVIDOR",
  prefijoDefault = "G"
): Promise<{ factura: Factura; items: CampoFactura[] }> {
  let sNumeroFactura = facturaData.NUMEROFACT || `${prefijoDefault}1`;
  
  try {
    // 1. Obtener y actualizar numeración de la caja en Supabase y Local
    try {
      const { data: cajaRaw } = await supabase
        .from("CAJAS" as any)
        .select("*")
        .eq("NOMBRECAJA", nombreCaja)
        .maybeSingle();

      const caja = cajaRaw as any;
      if (caja) {
        const nuevoNumero = (Number(caja.NUMERACION) || 0) + 1;
        const pfx = caja.PREFIJO || prefijoDefault;
        sNumeroFactura = `${pfx}${nuevoNumero}`;
        await supabase
          .from("CAJAS" as any)
          .update({ NUMERACION: nuevoNumero })
          .eq("IDCAJA", caja.IDCAJA || caja.IDCAJAS);
      }
    } catch (e) {
      console.warn("No se pudo actualizar CAJAS, usando número propuesto:", e);
    }

    // Actualizar también en LocalStorage
    try {
      const rawCajas = localStorage.getItem("elegance_lista_cajas");
      if (rawCajas) {
        const list: any[] = JSON.parse(rawCajas);
        const idx = list.findIndex((c) => c.NOMBRECAJA === nombreCaja);
        if (idx >= 0) {
          const nuevoNumero = (Number(list[idx].NUMERACION) || 0) + 1;
          list[idx].NUMERACION = nuevoNumero;
          localStorage.setItem("elegance_lista_cajas", JSON.stringify(list));
        }
      }
    } catch {}

    const facturaFinalData = {
      ...facturaData,
      NUMEROFACT: sNumeroFactura,
    };

    // 2. Insertar en tabla FACTURA de Supabase
    let facturaInsertada: any = null;
    try {
      const { data: facturaRaw, error: errorFactura } = await supabase
        .from("FACTURA" as any)
        .insert(facturaFinalData)
        .select()
        .single();

      if (!errorFactura && facturaRaw) {
        facturaInsertada = facturaRaw;
      }
    } catch (e) {
      console.warn("Fallo insert en FACTURA supabase, usando respaldo local:", e);
    }

    if (!facturaInsertada) {
      facturaInsertada = {
        ...facturaFinalData,
        IDFACTURA: Date.now(),
      };
    }

    // 3. Insertar los ítems en CAMPOFACTURA vinculados con IDFACTURA y NUMEROFACT
    const camposConFactura: CampoFactura[] = items.map((item, idx) => ({
      ...item,
      IDFACTURA: Number(facturaInsertada.IDFACTURA) || Date.now(),
      NUMEROFACT: sNumeroFactura,
      AUTOMATIC: idx + 1,
    }));

    try {
      await supabase.from("CAMPOFACTURA" as any).insert(camposConFactura);
    } catch (e) {
      console.warn("Fallo insert en CAMPOFACTURA supabase:", e);
    }

    // 4. Guardar copia de respaldo persistente 100% segura en LocalStorage
    saveLocalFactura(facturaInsertada as Factura, camposConFactura);

    // 5. Descontar Stock de cada ARTICULO en inventario
    for (const item of items) {
      if (item.DESCRIPCION) {
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

    return {
      factura: facturaInsertada as unknown as Factura,
      items: camposConFactura,
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
export async function buscarFacturaApartado(numeroFact: string): Promise<{
  factura: Factura | null;
  items: CampoFactura[];
  abonos: AbonoCliente[];
}> {
  try {
    const term = numeroFact.trim().toUpperCase();
    if (!term) return { factura: null, items: [], abonos: [] };

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

    // 2. Si no se encontró en Supabase o faltan ítems, buscar en LocalStorage
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
      return { factura: null, items: [], abonos: [] };
    }

    return {
      factura: facturaEncontrada as Factura,
      items: itemsEncontrados as CampoFactura[],
      abonos: abonosEncontrados as AbonoCliente[],
    };
  } catch (err) {
    console.error("Error buscando factura de apartado:", err);
    return { factura: null, items: [], abonos: [] };
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

    try {
      const { data: abono, error: errAbono } = await supabase
        .from("ABONO_CLIENTE" as any)
        .insert(abonoObj)
        .select()
        .single();

      if (!errAbono && abono) {
        // Actualizar FACTURA en Supabase
        await supabase
          .from("FACTURA" as any)
          .update({ TOTAL_SALDO: params.saldoDeber })
          .eq("NUMEROFACT", params.numeroFactura);
      }
    } catch (e) {
      console.warn("Fallo guardado de abono en Supabase, usando local:", e);
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

export async function registrarSalidaVestidoApartado(numeroFactura: string): Promise<boolean> {
  try {
    try {
      await supabase
        .from("FACTURA" as any)
        .update({ ESTADOCLIENTE: "ENTREGADO" })
        .eq("NUMEROFACT", numeroFactura);
    } catch (e) {
      console.warn("Error actualizando salida en Supabase:", e);
    }

    // Actualizar local
    const facts = getLocalFacturas();
    const factIdx = facts.findIndex((f) => f.NUMEROFACT === numeroFactura);
    if (factIdx >= 0 && facts[factIdx]) {
      facts[factIdx]!.ESTADOCLIENTE = "ENTREGADO";
      localStorage.setItem(KEY_LOCAL_FACTURAS, JSON.stringify(facts));
    }

    return true;
  } catch (err) {
    console.error("Error registrando salida de vestido:", err);
    return false;
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
