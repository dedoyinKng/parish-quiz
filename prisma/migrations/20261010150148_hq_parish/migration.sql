-- AlterTable
ALTER TABLE "OrgUnit" ADD COLUMN     "hqParishId" TEXT;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_hqParishId_fkey" FOREIGN KEY ("hqParishId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
