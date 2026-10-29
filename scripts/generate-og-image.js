const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  console.log('Generando imágenes Open Graph para WhatsApp y redes sociales...');

  const faviconSvgPath = path.join(process.cwd(), 'public', 'favicon.svg');
  const faviconSvgContent = fs.readFileSync(faviconSvgPath, 'utf8');

  // 1. Generar imagen cuadrada de alta resolución (600x600) para WhatsApp thumbnail
  const squareSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#F1F5F9"/>
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bgGrad)"/>
      <g transform="translate(60, 60) scale(0.8)">
        ${faviconSvgContent.replace(/<\?xml.*?\?>/i, '').replace(/<!DOCTYPE.*?>/i, '')}
      </g>
    </svg>
  `;

  // 2. Generar imagen panorámica (1200x630) estándar Open Graph / Facebook / Twitter
  const bannerSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="50%" stop-color="#F8FAFC"/>
          <stop offset="100%" stop-color="#F1F5F9"/>
        </linearGradient>
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0F172A" flood-opacity="0.08"/>
        </filter>
      </defs>

      <!-- Fondo elegante claro -->
      <rect width="1200" height="630" fill="url(#bannerBg)"/>
      
      <!-- Detalle decorativo sutil en esquina -->
      <circle cx="1150" cy="50" r="240" fill="#0284C7" fill-opacity="0.03"/>
      <circle cx="50" cy="580" r="280" fill="#FD810F" fill-opacity="0.03"/>

      <!-- Contenedor central (630x630 centrado para recorte perfecto en WhatsApp) -->
      <g transform="translate(180, 115)">
        <!-- Logo Badge con sombra suave -->
        <g filter="url(#badgeShadow)">
          <circle cx="200" cy="200" r="170" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4"/>
          <g transform="translate(45, 45) scale(0.60)">
            ${faviconSvgContent.replace(/<\?xml.*?\?>/i, '').replace(/<!DOCTYPE.*?>/i, '')}
          </g>
        </g>

        <!-- Bloque de Texto -->
        <text x="440" y="170" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#0F172A" letter-spacing="-1.5">InterlocApp</text>
        <text x="440" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#0284C7">Transporte Interlocal Moderno</text>
        <text x="440" y="285" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="500" fill="#64748B">Compra de boletos y selección de asientos en línea</text>
        
        <!-- Píldora de confianza -->
        <rect x="440" y="325" width="230" height="42" rx="21" fill="#0F172A"/>
        <text x="555" y="352" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">interlocapp.vercel.app</text>
      </g>
    </svg>
  `;

  // Renderizar a PNG usando sharp
  const ogBannerBuffer = await sharp(Buffer.from(bannerSvg))
    .resize(1200, 630)
    .png({ quality: 90, compressionLevel: 8 })
    .toBuffer();

  const ogSquareBuffer = await sharp(Buffer.from(squareSvg))
    .resize(600, 600)
    .png({ quality: 90, compressionLevel: 8 })
    .toBuffer();

  // Guardar en public/ y en src/app/ (convención nativa Next.js)
  fs.writeFileSync(path.join(process.cwd(), 'public', 'og-image.png'), ogBannerBuffer);
  fs.writeFileSync(path.join(process.cwd(), 'public', 'og-square.png'), ogSquareBuffer);
  fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'opengraph-image.png'), ogBannerBuffer);
  fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'twitter-image.png'), ogBannerBuffer);

  console.log(`✅ og-image.png creado (${Math.round(ogBannerBuffer.length / 1024)} KB)`);
  console.log(`✅ og-square.png creado (${Math.round(ogSquareBuffer.length / 1024)} KB)`);
  console.log(`✅ src/app/opengraph-image.png creado`);
  console.log(`✅ src/app/twitter-image.png creado`);
}

main().catch(console.error);
