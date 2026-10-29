// import 'dotenv/config';
import { prisma } from '../src/backend/db';
import { hashPassword } from '../src/backend/lib/crypto';

async function main() {
  console.log('🧹 Limpiando registros operativos anteriores...');
  // Limpiamos en orden de dependencia para evitar conflictos de llaves foráneas
  await prisma.controlViaje.deleteMany({});
  await prisma.boleto.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.despacho.deleteMany({});
  await prisma.viaje.deleteMany({});
  await prisma.asignacionUnidad.deleteMany({});

  console.log('🌱 Iniciando siembra de datos maestros para InterlocApp...');

  // -------------------------------------------------------------
  // 1. ROLES DE SISTEMA (RBAC)
  // -------------------------------------------------------------
  console.log('-> Sembrando roles de sistema...');
  const rolesData = [
    { nombre: 'SUPER_ADMIN', descripcion: 'Superadministrador de la plataforma global' },
    { nombre: 'ADMIN_COOP', descripcion: 'Administrador de cooperativa de transporte' },
    { nombre: 'TAQUILLERO', descripcion: 'Taquillero de ventanilla en terminal' },
    { nombre: 'CHOFER', descripcion: 'Conductor principal de unidad' },
    { nombre: 'AYUDANTE', descripcion: 'Ayudante y cobrador de unidad' },
    { nombre: 'CHEQUEADOR', descripcion: 'Chequeador de terminal y puntos de control de ruta' },
    { nombre: 'PASAJERO', descripcion: 'Pasajero usuario del servicio' },
  ];

  const rolesMap = new Map<string, number>();
  for (const r of rolesData) {
    const rol = await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: { descripcion: r.descripcion },
      create: {
        nombre: r.nombre,
        descripcion: r.descripcion,
        estado: 'ACTIVO',
      },
    });
    rolesMap.set(rol.nombre, rol.idRol);
  }

  // -------------------------------------------------------------
  // 2. CANALES DE VENTA
  // -------------------------------------------------------------
  console.log('-> Sembrando tipos de venta...');
  const tiposVentaData = [
    { nombre: 'WEB', descripcion: 'Compra digital a través del portal de pasajeros' },
    { nombre: 'VENTANILLA_TERMINAL', descripcion: 'Venta física en taquilla de terminal' },
    { nombre: 'A_BORDO', descripcion: 'Venta directa de boleto al abordar la unidad' },
  ];

  for (const tv of tiposVentaData) {
    await prisma.tipoVenta.upsert({
      where: { nombre: tv.nombre },
      update: { descripcion: tv.descripcion },
      create: {
        nombre: tv.nombre,
        descripcion: tv.descripcion,
        estado: 'ACTIVO',
      },
    });
  }

  // -------------------------------------------------------------
  // 3. TIPOS DE UNIDAD
  // -------------------------------------------------------------
  console.log('-> Sembrando tipos de unidad...');
  const tiposUnidadData = [
    { nombre: 'Microbús (15 Asientos)', descripcion: 'Microbús compacto para rutas intermedias (configuración 1x2)' },
    { nombre: 'Interlocal Estándar (20 Asientos)', descripcion: 'Interlocal interurbano estándar (configuración 2x2)' },
    { nombre: 'Pullman (40 Asientos)', descripcion: 'Autobús de larga distancia con aire acondicionado' },
  ];

  const tiposUnidadMap = new Map<string, number>();
  for (const tu of tiposUnidadData) {
    const existing = await prisma.tipoUnidad.findFirst({
      where: { nombre: tu.nombre },
    });

    if (existing) {
      tiposUnidadMap.set(tu.nombre, existing.idTipoUnidad);
    } else {
      const nuevo = await prisma.tipoUnidad.create({
        data: {
          nombre: tu.nombre,
          descripcion: tu.descripcion,
          estado: 'ACTIVO',
        },
      });
      tiposUnidadMap.set(tu.nombre, nuevo.idTipoUnidad);
    }
  }

  // -------------------------------------------------------------
  // 4. TARIFAS DE EQUIPAJE
  // -------------------------------------------------------------
  console.log('-> Sembrando tarifas de equipaje...');
  const tarifasEquipajeData = [
    { descripcion: 'Mochila de mano / Bulto pequeño', monto: 0.0 },
    { descripcion: 'Maleta estándar / Bulto mediano', monto: 50.0 },
    { descripcion: 'Caja comercial / Carga pesada', monto: 100.0 },
  ];

  for (const te of tarifasEquipajeData) {
    const existing = await prisma.tarifaEquipaje.findFirst({
      where: { descripcion: te.descripcion },
    });
    if (!existing) {
      await prisma.tarifaEquipaje.create({
        data: {
          descripcion: te.descripcion,
          monto: te.monto,
          estado: 'ACTIVO',
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 5. COOPERATIVA PILOTO
  // -------------------------------------------------------------
  console.log('-> Sembrando cooperativa piloto...');
  let coop = await prisma.cooperativa.findFirst({
    where: { nombre: 'COOTRANSTEL R.L.' },
  });

  if (!coop) {
    coop = await prisma.cooperativa.create({
      data: {
        nombre: 'COOTRANSTEL R.L.',
        telefono: '+505 2222-3344',
        direccion: 'Terminal de Buses Interlocales UCA, Managua, Nicaragua',
        estado: 'ACTIVO',
      },
    });
  }

  // -------------------------------------------------------------
  // 6. USUARIOS SEMILLA (CON CONTRASEÑAS HASHEADAS BCRYPT)
  // -------------------------------------------------------------
  console.log('-> Sembrando usuarios de prueba con contraseñas seguras...');
  const defaultPasswordHash = await hashPassword('Password123!');

  const usuariosData = [
    {
      nombre: 'Steven',
      apellido: 'Baldelomar',
      usuario: 'superadmin',
      correo: 'admin@interlocapp.com',
      telefono: '+505 8888-0000',
      idRol: rolesMap.get('SUPER_ADMIN')!,
      idCooperativa: null,
    },
    {
      nombre: 'Guillermo',
      apellido: 'López',
      usuario: 'admin_coop',
      correo: 'admin@cootranstel.com',
      telefono: '+505 8888-1111',
      idRol: rolesMap.get('ADMIN_COOP')!,
      idCooperativa: coop.idCooperativa,
    },
    {
      nombre: 'Maritza',
      apellido: 'Torrez',
      usuario: 'taquilla_uca',
      correo: 'taquilla@cootranstel.com',
      telefono: '+505 8888-2222',
      idRol: rolesMap.get('TAQUILLERO')!,
      idCooperativa: coop.idCooperativa,
    },
    {
      nombre: 'Carlos',
      apellido: 'Mendoza',
      usuario: 'chofer_carlos',
      correo: 'carlos.chofer@cootranstel.com',
      telefono: '+505 8888-3333',
      idRol: rolesMap.get('CHOFER')!,
      idCooperativa: coop.idCooperativa,
    },
    {
      nombre: 'Juan',
      apellido: 'Pérez',
      usuario: 'ayudante_juan',
      correo: 'juan.ayudante@cootranstel.com',
      telefono: '+505 8888-4444',
      idRol: rolesMap.get('AYUDANTE')!,
      idCooperativa: coop.idCooperativa,
    },
    {
      nombre: 'Roberto',
      apellido: 'Sánchez',
      usuario: 'pasajero_demo',
      correo: 'pasajero@correo.com',
      telefono: '+505 8888-5555',
      idRol: rolesMap.get('PASAJERO')!,
      idCooperativa: null,
    },
  ];

  for (const u of usuariosData) {
    await prisma.usuario.upsert({
      where: { correo: u.correo },
      update: {
        nombre: u.nombre,
        apellido: u.apellido,
        usuario: u.usuario,
        idRol: u.idRol,
        idCooperativa: u.idCooperativa,
        passwd: defaultPasswordHash,
      },
      create: {
        nombre: u.nombre,
        apellido: u.apellido,
        usuario: u.usuario,
        correo: u.correo,
        telefono: u.telefono,
        passwd: defaultPasswordHash,
        idRol: u.idRol,
        idCooperativa: u.idCooperativa,
        estado: 'ACTIVO',
      },
    });
  }

  // -------------------------------------------------------------
  // 7. FLOTA Y GENERACIÓN DE ASIENTOS
  // -------------------------------------------------------------
  console.log('-> Sembrando unidades y asientos de flota...');
  const idTipo20 = tiposUnidadMap.get('Interlocal Estándar (20 Asientos)')!;
  const idTipo15 = tiposUnidadMap.get('Microbús (15 Asientos)')!;

  const unidadesConfig = [
    { numero: '01', placa: 'M 321-456', tipoId: idTipo20, capacidad: 20 },
    { numero: '02', placa: 'M 654-789', tipoId: idTipo15, capacidad: 15 },
  ];

  for (const u of unidadesConfig) {
    let unidad = await prisma.unidad.findUnique({
      where: { placa: u.placa },
    });

    if (!unidad) {
      unidad = await prisma.unidad.create({
        data: {
          idCooperativa: coop.idCooperativa,
          idTipoUnidad: u.tipoId,
          numeroUnidad: u.numero,
          placa: u.placa,
          estado: 'DISPONIBLE',
        },
      });

      const asientosData = Array.from({ length: u.capacidad }, (_, i) => ({
        idUnidad: unidad!.idUnidad,
        numero: String(i + 1),
        estado: 'DISPONIBLE' as const,
      }));

      await prisma.asiento.createMany({
        data: asientosData,
      });
    }
  }

  // -------------------------------------------------------------
  // 8. PUNTOS, RUTAS Y MATRIZ TARIFARIA
  // -------------------------------------------------------------
  console.log('-> Sembrando puntos de parada y rutas comerciales...');
  const puntosNombres = [
    'Terminal UCA (Managua)',
    'Tipitapa',
    'San Benito',
    'Empalme Boaco',
    'Juigalpa (Terminal Central)',
    'León (Terminal Central)',
  ];

  const puntosMap = new Map<string, number>();
  for (const pNombre of puntosNombres) {
    let punto = await prisma.punto.findFirst({
      where: { nombre: pNombre },
    });
    if (!punto) {
      punto = await prisma.punto.create({
        data: { nombre: pNombre, estado: 'ACTIVO' },
      });
    }
    puntosMap.set(pNombre, punto.idPunto);
  }

  let rutaJuigalpa = await prisma.ruta.findFirst({
    where: { nombre: 'Managua UCA - Juigalpa', idCooperativa: coop.idCooperativa },
  });

  if (!rutaJuigalpa) {
    rutaJuigalpa = await prisma.ruta.create({
      data: {
        idCooperativa: coop.idCooperativa,
        nombre: 'Managua UCA - Juigalpa',
        descripcion: 'Ruta interlocal directa y ordinaria hacia Chontales',
        estado: 'ACTIVO',
      },
    });

    const secuenciaJuigalpa = [
      'Terminal UCA (Managua)',
      'Tipitapa',
      'San Benito',
      'Empalme Boaco',
      'Juigalpa (Terminal Central)',
    ];

    for (let orden = 0; orden < secuenciaJuigalpa.length; orden++) {
      const pId = puntosMap.get(secuenciaJuigalpa[orden])!;
      await prisma.puntoRuta.create({
        data: {
          idRuta: rutaJuigalpa.idRuta,
          idPunto: pId,
          orden: orden + 1,
        },
      });
    }

    const pUca = puntosMap.get('Terminal UCA (Managua)')!;
    const pTipitapa = puntosMap.get('Tipitapa')!;
    const pSanBenito = puntosMap.get('San Benito')!;
    const pEmpalmeBoaco = puntosMap.get('Empalme Boaco')!;
    const pJuigalpa = puntosMap.get('Juigalpa (Terminal Central)')!;

    const tarifasRuta = [
      { origen: pUca, destino: pJuigalpa, monto: 150.0 },
      { origen: pUca, destino: pEmpalmeBoaco, monto: 90.0 },
      { origen: pUca, destino: pSanBenito, monto: 50.0 },
      { origen: pUca, destino: pTipitapa, monto: 35.0 },
      { origen: pSanBenito, destino: pJuigalpa, monto: 100.0 },
      { origen: pEmpalmeBoaco, destino: pJuigalpa, monto: 60.0 },
    ];

    for (const t of tarifasRuta) {
      await prisma.tarifa.create({
        data: {
          idRuta: rutaJuigalpa.idRuta,
          idPuntoOrigen: t.origen,
          idPuntoDestino: t.destino,
          monto: t.monto,
          estado: 'ACTIVO',
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 9. GENERACIÓN DE TURNO Y VIAJE ACTIVO PARA EL AYUDANTE
  // -------------------------------------------------------------
  console.log('-> Generando turno y viaje activo para pruebas del Ayudante...');

  const unidadObj = await prisma.unidad.findFirst({ where: { numeroUnidad: '01' } });
  const ayudanteObj = await prisma.usuario.findFirst({ where: { usuario: 'ayudante_juan' } });

  if (rutaJuigalpa && unidadObj && ayudanteObj) {
    const asignacion = await prisma.asignacionUnidad.create({
      data: {
        idUnidad: unidadObj.idUnidad,
        idUsuario: ayudanteObj.idUsuario,
        fechaHInicio: new Date(),
        estado: 'INICIADA',
      },
    });

    const viaje = await prisma.viaje.create({
      data: {
        idRuta: rutaJuigalpa.idRuta,
        fecha: new Date(),
        hrSalidaProgramada: new Date(),
        estado: 'EN_CURSO',
      },
    });

    const despacho = await prisma.despacho.create({
      data: {
        idViaje: viaje.idViaje,
        idAsignacion: asignacion.idAsignacion,
        estado: 'EN_CURSO',
        observacion: 'Viaje de prueba en ruta Managua - Juigalpa',
      },
    });

    console.log('✅ ¡Turno activo creado con éxito!');
    console.log(`   • ID Viaje: ${viaje.idViaje}`);
    console.log(`   • ID Despacho: ${despacho.idDespacho}`);
    console.log(`   • Unidad: #${unidadObj.numeroUnidad} (Placa: ${unidadObj.placa})`);
  }

  console.log('✅ Siembra de datos completada exitosamente.');
  console.log('----------------------------------------------------');
  console.log('Usuario Ayudante listo para probar (Contraseña: Password123!):');
  console.log('   • Correo: juan.ayudante@cootranstel.com');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra de base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });