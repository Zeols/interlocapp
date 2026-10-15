/**
 * Utilidades para procesamiento, recorte centrado y compresión de fotos de perfil en el cliente.
 * Genera una versión WebP optimizada (256x256 px) lista para persistirse como Data URL.
 */

export interface ProcessImageOptions {
  targetSize?: number; // Tamaño cuadrado en píxeles (por defecto 256)
  quality?: number; // Calidad de compresión WebP 0-1 (por defecto 0.85)
  maxInputBytes?: number; // Límite de tamaño de archivo entrante (por defecto 5MB)
}

/**
 * Procesa un archivo de imagen:
 * - Valida tipo y tamaño.
 * - Realiza un recorte centrado 1:1 (cuadrado).
 * - Escala al tamaño objetivo (256x256 px).
 * - Comprime a formato WebP optimizado (aprox. 15-25 KB).
 */
export async function processAvatarImage(
  file: File,
  options: ProcessImageOptions = {}
): Promise<string> {
  const {
    targetSize = 256,
    quality = 0.85,
    maxInputBytes = 5 * 1024 * 1024, // 5 MB
  } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  if (file.size > maxInputBytes) {
    throw new Error('La imagen es demasiado pesada. El tamaño máximo permitido es 5 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo de imagen.'));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('El archivo de imagen está dañado o no se pudo decodificar.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo inicializar el procesador de gráficos 2D.'));
            return;
          }

          // Suavizado de bordes para alta calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Calcular recorte centrado 1:1
          const minDim = Math.min(img.width, img.height);
          const sourceX = (img.width - minDim) / 2;
          const sourceY = (img.height - minDim) / 2;

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Exportar a WebP (con fallback automático a PNG si el navegador no lo soporta)
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(new Error('Ocurrió un error al procesar y optimizar la imagen.'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
