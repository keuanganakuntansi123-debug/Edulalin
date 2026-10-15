-- Revisi: tambah tabel SiteContent untuk konten publik yang dikelola admin

-- CreateEnum
CREATE TYPE "SiteContentKey" AS ENUM ('HERO_TITLE', 'HERO_SUBTITLE', 'ABOUT_TEXT', 'CONTACT_ADDRESS', 'CONTACT_EMAIL', 'CONTACT_PHONE', 'FAQ');

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL,
    "key" "SiteContentKey" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_key_key" ON "SiteContent"("key");