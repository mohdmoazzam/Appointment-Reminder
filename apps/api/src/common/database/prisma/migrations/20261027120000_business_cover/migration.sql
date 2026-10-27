-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "cover_asset_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "businesses_cover_asset_id_key" ON "businesses"("cover_asset_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
