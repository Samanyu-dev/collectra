-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "scanMediaId" TEXT;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_scanMediaId_fkey" FOREIGN KEY ("scanMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

