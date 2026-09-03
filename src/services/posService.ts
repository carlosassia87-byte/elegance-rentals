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
    return data as Cliente | null;
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
    return (data as Cliente[]) ?? [];
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
      return data as Cliente;
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
      return data as Cliente;
    }
  } catch (err) {
    console.error("Error guardando cliente:", err);
    return cliente as Cliente;
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
    return (data as Articulo[]) ?? [];
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
    return data as Articulo | null;
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
      return data as Articulo;
    } else {
      const { data, error } = await supabase
        .from("ARTICULO" as any)
        .insert(articulo)
        .select()
        .single();
      if (error) throw error;
      return data as Articulo;
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

// ==========================================
// SERVICIO DE FACTURACIÓN Y CAJAS (EXACTO A WINDEV)
// ==========================================
export async function generarNumeroFactura(nombreCaja = "SERVIDOR"): Promise<string> {
  try {
    // 1. Consultar CAJAS para nombreCaja "SERVIDOR"
    const { data: caja, error: errCaja } = await supabase
      .from("CAJAS" as any)
      .select("*")
      .eq("NOMBRECAJA", nombreCaja)
      .maybeSingle();

    if (!errCaja && caja) {
      const nuevoNumero = (Number(caja.NUMERACION) || 0) + 1;
      return `G${nuevoNumero}`;
    }

    // 2. Fallback con última factura
    const { data } = await supabase
      .from("FACTURA" as any)
      .select("IDFACTURA, NUMEROFACT")
      .order("IDFACTURA", { ascending: false })
      .limit(1);

    const ultimoId = data && data.length > 0 ? Number(data[0].IDFACTURA) + 1 : 1;
    return `G${ultimoId}`;
  } catch {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `G${random}`;
  }
}

export async function registrarAlquilerFactura(
  facturaData: Omit<Factura, "IDFACTURA">,
  items: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[],
  nombreCaja = "SERVIDOR"
): Promise<{ factura: Factura; items: CampoFactura[] }> {
  try {
    // 1. Obtener y actualizar numeración de la caja "SERVIDOR"
    let sNumeroFactura = facturaData.NUMEROFACT;
    try {
      const { data: caja } = await supabase
        .from("CAJAS" as any)
        .select("*")
        .eq("NOMBRECAJA", nombreCaja)
        .maybeSingle();

      if (caja) {
        const nuevoNumero = (Number(caja.NUMERACION) || 0) + 1;
        sNumeroFactura = `G${nuevoNumero}`;
        await supabase
          .from("CAJAS" as any)
          .update({ NUMERACION: nuevoNumero })
          .eq("IDCAJA", caja.IDCAJA);
      }
    } catch (e) {
      console.warn("No se pudo actualizar CAJAS, usando número propuesto:", e);
    }

    const facturaFinalData = {
      ...facturaData,
      NUMEROFACT: sNumeroFactura,
    };

    // 2. Insertar en tabla FACTURA
    const { data: factura, error: errorFactura } = await supabase
      .from("FACTURA" as any)
      .insert(facturaFinalData)
      .select()
      .single();

    if (errorFactura) throw errorFactura;

    // 3. Insertar los ítems en CAMPOFACTURA vinculados con IDFACTURA y NUMEROFACT
    const camposConFactura = items.map((item) => ({
      ...item,
      IDFACTURA: factura.IDFACTURA,
      NUMEROFACT: sNumeroFactura,
    }));

    const { data: camposInsertados, error: errorCampos } = await supabase
      .from("CAMPOFACTURA" as any)
      .insert(camposConFactura)
      .select();

    if (errorCampos) throw errorCampos;

    // 4. Descontar Stock de cada ARTICULO en inventario
    for (const item of items) {
      if (item.DESCRIPCION) {
        try {
          const { data: art } = await supabase
            .from("ARTICULO" as any)
            .select("*")
            .eq("DESCRIPCION", item.DESCRIPCION)
            .maybeSingle();

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
      factura: factura as Factura,
      items: (camposInsertados as CampoFactura[]) ?? [],
    };
  } catch (err) {
    console.error("Error al registrar factura de alquiler:", err);
    throw err;
  }
}

// ==========================================
// DEVOLUCIÓN DE VESTIDO Y DEPÓSITO
// ==========================================
export async function registrarDevolucionVestido(params: {
  numeroFactura: string;
  valorDepositoDevuelto: number;
  observaciones?: string;
}): Promise<DepositoEntregado> {
  try {
    const { data, error } = await supabase
      .from("DEPOSITOS_ENTREGADOS" as any)
      .insert({
        NUMEROFACT: params.numeroFactura,
        VALORDEPOSITO: params.valorDepositoDevuelto,
        FECHA: new Date().toISOString().split("T")[0],
        OBSERVACIONES: params.observaciones || "Devolución en POS",
      })
      .select()
      .single();

    if (error) throw error;
    return data as DepositoEntregado;
  } catch (err) {
    console.error("Error en registrarDevolucionVestido:", err);
    throw err;
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
    const { data: factura, error: errFactura } = await supabase
      .from("FACTURA" as any)
      .select("*")
      .ilike("NUMEROFACT", `%${numeroFact.trim()}%`)
      .maybeSingle();

    if (errFactura || !factura) {
      return { factura: null, items: [], abonos: [] };
    }

    const { data: items } = await supabase
      .from("CAMPOFACTURA" as any)
      .select("*")
      .eq("NUMEROFACT", (factura as any).NUMEROFACT);

    const { data: abonos } = await supabase
      .from("ABONO_CLIENTE" as any)
      .select("*")
      .eq("AFACTURA", (factura as any).NUMEROFACT)
      .order("IDABONO_CLIENTE", { ascending: true });

    return {
      factura: factura as Factura,
      items: (items as CampoFactura[]) ?? [],
      abonos: (abonos as AbonoCliente[]) ?? [],
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
  fecha?: string;
}): Promise<AbonoCliente | null> {
  try {
    const numeroAbono = `AB-${Date.now()}`;
    const fecha = params.fecha || new Date().toISOString().split("T")[0];

    const { data: abono, error: errAbono } = await supabase
      .from("ABONO_CLIENTE" as any)
      .insert({
        NUMEROABONO: numeroAbono,
        ACLIENTE: params.cliente,
        AFACTURA: params.numeroFactura,
        PAGOEFECTIVO: params.pagoEfectivo,
        PAGOTRANFE: params.pagoTransferencia,
        FECHAABONO: fecha,
        SALDOANTERIOR: params.saldoAnterior,
        SALDODEBER: params.saldoDeber,
        TOTAL_ABONO: params.totalAbono,
      })
      .select()
      .single();

    if (errAbono) throw errAbono;

    // Actualizar FACTURA con el saldo acumulado
    await supabase
      .from("FACTURA" as any)
      .update({
        TOTAL_SALDO: params.saldoDeber,
      })
      .eq("NUMEROFACT", params.numeroFactura);

    return abono as AbonoCliente;
  } catch (err) {
    console.error("Error registrando abono cliente:", err);
    throw err;
  }
}

export async function registrarSalidaVestidoApartado(numeroFactura: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("FACTURA" as any)
      .update({
        ESTADOCLIENTE: "ENTREGADO",
      })
      .eq("NUMEROFACT", numeroFactura);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error registrando salida de vestido:", err);
    return false;
  }
}

