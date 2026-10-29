import 'dotenv/config';
import { prisma } from '../src/backend/db';
import { verifyPassword } from '../src/backend/lib/crypto';

async function test() {
  console.log('Testing prisma user query...');
  try {
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [{ correo: 'pasajero@correo.com' }, { usuario: 'pasajero@correo.com' }],
      },
      include: {
        rol: true,
      },
    });
    console.log('User found:', user ? { 
      id: user.idUsuario, 
      email: user.correo, 
      rol: user.rol?.nombre, 
      estado: user.estado, 
      foto: user.foto,
      passwdHash: user.passwd?.substring(0, 15) 
    } : 'Not found');
    
    if (user) {
      const match = await verifyPassword('Password123!', user.passwd);
      console.log('Password match with Password123!:', match);
    }
  } catch (err) {
    console.error('Test error caught:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
