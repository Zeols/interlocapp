/*
  Warnings:

  - You are about to drop the column `idAyudante` on the `asignaciones_unidad` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "asignaciones_unidad" DROP CONSTRAINT "asignaciones_unidad_idAyudante_fkey";

-- AlterTable
ALTER TABLE "asignaciones_unidad" DROP COLUMN "idAyudante";
