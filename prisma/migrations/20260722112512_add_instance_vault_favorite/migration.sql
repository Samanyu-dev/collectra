-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVaulted" BOOLEAN NOT NULL DEFAULT false;
