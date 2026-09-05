import React, { forwardRef } from "react";

export interface TicketItem {
  descripcion: string;
  accesorios?: string | string[];
  cantidad: number;
  valor: number;
  total: number;
}

export interface TicketFacturaProps {
  caja?: string;
  cliente?: string;
  cedula?: string;
  direccion?: string;
  telefono1?: string;
  telefono2?: string;
  formaPago?: string;
  tipo?: string;
  cajero?: string;
  recibo?: string;
  fecha?: string;
  items?: TicketItem[];
  valorAlquiler?: number;
  deposito?: number;
  totalAlqDep?: number;
  descuento?: number;
  recibi?: number;
  saldo?: number;
  fechaSalida?: string;
  fechaDevolucion?: string;
  esAbono?: boolean;
  etiquetaRecibi?: string;
  ocultarDescuentoCero?: boolean;
  recargoPorDia?: number;
  diasAlquiler?: number;
  direccionEmpresa?: string;
  ciudadEmpresa?: string;
  telefonosEmpresa?: string;
  instagram?: string;
  eslogan?: string;
}

// Formateador numérico exacto al modelo del POS: ej. 45.000,00
export function formatMonedaPOS(valor: number | undefined | null): string {
  const num = Number(valor) || 0;
  return num.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formateador sin decimales para tabla o resumen: ej. 45.000
export function formatEnteroPOS(valor: number | undefined | null): string {
  const num = Number(valor) || 0;
  return num.toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });
}

export const TicketFactura80mm = forwardRef<HTMLDivElement, TicketFacturaProps>(
  (
    {
      caja = "SERVIDOR",
      cliente = "CLIENTE GENERAL",
      cedula = "N/A",
      direccion = "DG 17",
      telefono1 = "1",
      telefono2 = "1",
      formaPago = "EFECTIVO",
      tipo = "ALQUILER",
      cajero = "SUPERVISOR",
      recibo = "G0000",
      fecha,
      items = [],
      valorAlquiler = 0,
      deposito = 0,
      totalAlqDep,
      descuento = 0,
      recibi = 0,
      saldo = 0,
      fechaSalida,
      fechaDevolucion,
      esAbono = false,
      etiquetaRecibi,
      ocultarDescuentoCero = false,
      recargoPorDia = 15000,
      diasAlquiler = 3,
      direccionEmpresa = "CRA 23 #15- 34",
      ciudadEmpresa = "BUCARAMANGA -SANTANDER",
      telefonosEmpresa = "6076963959 - 3202375610",
      instagram = "@LA CASADELDISFRAZOFICIAL",
      eslogan = "GRACIAS POR COMPRARLE A UNA EMPRESA SANTANDEREANA",
    },
    ref
  ) => {
    const totalCalculado = totalAlqDep ?? valorAlquiler + deposito;
    const fechaHoraActual =
      fecha ||
      new Date().toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

    const hoy = new Date().toLocaleDateString("es-CO");
    const salida = fechaSalida || hoy;
    const devolucion =
      fechaDevolucion ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + diasAlquiler);
        return d.toLocaleDateString("es-CO");
      })();

    return (
      <div
        ref={ref}
        id="ticket-pos-80mm"
        className="ticket-pos-root bg-white text-black font-mono select-text mx-auto"
        style={{
          width: "76mm",
          maxWidth: "76mm",
          padding: "2mm 1mm",
          fontSize: "11px",
          lineHeight: "1.25",
          color: "#000",
          fontFamily: "'Courier New', Courier, monospace",
          backgroundColor: "#fff",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* ========================================================
            1. LOGO DE LA CASA DEL DISFRAZ Y DATOS DE CABECERA
        ======================================================== */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <img
            src="/logo_casa_del_disfraz.jpg"
            alt="La Casa Del Disfraz"
            style={{
              width: "82%",
              maxHeight: "95px",
              objectFit: "contain",
              margin: "0 auto 4px auto",
              display: "block",
            }}
          />
          <div
            style={{
              fontWeight: "bold",
              fontSize: "10.5px",
              lineHeight: "1.25",
              textTransform: "uppercase",
            }}
          >
            <div>{direccionEmpresa}</div>
            <div>{ciudadEmpresa}</div>
            <div>{telefonosEmpresa}</div>
          </div>
        </div>

        {/* ========================================================
            2. DATOS DE CLIENTE, CAJA, PAGO Y FACTURA
        ======================================================== */}
        <div style={{ fontSize: "10.5px", marginTop: "6px", marginBottom: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>CAJA:</span>
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{caja}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>CLIENTE:</span>
            <span
              style={{
                fontWeight: "bold",
                textTransform: "uppercase",
                maxWidth: "60%",
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={cliente}
            >
              {cliente}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>CÉDULA:</span>
            <span style={{ fontWeight: "normal" }}>{cedula}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>DIRECCIÓN:</span>
            <span style={{ fontWeight: "normal", textTransform: "uppercase" }}>{direccion}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>TELEFONO 1:</span>
            <span style={{ fontWeight: "normal" }}>{telefono1}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>TELEFONO 2:</span>
            <span style={{ fontWeight: "normal" }}>{telefono2}</span>
          </div>

          <div style={{ height: "4px" }} />

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>F_PAGO</span>
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{formaPago}-</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>TIPO :</span>
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{tipo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>CAJERO:</span>
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{cajero}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>RECIBO :</span>
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{recibo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "normal" }}>FECHA :</span>
            <span style={{ fontWeight: "normal" }}>{fechaHoraActual}</span>
          </div>
        </div>

        {/* LÍNEA DIVISORIA */}
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #000",
            margin: "4px 0",
          }}
        />

        {/* ========================================================
            3. TABLA DE ARTÍCULOS
        ======================================================== */}
        <div style={{ fontSize: "10px", margin: "2px 0 4px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 28px 48px 52px",
              fontWeight: "bold",
              textAlign: "right",
              borderBottom: "1px solid #000",
              paddingBottom: "2px",
              marginBottom: "4px",
            }}
          >
            <div style={{ textAlign: "left" }}>DESCRIPCION</div>
            <div style={{ textAlign: "center", lineHeight: "1" }}>
              CANT<br />IDAD
            </div>
            <div>VALOR</div>
            <div>TOTAL</div>
          </div>

          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4px 0", fontStyle: "italic" }}>
              (Sin artículos registrados)
            </div>
          ) : (
            items.map((it, idx) => {
              // Si trae accesorios en string o array
              const accesoriosList = Array.isArray(it.accesorios)
                ? it.accesorios
                : typeof it.accesorios === "string" && it.accesorios.trim()
                ? it.accesorios.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div key={idx} style={{ marginBottom: "4px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 28px 48px 52px",
                      textAlign: "right",
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "left",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        wordBreak: "break-word",
                      }}
                    >
                      {it.descripcion}
                    </div>
                    <div style={{ textAlign: "center", fontWeight: "bold" }}>
                      {it.cantidad}
                    </div>
                    <div>{formatEnteroPOS(it.valor)}</div>
                    <div style={{ fontWeight: "bold" }}>{formatEnteroPOS(it.total)}</div>
                  </div>

                  {/* Accesorios o complementos listados debajo */}
                  {accesoriosList.map((acc, aIdx) => (
                    <div
                      key={aIdx}
                      style={{
                        textAlign: "left",
                        fontSize: "9.5px",
                        paddingLeft: "4px",
                        textTransform: "uppercase",
                        color: "#222",
                      }}
                    >
                      {acc}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* LÍNEA DIVISORIA */}
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #000",
            margin: "4px 0",
          }}
        />

        {/* ========================================================
            4. TOTALES Y LIQUIDACIÓN FINANCIERA
        ======================================================== */}
        <div
          style={{
            fontSize: "10.5px",
            fontWeight: "normal",
            textAlign: "right",
            lineHeight: "1.35",
            margin: "4px 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>VALOR ALQUILER:</span>
            <span style={{ fontWeight: "bold" }}>{formatMonedaPOS(valorAlquiler)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>DEPOSITO:</span>
            <span style={{ fontWeight: "bold" }}>{formatMonedaPOS(deposito)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>TOTAL alq+dep :</span>
            <span style={{ fontWeight: "bold" }}>{formatMonedaPOS(totalCalculado)}</span>
          </div>
          {(!esAbono && !ocultarDescuentoCero) || descuento > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>DESCUENTO</span>
              <span style={{ fontWeight: "bold" }}>{formatMonedaPOS(descuento)}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{etiquetaRecibi || (esAbono ? "RECIBI ABONO" : "RECIBI")}</span>
            <span style={{ fontWeight: "bold" }}>{formatMonedaPOS(recibi)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>SALDO</span>
            <span style={{ fontWeight: "bold" }}>{formatMonedaPOS(saldo)}</span>
          </div>
        </div>

        {/* BANDA DE ASTERISCOS */}
        <div
          style={{
            textAlign: "center",
            letterSpacing: "-1px",
            fontSize: "10px",
            fontWeight: "bold",
            overflow: "hidden",
            whiteSpace: "nowrap",
            margin: "2px 0",
          }}
        >
          **********************************************************
        </div>

        {/* ========================================================
            5. FECHAS DE SALIDA Y DEVOLUCIÓN DE TRAJE
        ======================================================== */}
        <div
          style={{
            fontSize: "10.5px",
            fontWeight: "bold",
            lineHeight: "1.25",
            margin: "3px 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>FECHA DE SALIDA DE TRAJE</span>
            <span>{salida}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <span>FECHA DE DEVOLUCION</span>
              <br />
              <span>TRAJE</span>
            </div>
            <div style={{ alignSelf: "flex-start" }}>{devolucion}</div>
          </div>
        </div>

        {/* SEGUNDA BANDA DE ASTERISCOS */}
        <div
          style={{
            textAlign: "center",
            letterSpacing: "-1px",
            fontSize: "10px",
            fontWeight: "bold",
            overflow: "hidden",
            whiteSpace: "nowrap",
            margin: "2px 0 4px 0",
          }}
        >
          ****************************************************************
        </div>

        {/* ========================================================
            6. CONDICIONES DE SERVICIO EXACTAS
        ======================================================== */}
        <div
          style={{
            fontSize: "9.5px",
            lineHeight: "1.25",
            textAlign: "left",
            margin: "4px 0",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>Condiciones de servicio:</div>
          <div style={{ marginBottom: "3px" }}>
            - Tiempo de alquiler {diasAlquiler} días. Por devoluciones hechas después de la fecha se cobrará un
            recargo de ${formatEnteroPOS(recargoPorDia)} por día.
          </div>
          <div style={{ marginBottom: "3px" }}>
            -Favor conservar este recibo para efectuar la devolución de dinero que ha dejado como
            depósito.
          </div>
          <div>- Nó se hace devolución de dinero una vez elaborado este RECIBO.</div>
        </div>

        {/* ========================================================
            7. INSTAGRAM & ESLOGAN
        ======================================================== */}
        <div style={{ textAlign: "center", marginTop: "8px", marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontWeight: "bold",
              fontSize: "10px",
            }}
          >
            <svg
              style={{ width: "13px", height: "13px", fill: "currentColor" }}
              viewBox="0 0 24 24"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <span>INSTAGRAM:{instagram}</span>
          </div>

          <div
            style={{
              fontWeight: "bold",
              fontSize: "10.5px",
              lineHeight: "1.25",
              marginTop: "8px",
              padding: "0 4px",
            }}
          >
            "{eslogan}"
          </div>
        </div>

        {/* ========================================================
            8. LÍNEA DE FIRMA
        ======================================================== */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <div
            style={{
              borderTop: "1px solid #000",
              width: "85%",
              margin: "0 auto 4px auto",
            }}
          />
          <div style={{ fontSize: "10px", fontWeight: "normal" }}>Nombre y Cedula</div>
        </div>
      </div>
    );
  }
);

TicketFactura80mm.displayName = "TicketFactura80mm";

// Helper universal para disparar impresión de tirilla 80mm de forma limpia
export function imprimirTicketPOS80mm(ticketElement: HTMLElement | null, titulo: string = "Recibo POS") {
  if (!ticketElement) {
    window.print();
    return;
  }

  const printContent = ticketElement.innerHTML;
  const printWindow = window.open("", "_blank", "width=420,height=700");

  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${titulo}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 2mm 1mm;
            }
            @media print {
              html, body {
                width: 80mm;
                margin: 0;
                padding: 0;
                background: #fff;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: 11px;
              line-height: 1.25;
              color: #000;
              margin: 0;
              padding: 2mm 1mm;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            img {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div style="width: 76mm; max-width: 76mm; margin: 0 auto;">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    window.print();
  }
}
