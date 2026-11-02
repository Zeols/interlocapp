import { prisma } from '../src/backend/db';
import { hashPassword } from '../src/backend/lib/crypto';

async function main() {
  console.log('🧹 Limpiando registros anteriores de la base de datos...');
  
  // Limpieza segura en orden inverso de dependencias
  try {
    await prisma.historicoRepuesto.deleteMany({});
  } catch (e) {}
  
  await prisma.incidente.deleteMany({});
  await prisma.controlViaje.deleteMany({});
  await prisma.boleto.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.despacho.deleteMany({});
  await prisma.viaje.deleteMany({});
  await prisma.asignacionUnidad.deleteMany({});
  await prisma.asiento.deleteMany({});
  await prisma.unidad.deleteMany({});
  await prisma.tarifa.deleteMany({});
  await prisma.puntoRuta.deleteMany({});
  await prisma.ruta.deleteMany({});
  await prisma.punto.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.cooperativa.deleteMany({});
  await prisma.rol.deleteMany({});
  await prisma.tipoVenta.deleteMany({});
  await prisma.tipoRuta.deleteMany({});
  await prisma.tipoUnidad.deleteMany({});

  console.log('🌱 Iniciando la siembra completa con 20 pasajeros...');

  const defaultPasswordHash = await hashPassword('Password123!');

  // ==========================================
  // 1. ROLES DE SISTEMA
  // ==========================================
  console.log('-> Sembrando roles...');
  const rolesData = [
    { nombre: 'SUPER_ADMIN', descripcion: 'Superadministrador global' },
    { nombre: 'ADMIN_COOP', descripcion: 'Administrador de cooperativa' },
    { nombre: 'TAQUILLERO', descripcion: 'Taquillero de ventanilla' },
    { nombre: 'CHOFER', descripcion: 'Conductor principal' },
    { nombre: 'AYUDANTE', descripcion: 'Ayudante y cobrador' },
    { nombre: 'CHEQUEADOR', descripcion: 'Chequeador de terminal' },
    { nombre: 'PASAJERO', descripcion: 'Pasajero usuario' },
  ];

  const rolesMap = new Map<string, number>();
  for (const r of rolesData) {
    const rol = await prisma.rol.create({
      data: { nombre: r.nombre, descripcion: r.descripcion, estado: 'ACTIVO' },
    });
    rolesMap.set(r.nombre, rol.idRol);
  }

  // ==========================================
  // 2. TIPOS DE VENTA Y RUTA
  // ==========================================
  console.log('-> Sembrando catálogos de venta y tipo de ruta...');
  await prisma.tipoVenta.createMany({
    data: [
      { nombre: 'WEB', estado: 'ACTIVO' },
      { nombre: 'VENTANILLA_TERMINAL', estado: 'ACTIVO' },
      { nombre: 'A_BORDO', estado: 'ACTIVO' },
    ],
  });

  const tipoRutaInterlocal = await prisma.tipoRuta.create({
    data: { nombre: 'Interlocal Ordinaria', descripcion: 'Ruta regular interurbana', estado: 'ACTIVO' },
  });

  // ==========================================
  // 3. COOPERATIVAS
  // ==========================================
  console.log('-> Sembrando cooperativas...');
  const coop1 = await prisma.cooperativa.create({
    data: { nombre: 'COOTRANSTEL R.L.', telefono: '+505 2222-3344', direccion: 'Terminal UCA, Managua', estado: 'ACTIVO' },
  });

  const coop2 = await prisma.cooperativa.create({
    data: { nombre: 'COOTRANSIN R.L.', telefono: '+505 2255-6677', direccion: 'Terminal Mayoreo, Managua', estado: 'ACTIVO' },
  });

  // ==========================================
  // 4. USUARIOS (OPERARIOS Y 20 PASAJEROS)
  // ==========================================
  console.log('-> Sembrando operarios y generando 20 pasajeros...');
  
  // Generación automática de 20 pasajeros
  const pasajerosData = Array.from({ length: 20 }, (_, i) => ({
    nombre: `Pasajero${i + 1}`,
    apellido: `Test${i + 1}`,
    usuario: `pasajero_${i + 1}`,
    correo: `pasajero${i + 1}@correo.com`,
    passwd: defaultPasswordHash,
    telefono: `+505 8800-00${i < 9 ? '0' + (i + 1) : (i + 1)}`,
    idRol: rolesMap.get('PASAJERO')!,
    idCooperativa: null,
    estado: 'ACTIVO' as const,
  }));

  await prisma.usuario.createMany({
    data: [
      { nombre: 'Steven', apellido: 'Baldelomar', usuario: 'superadmin', correo: 'admin@interlocapp.com', passwd: defaultPasswordHash, idRol: rolesMap.get('SUPER_ADMIN')! },
      { nombre: 'Guillermo', apellido: 'López', usuario: 'admin_coop1', correo: 'admin1@cootranstel.com', passwd: defaultPasswordHash, idRol: rolesMap.get('ADMIN_COOP')!, idCooperativa: coop1.idCooperativa },
      { nombre: 'Maritza', apellido: 'Torrez', usuario: 'taquillero1', correo: 'taquilla1@cootranstel.com', passwd: defaultPasswordHash, idRol: rolesMap.get('TAQUILLERO')!, idCooperativa: coop1.idCooperativa },
      { nombre: 'Carlos', apellido: 'Mendoza', usuario: 'chequeador1', correo: 'chequeador1@cootranstel.com', passwd: defaultPasswordHash, idRol: rolesMap.get('CHEQUEADOR')!, idCooperativa: coop1.idCooperativa },
      { nombre: 'Juan', apellido: 'Pérez', usuario: 'ayudante_juan', correo: 'juan.ayudante@cootranstel.com', passwd: defaultPasswordHash, idRol: rolesMap.get('AYUDANTE')!, idCooperativa: coop1.idCooperativa },
      { nombre: 'Luis', apellido: 'Roca', usuario: 'chofer_luis', correo: 'luis.chofer@cootranstel.com', passwd: defaultPasswordHash, idRol: rolesMap.get('CHOFER')!, idCooperativa: coop1.idCooperativa },
      { nombre: 'Ana', apellido: 'García', usuario: 'admin_coop2', correo: 'admin@cootransin.com', passwd: defaultPasswordHash, idRol: rolesMap.get('ADMIN_COOP')!, idCooperativa: coop2.idCooperativa },
      ...pasajerosData, // Se inyectan los 20 pasajeros aquí
    ],
  });

  // ==========================================
  // 5. PUNTOS GEOGRÁFICOS Y RUTAS (10 PUNTOS C/U)
  // ==========================================
  console.log('-> Sembrando puntos geográficos y rutas...');

  const puntosJinotepe = [
    'Terminal UCA (Managua)', 'Rotonda Centroamérica', 'Rotonda Jean Paul Genie', 
    'Pista Juan Pablo II', 'Empalme de Ticuantepe', 'Entrada a Masaya (Monimbó)', 
    'La Concha (La Concepción)', 'San Marcos', 'Diriamba (Terminal)', 'Jinotepe (Terminal Central)'
  ];

  const idsJinotepe: number[] = [];
  for (const nombre of puntosJinotepe) {
    const p = await prisma.punto.create({ data: { nombre, estado: 'ACTIVO' } });
    idsJinotepe.push(p.idPunto);
  }

  const rutaJinotepe = await prisma.ruta.create({
    data: {
      idCooperativa: coop1.idCooperativa,
      idTipoRuta: tipoRutaInterlocal.idTipoRuta,
      nombre: 'Managua - Jinotepe (Carretera Sur)',
      descripcion: 'Recorrido interurbano con 10 puntos de parada',
      estado: 'ACTIVO',
    },
  });

  for (let i = 0; i < idsJinotepe.length; i++) {
    await prisma.puntoRuta.create({
      data: { idRuta: rutaJinotepe.idRuta, idPunto: idsJinotepe[i], orden: i + 1 },
    });
  }

  const puntosMatagalpa = [
    'Terminal Mayoreo (Managua)', 'Bypassed de Tipitapa', 'Empalme San Benito', 
    'Sébaco (Centro)', 'Ciudad Darío', 'La Trinidad', 'Empalme de San Ramón', 
    'Entrada a Las Brumas', 'Zaragoza (Matagalpa)', 'Matagalpa (Terminal Norte)'
  ];

  const idsMatagalpa: number[] = [];
  for (const nombre of puntosMatagalpa) {
    const p = await prisma.punto.create({ data: { nombre, estado: 'ACTIVO' } });
    idsMatagalpa.push(p.idPunto);
  }

  const rutaMatagalpa = await prisma.ruta.create({
    data: {
      idCooperativa: coop2.idCooperativa,
      idTipoRuta: tipoRutaInterlocal.idTipoRuta,
      nombre: 'Managua - Matagalpa (Norte)',
      descripcion: 'Recorrido hacia el norte del país con 10 puntos de control',
      estado: 'ACTIVO',
    },
  });

  for (let i = 0; i < idsMatagalpa.length; i++) {
    await prisma.puntoRuta.create({
      data: { idRuta: rutaMatagalpa.idRuta, idPunto: idsMatagalpa[i], orden: i + 1 },
    });
  }

  // ==========================================
  // 6. TIPOS DE UNIDAD Y FLOTA DE BUSES (CON ASIENTOS)
  // ==========================================
  console.log('-> Sembrando flota de buses y generando asientos...');
  
  const tipoMicrobus = await prisma.tipoUnidad.create({
    data: { nombre: 'Microbús (15 Asientos)', descripcion: 'Microbús compacto rutas intermedias', estado: 'ACTIVO' },
  });

  const tipoInterlocal = await prisma.tipoUnidad.create({
    data: { nombre: 'Interlocal Estándar (20 Asientos)', descripcion: 'Interlocal estándar 2x2', estado: 'ACTIVO' },
  });

  const tipoPullman = await prisma.tipoUnidad.create({
    data: { nombre: 'Pullman (40 Asientos)', descripcion: 'Autobús grande para largas distancias y emergencias', estado: 'ACTIVO' },
  });

  const unidadesConfig = [
    { num: '01', placa: 'M 321-456', coopId: coop1.idCooperativa, tipoId: tipoInterlocal.idTipoUnidad, cap: 20 },
    { num: '02', placa: 'M 654-789', coopId: coop1.idCooperativa, tipoId: tipoMicrobus.idTipoUnidad, cap: 15 },
    { num: '03', placa: 'M 987-123', coopId: coop1.idCooperativa, tipoId: tipoPullman.idTipoUnidad, cap: 40 }, 
    { num: '04', placa: 'M 111-222', coopId: coop1.idCooperativa, tipoId: tipoMicrobus.idTipoUnidad, cap: 15 }, 
    { num: '05', placa: 'M 333-444', coopId: coop1.idCooperativa, tipoId: tipoInterlocal.idTipoUnidad, cap: 20 }, 
    { num: '06', placa: 'MY 001-111', coopId: coop2.idCooperativa, tipoId: tipoInterlocal.idTipoUnidad, cap: 20 },
  ];

  for (const u of unidadesConfig) {
    const unidadCreada = await prisma.unidad.create({
      data: {
        idCooperativa: u.coopId,
        idTipoUnidad: u.tipoId,
        numeroUnidad: u.num,
        placa: u.placa,
        estado: 'DISPONIBLE',
      },
    });

    const asientosData = Array.from({ length: u.cap }, (_, i) => ({
      idUnidad: unidadCreada.idUnidad,
      numero: String(i + 1),
      estado: 'DISPONIBLE' as const,
    }));

    await prisma.asiento.createMany({ data: asientosData });
  }

  // ==========================================
  // 7. MATRIZ TARIFARIA (PRECIOS)
  // ==========================================
  console.log('-> Creando tarifas de viaje...');
  
  await prisma.tarifa.create({
    data: {
      idRuta: rutaJinotepe.idRuta,
      idPuntoOrigen: idsJinotepe[0],
      idPuntoDestino: idsJinotepe[9],
      monto: 120.00,
      estado: 'ACTIVO',
    },
  });

  await prisma.tarifa.create({
    data: {
      idRuta: rutaMatagalpa.idRuta,
      idPuntoOrigen: idsMatagalpa[0],
      idPuntoDestino: idsMatagalpa[9],
      monto: 200.00,
      estado: 'ACTIVO',
    },
  });

  console.log('✅ ¡Siembra unificada con 20 pasajeros completada con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error crítico en la siembra:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });