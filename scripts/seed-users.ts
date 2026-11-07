import 'dotenv/config';
import { prisma } from '../src/backend/db';
import { hashPassword } from '../src/backend/lib/crypto';

interface UserSeedDefinition {
  rol: string;
  nombre: string;
  apellido: string;
  usuario: string;
  correo: string;
  passwdPlano: string;
  requiresCoop: boolean;
}

const USERS_TO_SEED: UserSeedDefinition[] = [
  {
    rol: 'SUPER_ADMIN',
    nombre: 'Super Administrador',
    apellido: 'InterlocApp',
    usuario: 'superadmin',
    correo: 'superadmin@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: false,
  },
  {
    rol: 'ADMIN_COOP',
    nombre: 'Guillermo',
    apellido: 'López',
    usuario: 'admin_coop',
    correo: 'admin.coop@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: true,
  },
  {
    rol: 'TAQUILLERO',
    nombre: 'Maritza',
    apellido: 'Torrez',
    usuario: 'taquillero',
    correo: 'taquillero@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: true,
  },
  {
    rol: 'CHEQUEADOR',
    nombre: 'Carlos',
    apellido: 'Mendoza',
    usuario: 'chequeador',
    correo: 'chequeador@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: true,
  },
  {
    rol: 'CHOFER',
    nombre: 'Luis',
    apellido: 'Roca',
    usuario: 'chofer',
    correo: 'chofer@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: true,
  },
  {
    rol: 'AYUDANTE',
    nombre: 'Juan',
    apellido: 'Pérez',
    usuario: 'ayudante',
    correo: 'ayudante@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: true,
  },
  {
    rol: 'PASAJERO',
    nombre: 'María',
    apellido: 'González',
    usuario: 'pasajero',
    correo: 'pasajero@interlocapp.com',
    passwdPlano: 'admin123',
    requiresCoop: false,
  },
];

async function seedUsers() {
  console.log('==================================================');
  console.log('🚀 Sembrando usuarios por rol en la base de datos');
  console.log('==================================================\n');

  // 1. Asegurar roles en la base de datos
  const rolesDef = [
    { nombre: 'SUPER_ADMIN', descripcion: 'Superadministrador global' },
    { nombre: 'ADMIN_COOP', descripcion: 'Administrador de cooperativa' },
    { nombre: 'TAQUILLERO', descripcion: 'Taquillero de ventanilla' },
    { nombre: 'CHOFER', descripcion: 'Conductor principal' },
    { nombre: 'AYUDANTE', descripcion: 'Ayudante y cobrador' },
    { nombre: 'CHEQUEADOR', descripcion: 'Chequeador de terminal' },
    { nombre: 'PASAJERO', descripcion: 'Pasajero usuario' },
  ];

  const rolesMap = new Map<string, number>();

  for (const r of rolesDef) {
    const rol = await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: { descripcion: r.descripcion, estado: 'ACTIVO' },
      create: { nombre: r.nombre, descripcion: r.descripcion, estado: 'ACTIVO' },
    });
    rolesMap.set(r.nombre, rol.idRol);
  }
  console.log('✅ 7 Roles verificados/actualizados correctamente.');

  // 2. Asegurar que exista al menos una Cooperativa activa para los roles operativos
  let cooperativa = await prisma.cooperativa.findFirst({
    where: { estado: 'ACTIVO' },
  });

  if (!cooperativa) {
    cooperativa = await prisma.cooperativa.create({
      data: {
        nombre: 'COOTRANSTEL R.L.',
        telefono: '+505 2222-3344',
        direccion: 'Terminal UCA, Managua',
        estado: 'ACTIVO',
      },
    });
    console.log(`✅ Cooperativa creada: ${cooperativa.nombre} (ID: ${cooperativa.idCooperativa})`);
  } else {
    console.log(`ℹ️ Cooperativa existente vinculada: ${cooperativa.nombre} (ID: ${cooperativa.idCooperativa})`);
  }

  // 3. Crear o actualizar cada usuario
  console.log('\n📝 Creando/actualizando usuarios...\n');

  for (const u of USERS_TO_SEED) {
    const idRol = rolesMap.get(u.rol);
    if (!idRol) {
      console.warn(`⚠️ Rol ${u.rol} no encontrado en rolesMap, omitiendo.`);
      continue;
    }

    const hashedPassword = await hashPassword(u.passwdPlano);
    const idCooperativa = u.requiresCoop ? cooperativa.idCooperativa : null;

    // Buscar si ya existe por correo o nombre de usuario
    const existing = await prisma.usuario.findFirst({
      where: {
        OR: [{ correo: u.correo }, { usuario: u.usuario }],
      },
    });

    if (existing) {
      await prisma.usuario.update({
        where: { idUsuario: existing.idUsuario },
        data: {
          idRol,
          idCooperativa,
          nombre: u.nombre,
          apellido: u.apellido,
          usuario: u.usuario,
          correo: u.correo,
          passwd: hashedPassword,
          estado: 'ACTIVO',
        },
      });
      console.log(`🔄 Actualizado: [${u.rol}] ${u.correo} (${u.usuario})`);
    } else {
      await prisma.usuario.create({
        data: {
          idRol,
          idCooperativa,
          nombre: u.nombre,
          apellido: u.apellido,
          usuario: u.usuario,
          correo: u.correo,
          passwd: hashedPassword,
          estado: 'ACTIVO',
        },
      });
      console.log(`✨ Creado:     [${u.rol}] ${u.correo} (${u.usuario})`);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 ¡Todos los usuarios fueron sembrados con éxito!');
  console.log('==================================================\n');
  console.log('Credenciales configuradas:');
  console.table(
    USERS_TO_SEED.map((u) => ({
      Rol: u.rol,
      Nombre: `${u.nombre} ${u.apellido}`,
      Identificador: u.usuario,
      Correo: u.correo,
      Password: u.passwdPlano,
    }))
  );
}

seedUsers()
  .catch((err) => {
    console.error('❌ Error fatal al sembrar usuarios:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

