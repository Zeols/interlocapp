import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde .env antes de inicializar Prisma
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

import { prisma } from '../src/backend/db';

async function main() {
  console.log('Consultando fotos de usuarios en la base de datos...');
  
  const usuarios = await prisma.usuario.findMany({
    where: {
      foto: {
        not: null,
      },
    },
    select: {
      idUsuario: true,
      nombre: true,
      apellido: true,
      usuario: true,
      correo: true,
      foto: true,
    },
  });

  if (usuarios.length === 0) {
    console.log('No se encontraron usuarios con foto en la base de datos.');
    return;
  }

  const outputDir = path.resolve(process.cwd(), 'scratch', 'avatars');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Se encontraron ${usuarios.length} usuario(s) con foto:\n`);

  for (const u of usuarios) {
    if (!u.foto) continue;

    // Detectar si es data URL base64 o URL remota
    if (u.foto.startsWith('data:image/')) {
      const match = u.foto.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const safeUsername = (u.usuario || `user_${u.idUsuario}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `usuario_${u.idUsuario}_${safeUsername}.${ext}`;
        const filePath = path.join(outputDir, fileName);

        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        console.log(`✔ Foto guardada exitosamente: ${fileName}`);
        console.log(`  Ruta: ${filePath}\n`);
        continue;
      }
    }

    console.log(`ℹ Usuario ${u.idUsuario} (${u.usuario}) tiene una URL externa: ${u.foto}`);
  }

  console.log(`Todas las imágenes están disponibles en: ${outputDir}`);
}

main()
  .catch((e) => {
    console.error('Error al exportar avatares:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
