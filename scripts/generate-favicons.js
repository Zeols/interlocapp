const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const svgPath = path.join(process.cwd(), 'public', 'favicon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generando imágenes PNG y Favicon desde public/favicon.svg...');

  // Generar PNGs en varios tamaños
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();

  fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon-32x32.png'), png32);
  fs.writeFileSync(path.join(process.cwd(), 'public', 'apple-touch-icon.png'), png192);

  // Construir archivo .ico estándar multicapa con los frames PNG (16x16, 32x32, 48x48)
  const images = [
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ];

  // Estructura de cabecera ICO: 6 bytes
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reservado (0)
  header.writeUInt16LE(1, 2); // Tipo de imagen (1 para ICO)
  header.writeUInt16LE(count, 4); // Número de imágenes

  const dirEntrySize = 16;
  let offset = 6 + count * dirEntrySize;
  const dirEntries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width, 0);
    entry.writeUInt8(img.height, 1);
    entry.writeUInt8(0, 2); // Paleta de color (0 = no paleta)
    entry.writeUInt8(0, 3); // Reservado (0)
    entry.writeUInt16LE(1, 4); // Planos de color (1)
    entry.writeUInt16LE(32, 6); // Bits por píxel (32 = RGBA)
    entry.writeUInt32LE(img.buffer.length, 8); // Tamaño del archivo de imagen
    entry.writeUInt32LE(offset, 12); // Desplazamiento de los datos de imagen

    dirEntries.push(entry);
    imageBuffers.push(img.buffer);
    offset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
  fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'favicon.ico'), icoBuffer);

  console.log('✅ Archivos generados exitosamente:');
  console.log(' - public/favicon.ico (Multi-size 16x16, 32x32, 48x48)');
  console.log(' - src/app/favicon.ico (Multi-size para Next.js App Router)');
  console.log(' - public/favicon-32x32.png');
  console.log(' - public/apple-touch-icon.png');
}

generate().catch(console.error);
