-- AlterTable
ALTER TABLE "asignaciones_unidad" ADD COLUMN     "idAyudante" INTEGER;

-- AddForeignKey
ALTER TABLE "asignaciones_unidad" ADD CONSTRAINT "asignaciones_unidad_idAyudante_fkey" FOREIGN KEY ("idAyudante") REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;
