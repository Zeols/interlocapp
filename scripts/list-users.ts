import 'dotenv/config';
import { prisma } from '../src/backend/db';

async function listUsers() {
  try {
    const users = await prisma.usuario.findMany({
      include: { rol: true },
    });
    console.log(`Found ${users.length} users in database:`);
    for (const u of users) {
      console.log(`- ID: ${u.idUsuario}, Nombre: ${u.nombre} ${u.apellido}, Usuario: "${u.usuario}", Correo: "${u.correo}", Rol: ${u.rol.nombre}, Estado: ${u.estado}`);
    }
  } catch (err) {
    console.error('Error listing users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
