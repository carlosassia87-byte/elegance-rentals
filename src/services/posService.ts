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
    const { data, error } = await supabase
      .from("CLIENTES" as any)
      .insert({
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
      .select()
      .single();

    if (!error && data) return data as unknown as Cliente;
    return cliente as unknown as Cliente;
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
    let pfx = prefijoDefault;
    let maxNum = 0;

    // 1. Consultar CAJAS para nombreCaja en Supabase
    try {
      const { data: cajaRaw, error: errCaja } = await supabase
        .from("CAJAS" as any)
        .select("*")
        .eq("NOMBRECAJA", nombreCaja)
        .maybeSingle();

      const caja = cajaRaw as any;
      if (!errCaja && caja) {
        if (caja.PREFIJO) pfx = caja.PREFIJO;
        const numCaja = Number(caja.NUMERACION) || 0;
        if (numCaja > maxNum) maxNum = numCaja;
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
          if (cajaLocal.PREFIJO) pfx = cajaLocal.PREFIJO;
          const numLocal = Number(cajaLocal.NUMERACION) || 0;
          if (numLocal > maxNum) maxNum = numLocal;
        }
      }
    } catch {}

    // 3. Consultar FACTURA en Supabase para obtener el mayor número registrado
    try {
      const { data: facts } = await supabase
        .from("FACTURA" as any)
        .select("NUMEROFACT, IDFACTURA")
        .order("IDFACTURA", { ascending: false })
        .limit(200);

      if (facts && facts.length > 0) {
        for (const f of facts as any[]) {
          const numMatch = String(f.NUMEROFACT || "").match(/\d+/);
          if (numMatch) {
            const n = parseInt(numMatch[0], 10);
            if (!isNaN(n) && n > maxNum) {
              maxNum = n;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error consultando última factura:", e);
    }

    // 4. Consultar facturas locales en LocalStorage
    try {
      const localFacts = getLocalFacturas();
      for (const f of localFacts) {
        const numMatch = String(f.NUMEROFACT || "").match(/\d+/);
        if (numMatch) {
          const n = parseInt(numMatch[0], 10);
          if (!isNaN(n) && n > maxNum) {
            maxNum = n;
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

  const numMatch = String(sNumeroFactura).match(/\d+/);
  const numeroEntero = numMatch ? parseInt(numMatch[0], 10) : 1;

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

    // 3. Insertar en tabla FACTURA de Supabase en la nube
    let facturaInsertada: any = null;
    try {
      const { data: facturaRaw, error: errorFactura } = await supabase
        .from("FACTURA" as any)
        .insert(cleanFacturaData)
        .select()
        .single();

      if (!errorFactura && facturaRaw) {
        facturaInsertada = facturaRaw;
      } else if (errorFactura) {
        console.error("Error insertando FACTURA en Supabase:", errorFactura.message);
      }
    } catch (e: any) {
      console.error("Excepción insertando FACTURA en Supabase:", e?.message);
    }

    if (!facturaInsertada) {
      facturaInsertada = {
        ...cleanFacturaData,
        IDFACTURA: Date.now(),
      };
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

    // 5. Guardar copia de respaldo persistente en LocalStorage
    saveLocalFactura(facturaInsertada as Factura, camposParaSupabase as CampoFactura[]);

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
        totalDevuelto = depsRaw.reduce((acc, d: any) => acc + (Number(d.VALOR) || 0), 0);
      }
    } catch {}

    const rawLocalDeps = localStorage.getItem("elegance_local_depositos_entregados");
    if (rawLocalDeps) {
      try {
        const localDepsList: any[] = JSON.parse(rawLocalDeps);
        const matchDeps = localDepsList.filter((d) => d.NUMEROFACTURA === facturaEncontrada.NUMEROFACT);
        if (matchDeps.length > 0 && totalDevuelto === 0) {
          totalDevuelto = matchDeps.reduce((acc, d) => acc + (Number(d.VALOR) || 0), 0);
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
          ESTADOCLIENTE: "ENTREGADO",
          ESTADOFIN: "EN ALQUILER",
          MODO: "EN ALQUILER",
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
      facts[factIdx]!.ESTADOCLIENTE = "ENTREGADO";
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
