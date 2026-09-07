import { supabase } from "@/integrations/supabase/client";

/**
 * Comprime una imagen en el cliente antes de subirla para que cargue ultra rápido en la web.
 */
export async function comprimirImagen(file: File, maxDim = 1200, calidad = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener contexto 2D del Canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          "image/jpeg",
          calidad
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Sube una foto de artículo desde el computador local a Supabase Storage (bucket articulos_fotos)
 * o devuelve una dataURL optimizada en caso de fallback.
 */
export async function subirFotoArticulo(file: File, codigoBarras = "ART"): Promise<string> {
  try {
    const { blob, dataUrl } = await comprimirImagen(file, 1200, 0.85);

    const ext = "jpg";
    const cleanCod = codigoBarras.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `articulos/${cleanCod}_${Date.now()}.${ext}`;

    // 1. Intentar subir al bucket de Supabase
    try {
      const { data, error } = await supabase.storage
        .from("articulos_fotos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from("articulos_fotos")
          .getPublicUrl(data.path);

        if (publicUrlData && publicUrlData.publicUrl) {
          return publicUrlData.publicUrl;
        }
      } else if (error) {
        console.warn("Aviso al subir foto a Supabase Storage (usando fallback dataURL):", error.message);
      }
    } catch (storageErr) {
      console.warn("Excepción en Supabase Storage, usando dataURL local:", storageErr);
    }

    // 2. Fallback: devolver DataURL comprimida para persistencia directa
    return dataUrl;
  } catch (err) {
    console.error("Error procesando imagen local:", err);
    throw new Error("No se pudo procesar la imagen seleccionada.");
  }
}
