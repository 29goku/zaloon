-- AlterTable: add position column to Waitlist
ALTER TABLE "Waitlist" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
