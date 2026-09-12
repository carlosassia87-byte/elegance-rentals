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
    const saldoCalculado =
      saldo !== undefined && saldo !== null && (saldo > 0 || (recibi || 0) >= totalCalculado)
        ? saldo
        : Math.max(0, totalCalculado - (recibi || 0) - (descuento || 0));
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
        className="ticket-pos-root bg-white text-black select-text mx-auto"
        style={{
          width: "76mm",
          maxWidth: "76mm",
          padding: "2mm 1mm",
          fontSize: "13px",
          lineHeight: "1.35",
          color: "#000000",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: "#ffffff",
          fontWeight: 700,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* ========================================================
            1. LOGO DE LA CASA DEL DISFRAZ Y DATOS DE CABECERA
        ======================================================== */}
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <img
            src="/logo_casa_del_disfraz.jpg"
            alt="La Casa Del Disfraz"
            style={{
              width: "86%",
              maxHeight: "105px",
              objectFit: "contain",
              margin: "0 auto 6px auto",
              display: "block",
              filter: "contrast(125%) brightness(95%)",
            }}
          />
          <div
            style={{
              fontWeight: 800,
              fontSize: "12.5px",
              lineHeight: "1.3",
              textTransform: "uppercase",
              color: "#000000",
            }}
          >
            <div>{direccionEmpresa}</div>
            <div>{ciudadEmpresa}</div>
            <div>{telefonosEmpresa}</div>
          </div>
        </div>

        {/* LÍNEA DIVISORIA GRUESA */}
        <hr
          style={{
            border: "none",
            borderTop: "2px solid #000000",
            margin: "5px 0",
          }}
        />

        {/* ========================================================
            2. DATOS DE CLIENTE, CAJA, PAGO Y FACTURA
        ======================================================== */}
        <div style={{ fontSize: "13px", marginTop: "4px", marginBottom: "6px", color: "#000000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>CAJA:</span>
            <span style={{ fontWeight: 900, textTransform: "uppercase" }}>{caja}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>CLIENTE:</span>
            <span
              style={{
                fontWeight: 900,
                textTransform: "uppercase",
                maxWidth: "65%",
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
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>CÉDULA:</span>
            <span style={{ fontWeight: 800 }}>{cedula}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>DIRECCIÓN:</span>
            <span style={{ fontWeight: 800, textTransform: "uppercase", maxWidth: "60%", textAlign: "right" }}>{direccion}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>TELÉFONO 1:</span>
            <span style={{ fontWeight: 800 }}>{telefono1}</span>
          </div>
          {telefono2 && telefono2 !== "1" && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontWeight: 700 }}>TELÉFONO 2:</span>
              <span style={{ fontWeight: 800 }}>{telefono2}</span>
            </div>
          )}

          <div style={{ height: "4px" }} />

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>F_PAGO:</span>
            <span style={{ fontWeight: 900, textTransform: "uppercase" }}>{formaPago}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>TIPO:</span>
            <span style={{ fontWeight: 900, textTransform: "uppercase" }}>{tipo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>CAJERO:</span>
            <span style={{ fontWeight: 900, textTransform: "uppercase" }}>{cajero}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 800, fontSize: "14px" }}>RECIBO N°:</span>
            <span style={{ fontWeight: 900, fontSize: "14px", textTransform: "uppercase" }}>{recibo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>FECHA:</span>
            <span style={{ fontWeight: 800 }}>{fechaHoraActual}</span>
          </div>
        </div>

        {/* LÍNEA DIVISORIA GRUESA */}
        <hr
          style={{
            border: "none",
            borderTop: "2px solid #000000",
            margin: "6px 0",
          }}
        />

        {/* ========================================================
            3. TABLA DE ARTÍCULOS
        ======================================================== */}
        <div style={{ fontSize: "13px", margin: "4px 0 6px 0", color: "#000000" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 36px 54px 62px",
              fontWeight: 900,
              fontSize: "12.5px",
              textAlign: "right",
              borderBottom: "1.5px solid #000000",
              paddingBottom: "3px",
              marginBottom: "5px",
              color: "#000000",
            }}
          >
            <div style={{ textAlign: "left" }}>DESCRIPCIÓN</div>
            <div style={{ textAlign: "center", lineHeight: "1.1" }}>CANT</div>
            <div>VALOR</div>
            <div>TOTAL</div>
          </div>

          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "6px 0", fontWeight: 800 }}>
              (Sin artículos registrados)
            </div>
          ) : (
            items.map((it, idx) => {
              const accesoriosList = Array.isArray(it.accesorios)
                ? it.accesorios
                : typeof it.accesorios === "string" && it.accesorios.trim()
                ? it.accesorios.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div key={idx} style={{ marginBottom: "6px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 36px 54px 62px",
                      textAlign: "right",
                      alignItems: "start",
                      fontSize: "13px",
                      color: "#000000",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "left",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        wordBreak: "break-word",
                        lineHeight: "1.2",
                      }}
                    >
                      {it.descripcion}
                    </div>
                    <div style={{ textAlign: "center", fontWeight: 900, fontSize: "13.5px" }}>
                      {it.cantidad}
                    </div>
                    <div style={{ fontWeight: 800 }}>{formatEnteroPOS(it.valor)}</div>
                    <div style={{ fontWeight: 900 }}>{formatEnteroPOS(it.total)}</div>
                  </div>

                  {/* Accesorios o complementos listados debajo */}
                  {accesoriosList.length > 0 && (
                    <div style={{ marginTop: "2px", paddingLeft: "6px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 900, color: "#000000", textTransform: "uppercase" }}>
                        PIEZAS / ACCESORIOS:
                      </div>
                      {accesoriosList.map((acc, aIdx) => (
                        <div
                          key={aIdx}
                          style={{
                            textAlign: "left",
                            fontSize: "11.5px",
                            fontWeight: 800,
                            paddingLeft: "4px",
                            textTransform: "uppercase",
                            color: "#000000",
                            lineHeight: "1.25",
                          }}
                        >
                          • {acc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* LÍNEA DIVISORIA GRUESA */}
        <hr
          style={{
            border: "none",
            borderTop: "2px solid #000000",
            margin: "6px 0",
          }}
        />

        {/* ========================================================
            4. TOTALES Y LIQUIDACIÓN FINANCIERA
        ======================================================== */}
        <div
          style={{
            fontSize: "13.5px",
            color: "#000000",
            textAlign: "right",
            lineHeight: "1.4",
            margin: "6px 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>VALOR ALQUILER:</span>
            <span style={{ fontWeight: 900 }}>{formatMonedaPOS(valorAlquiler)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontWeight: 700 }}>DEPÓSITO:</span>
            <span style={{ fontWeight: 900 }}>{formatMonedaPOS(deposito)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "3px",
              paddingTop: "2px",
              borderTop: "1.5px dashed #000000",
              fontSize: "14.5px",
            }}
          >
            <span style={{ fontWeight: 900 }}>TOTAL ALQ + DEP:</span>
            <span style={{ fontWeight: 900 }}>{formatMonedaPOS(totalCalculado)}</span>
          </div>
          {(!esAbono && !ocultarDescuentoCero) || descuento > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontWeight: 700 }}>DESCUENTO:</span>
              <span style={{ fontWeight: 900 }}>{formatMonedaPOS(descuento)}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "14.5px" }}>
            <span style={{ fontWeight: 800 }}>{etiquetaRecibi || (esAbono ? "RECIBÍ ABONO:" : "RECIBÍ:")}</span>
            <span style={{ fontWeight: 900 }}>{formatMonedaPOS(recibi)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "2px",
              paddingTop: "2px",
              borderTop: "1.5px solid #000000",
              fontSize: "15px",
            }}
          >
            <span style={{ fontWeight: 900 }}>SALDO PENDIENTE:</span>
            <span style={{ fontWeight: 900 }}>{formatMonedaPOS(saldoCalculado)}</span>
          </div>
        </div>

        {/* BANDA DE SEPARACIÓN */}
        <div
          style={{
            textAlign: "center",
            letterSpacing: "1px",
            fontSize: "12px",
            fontWeight: 900,
            overflow: "hidden",
            whiteSpace: "nowrap",
            margin: "4px 0",
            color: "#000000",
          }}
        >
          =====================================
        </div>

        {/* ========================================================
            5. FECHAS DE SALIDA Y DEVOLUCIÓN DE TRAJE
        ======================================================== */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: 800,
            lineHeight: "1.35",
            margin: "4px 0",
            color: "#000000",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span>FECHA DE SALIDA DE TRAJE:</span>
            <span style={{ fontWeight: 900 }}>{salida}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>FECHA DEVOLUCIÓN TRAJE:</span>
            <span style={{ fontWeight: 900 }}>{devolucion}</span>
          </div>
        </div>

        {/* SEGUNDA BANDA DE SEPARACIÓN */}
        <div
          style={{
            textAlign: "center",
            letterSpacing: "1px",
            fontSize: "12px",
            fontWeight: 900,
            overflow: "hidden",
            whiteSpace: "nowrap",
            margin: "4px 0 6px 0",
            color: "#000000",
          }}
        >
          =====================================
        </div>

        {/* ========================================================
            6. CONDICIONES DE SERVICIO EXACTAS
        ======================================================== */}
        <div
          style={{
            fontSize: "11px",
            lineHeight: "1.3",
            textAlign: "left",
            margin: "6px 0",
            color: "#000000",
            fontWeight: 700,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: "11.5px", marginBottom: "3px", textTransform: "uppercase" }}>
            Condiciones del servicio:
          </div>
          <div style={{ marginBottom: "4px" }}>
            • Tiempo de alquiler {diasAlquiler} días. Por devoluciones hechas después de la fecha se cobrará un
            recargo de ${formatEnteroPOS(recargoPorDia)} por día.
          </div>
          <div style={{ marginBottom: "4px" }}>
            • Favor conservar este recibo para efectuar la devolución del dinero dejado como depósito.
          </div>
          <div>• No se hace devolución de dinero una vez elaborado este RECIBO.</div>
        </div>

        {/* ========================================================
            7. INSTAGRAM & ESLOGAN
        ======================================================== */}
        <div style={{ textAlign: "center", marginTop: "10px", marginBottom: "16px", color: "#000000" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              fontWeight: 900,
              fontSize: "12px",
            }}
          >
            <span>INSTAGRAM: {instagram}</span>
          </div>

          <div
            style={{
              fontWeight: 900,
              fontSize: "12px",
              lineHeight: "1.3",
              marginTop: "8px",
              padding: "0 2px",
              textTransform: "uppercase",
            }}
          >
            "{eslogan}"
          </div>
        </div>

        {/* ========================================================
            8. LÍNEA DE FIRMA
        ======================================================== */}
        <div style={{ marginTop: "36px", textAlign: "center", color: "#000000" }}>
          <div
            style={{
              borderTop: "2px solid #000000",
              width: "85%",
              margin: "0 auto 5px auto",
            }}
          />
          <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>Firma, Nombre y Cédula del Cliente</div>
        </div>
      </div>
    );
  }
);

TicketFactura80mm.displayName = "TicketFactura80mm";

// Helper universal para disparar impresión de tirilla 80mm de forma limpia y nítida
export function imprimirTicketPOS80mm(ticketElement: HTMLElement | null, titulo: string = "Recibo POS") {
  if (!ticketElement) {
    window.print();
    return;
  }

  const printContent = ticketElement.innerHTML;
  const printWindow = window.open("", "_blank", "width=450,height=750");

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
              margin: 1.5mm 1mm;
            }
            @media print {
              html, body {
                width: 80mm;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color: #000000 !important;
              }
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 13px;
              font-weight: 700;
              line-height: 1.35;
              color: #000000 !important;
              margin: 0;
              padding: 2mm 1mm;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            img {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              filter: contrast(125%) brightness(95%);
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div style="width: 76mm; max-width: 76mm; margin: 0 auto; color: #000000;">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 600);
              }, 300);
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

// Helper universal para imprimir cualquier Reporte en formato Tirilla 80mm con contraste profesional
export function imprimirReporte80mmHtml(titulo: string, contenidoHtml: string) {
  const printWindow = window.open("", "_blank", "width=450,height=750");

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
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color: #000000 !important;
              }
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 13px;
              font-weight: 700;
              line-height: 1.35;
              color: #000000 !important;
              margin: 0;
              padding: 2mm 1.5mm;
              background: #ffffff;
            }
            * {
              box-sizing: border-box;
              color: #000000 !important;
            }
            h1, h2, h3, h4 {
              margin: 2px 0;
              font-weight: 900;
              text-transform: uppercase;
              color: #000000 !important;
            }
            hr {
              border: none;
              border-top: 2px solid #000000;
              margin: 5px 0;
            }
            .border-b {
              border-bottom: 1.5px solid #000000;
            }
            .grid-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
              font-size: 13px;
            }
            .bold {
              font-weight: 900;
            }
          </style>
        </head>
        <body>
          <div style="width: 76mm; max-width: 76mm; margin: 0 auto; color: #000000;">
            ${contenidoHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 600);
              }, 300);
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
