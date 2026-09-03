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
    if (cliente.IDCLIENTES) {
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
    throw err;
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
    const { data, error } = await query.limit(50);
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
    if (articulo.IDARTICULO) {
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
// SERVICIO DE FACTURACIÓN Y ALQUILERES (POS)
// ==========================================
export async function generarNumeroFactura(prefijo = "ALQ"): Promise<string> {
  try {
    const { data } = await supabase
      .from("FACTURA" as any)
      .select("IDFACTURA, NUMEROFACT")
      .order("IDFACTURA", { ascending: false })
      .limit(1);

    const ultimoId = data && data.length > 0 ? Number(data[0].IDFACTURA) + 1 : 1;
    return `${prefijo}-${String(ultimoId).padStart(6, "0")}`;
  } catch {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `${prefijo}-${random}`;
  }
}

export async function registrarAlquilerFactura(
  facturaData: Omit<Factura, "IDFACTURA">,
  items: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[]
): Promise<{ factura: Factura; items: CampoFactura[] }> {
  try {
    // 1. Insertar en tabla FACTURA
    const { data: factura, error: errorFactura } = await supabase
      .from("FACTURA" as any)
      .insert(facturaData)
      .select()
      .single();

    if (errorFactura) throw errorFactura;

    // 2. Insertar los ítems en CAMPOFACTURA vinculados con IDFACTURA
    const camposConFactura = items.map((item) => ({
      ...item,
      IDFACTURA: factura.IDFACTURA,
      NUMEROFACT: factura.NUMEROFACT,
    }));

    const { data: camposInsertados, error: errorCampos } = await supabase
      .from("CAMPOFACTURA" as any)
      .insert(camposConFactura)
      .select();

    if (errorCampos) throw errorCampos;

    // 3. Descontar Stock si aplica
    for (const item of items) {
      if (item.BARRAS && item.BARRAS !== "0") {
        const art = await buscarArticuloPorCodigoBarras(item.BARRAS);
        if (art && art.STOCK > 0) {
          await supabase
            .from("ARTICULO" as any)
            .update({ STOCK: Math.max(0, art.STOCK - item.CANTIDAD) })
            .eq("IDARTICULO", art.IDARTICULO);
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
      .from("depositoentregado" as any)
      .insert({
        NUMEROFACTURA: params.numeroFactura,
        VALOR: params.valorDepositoDevuelto,
        FECHA: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar estado de la factura
    await supabase
      .from("FACTURA" as any)
      .update({
        ESTADOCLIENTE: "DEVUELTO",
      })
      .eq("NUMEROFACT", params.numeroFactura);

    return data as DepositoEntregado;
  } catch (err) {
    console.error("Error al registrar devolución de vestido:", err);
    throw err;
  }
}

// ==========================================
// REGISTRO DE GASTOS
// ==========================================
export async function registrarGasto(gasto: Omit<Gasto, "IDgastos">): Promise<Gasto> {
  try {
    const { data, error } = await supabase
      .from("gastos" as any)
      .insert(gasto)
      .select()
      .single();

    if (error) throw error;
    return data as Gasto;
  } catch (err) {
    console.error("Error registrando gasto:", err);
    throw err;
  }
}

// ==========================================
// REGISTRO DE ABONO A SALDO
// ==========================================
export async function registrarAbono(abono: Omit<AbonoCliente, "IDABONO_CLIENTE">): Promise<AbonoCliente> {
  try {
    const { data, error } = await supabase
      .from("ABONO_CLIENTE" as any)
      .insert(abono)
      .select()
      .single();

    if (error) throw error;
    return data as AbonoCliente;
  } catch (err) {
    console.error("Error registrando abono:", err);
    throw err;
  }
}
