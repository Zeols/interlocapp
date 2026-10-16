/**
 * Utilidades para procesamiento, recorte centrado y compresión de fotos de perfil en el cliente.
 * Optimizado para compatibilidad con dispositivos móviles (iOS / Android) y navegadores desktop.
 * Genera una versión WebP/JPEG optimizada (256x256 px) lista para persistirse como Data URL.
 */

export interface ProcessImageOptions {
  targetSize?: number; // Tamaño cuadrado en píxeles (por defecto 256)
  quality?: number; // Calidad de compresión WebP 0-1 (por defecto 0.85)
  maxInputBytes?: number; // Límite de tamaño de archivo entrante (por defecto 15MB para soportar fotos de móviles)
}

/**
 * Función auxiliar para dibujar en canvas centrado y exportar a WebP/JPEG optimizado
 */
function drawCropAndExport(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  quality: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el procesador de gráficos 2D.");
  }

  // Suavizado de bordes para alta calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Calcular recorte centrado 1:1
  const minDim = Math.min(sourceWidth, sourceHeight);
  const sourceX = (sourceWidth - minDim) / 2;
  const sourceY = (sourceHeight - minDim) / 2;

  ctx.drawImage(
    source,
    sourceX,
    sourceY,
    minDim,
    minDim,
    0,
    0,
    targetSize,
    targetSize
  );

  // Exportar a WebP (con fallback automático a JPEG de alta fidelidad si no está soportado)
  let dataUrl = canvas.toDataURL("image/webp", quality);
  if (!dataUrl.startsWith("data:image/webp")) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

/**
 * Procesa un archivo de imagen en el cliente:
 * - Valida tipo de archivo y tamaño (hasta 15 MB para fotos de smartphone).
 * - Utiliza múltiples estrategias resilientes:
 *   1) createImageBitmap (nativa y eficiente en móviles modernos con orientación EXIF).
 *   2) URL.createObjectURL + HTMLImageElement (estándar compatible con todos los navegadores).
 *   3) FileReader.readAsDataURL (fallback seguro).
 * - Realiza recorte centrado 1:1 y exporta optimizado.
 */
export async function processAvatarImage(
  file: File,
  options: ProcessImageOptions = {}
): Promise<string> {
  const {
    targetSize = 256,
    quality = 0.85,
    maxInputBytes = 15 * 1024 * 1024, // 15 MB
  } = options;

  if (!file) {
    throw new Error("No se ha seleccionado ningún archivo de imagen.");
  }

  if (file.size === 0) {
    throw new Error("El archivo de imagen está vacío o el permiso de acceso fue denegado por el teléfono.");
  }

  // Comprobar si el archivo es imagen considerando que algunos móviles no reportan MIME type explícito
  const isImageMime = file.type ? file.type.startsWith("image/") : true;
  const isImageExt = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|svg)$/i.test(file.name || "");

  if (!isImageMime && !isImageExt && file.type !== "") {
    throw new Error("Formato de imagen no compatible. Usa JPG, PNG o WebP.");
  }

  if (file.size > maxInputBytes) {
    throw new Error("La imagen es demasiado pesada. El tamaño máximo permitido es 15 MB.");
  }

  // -------------------------------------------------------------
  // ESTRATEGIA 1: createImageBitmap (Moderno, rápido y corrige rotación EXIF móvil)
  // -------------------------------------------------------------
  if (typeof window !== "undefined" && typeof window.createImageBitmap === "function") {
    try {
      const bitmap = await window.createImageBitmap(file);
      const result = drawCropAndExport(
        bitmap,
        bitmap.width,
        bitmap.height,
        targetSize,
        quality
      );
      bitmap.close();
      return result;
    } catch {
      // Si falla createImageBitmap (por ejemplo formatos específicos en Safari), continuar a Estrategia 2
    }
  }

  // -------------------------------------------------------------
  // ESTRATEGIA 2: URL.createObjectURL + HTMLImageElement
  // -------------------------------------------------------------
  if (typeof window !== "undefined" && typeof window.URL?.createObjectURL === "function") {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        let objectUrl: string | null = null;
        try {
          objectUrl = window.URL.createObjectURL(file);
        } catch (e) {
          reject(e);
          return;
        }

        const img = new Image();
        img.onload = () => {
          if (objectUrl) {
            try {
              window.URL.revokeObjectURL(objectUrl);
            } catch {
              // ignore
            }
          }
          try {
            const dataUrl = drawCropAndExport(
              img,
              img.naturalWidth || img.width,
              img.naturalHeight || img.height,
              targetSize,
              quality
            );
            resolve(dataUrl);
          } catch (err: any) {
            reject(err);
          }
        };

        img.onerror = () => {
          if (objectUrl) {
            try {
              window.URL.revokeObjectURL(objectUrl);
            } catch {
              // ignore
            }
          }
          reject(new Error("No se pudo decodificar la imagen mediante URL de objeto."));
        };

        img.src = objectUrl;
      });

      return result;
    } catch {
      // Continuar a fallback FileReader
    }
  }

  // -------------------------------------------------------------
  // ESTRATEGIA 3: FileReader (Fallback universal)
  // -------------------------------------------------------------
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("No se pudo leer el archivo de imagen desde tu dispositivo."));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("El archivo de imagen no se pudo procesar. Intenta con otra imagen o formato JPG/PNG."));
      };

      img.onload = () => {
        try {
          const dataUrl = drawCropAndExport(
            img,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            targetSize,
            quality
          );
          resolve(dataUrl);
        } catch {
          reject(new Error("Ocurrió un error al procesar y optimizar la imagen."));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
