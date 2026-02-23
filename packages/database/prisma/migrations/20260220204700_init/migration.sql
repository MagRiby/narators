-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('sahih', 'hasan', 'daif', 'mawdu', 'unknown');

-- CreateEnum
CREATE TYPE "Generation" AS ENUM ('sahabi', 'tabii', 'tabi_tabii', 'other');

-- CreateEnum
CREATE TYPE "Reliability" AS ENUM ('thiqah', 'saduq', 'daif', 'matruk', 'unknown');

-- CreateTable
CREATE TABLE "books" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "author_ar" TEXT,
    "author_en" TEXT,
    "description" TEXT,
    "hadith_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "hadith_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hadiths" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "chapter_id" INTEGER,
    "number" INTEGER NOT NULL,
    "number_in_book" INTEGER,
    "text_ar" TEXT NOT NULL,
    "text_en" TEXT,
    "grade" "Grade",
    "grade_ar" TEXT,
    "reference" TEXT,
    "source_id" TEXT,

    CONSTRAINT "hadiths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "narrators" (
    "id" SERIAL NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "kunya_ar" TEXT,
    "kunya_en" TEXT,
    "laqab" TEXT,
    "birth_year_h" INTEGER,
    "death_year_h" INTEGER,
    "birth_year_ce" INTEGER,
    "death_year_ce" INTEGER,
    "generation" "Generation",
    "region" TEXT,
    "reliability" "Reliability",
    "reliability_ar" TEXT,
    "biography" TEXT,
    "biography_ar" TEXT,
    "source_id" TEXT,

    CONSTRAINT "narrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hadith_narrators" (
    "hadith_id" INTEGER NOT NULL,
    "narrator_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "role" TEXT,

    CONSTRAINT "hadith_narrators_pkey" PRIMARY KEY ("hadith_id","narrator_id")
);

-- CreateTable
CREATE TABLE "narrator_relationships" (
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,

    CONSTRAINT "narrator_relationships_pkey" PRIMARY KEY ("teacher_id","student_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE INDEX "chapters_book_id_idx" ON "chapters"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_book_id_number_key" ON "chapters"("book_id", "number");

-- CreateIndex
CREATE INDEX "hadiths_book_id_idx" ON "hadiths"("book_id");

-- CreateIndex
CREATE INDEX "hadiths_chapter_id_idx" ON "hadiths"("chapter_id");

-- CreateIndex
CREATE INDEX "hadiths_grade_idx" ON "hadiths"("grade");

-- CreateIndex
CREATE INDEX "hadiths_source_id_idx" ON "hadiths"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "narrators_source_id_key" ON "narrators"("source_id");

-- CreateIndex
CREATE INDEX "narrators_name_ar_idx" ON "narrators"("name_ar");

-- CreateIndex
CREATE INDEX "narrators_reliability_idx" ON "narrators"("reliability");

-- CreateIndex
CREATE INDEX "hadith_narrators_narrator_id_idx" ON "hadith_narrators"("narrator_id");

-- CreateIndex
CREATE INDEX "narrator_relationships_teacher_id_idx" ON "narrator_relationships"("teacher_id");

-- CreateIndex
CREATE INDEX "narrator_relationships_student_id_idx" ON "narrator_relationships"("student_id");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadiths" ADD CONSTRAINT "hadiths_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadiths" ADD CONSTRAINT "hadiths_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadith_narrators" ADD CONSTRAINT "hadith_narrators_hadith_id_fkey" FOREIGN KEY ("hadith_id") REFERENCES "hadiths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadith_narrators" ADD CONSTRAINT "hadith_narrators_narrator_id_fkey" FOREIGN KEY ("narrator_id") REFERENCES "narrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrator_relationships" ADD CONSTRAINT "narrator_relationships_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "narrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrator_relationships" ADD CONSTRAINT "narrator_relationships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "narrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
