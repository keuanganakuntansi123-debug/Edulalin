-- CreateEnum
CREATE TYPE "QuizSourceType" AS ENUM ('MANUAL', 'PDF');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('MODULE_CONTENT', 'QUIZ_PDF', 'AVATAR');

-- AlterEnum
ALTER TYPE "QuizStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "contentFileId" TEXT,
ADD COLUMN     "thumbnailFileId" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "sourceFileId" TEXT,
ADD COLUMN     "sourceType" "QuizSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "QuizQuestion" ALTER COLUMN "correctOption" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "ModuleToSchool" (
    "moduleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "ModuleToSchool_pkey" PRIMARY KEY ("moduleId","schoolId")
);

-- CreateTable
CREATE TABLE "QuizToSchool" (
    "quizId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "QuizToSchool_pkey" PRIMARY KEY ("quizId","schoolId")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" "FileKind" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleToSchool_schoolId_idx" ON "ModuleToSchool"("schoolId");

-- CreateIndex
CREATE INDEX "QuizToSchool_schoolId_idx" ON "QuizToSchool"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_storedName_key" ON "UploadedFile"("storedName");

-- CreateIndex
CREATE INDEX "UploadedFile_ownerId_idx" ON "UploadedFile"("ownerId");

-- CreateIndex
CREATE INDEX "UploadedFile_kind_idx" ON "UploadedFile"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Module_thumbnailFileId_key" ON "Module"("thumbnailFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_contentFileId_key" ON "Module"("contentFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_sourceFileId_key" ON "Quiz"("sourceFileId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_contentFileId_fkey" FOREIGN KEY ("contentFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleToSchool" ADD CONSTRAINT "ModuleToSchool_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleToSchool" ADD CONSTRAINT "ModuleToSchool_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizToSchool" ADD CONSTRAINT "QuizToSchool_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizToSchool" ADD CONSTRAINT "QuizToSchool_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
