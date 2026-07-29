-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Salon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "phone" TEXT,
    "email" TEXT,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceFooter" TEXT,
    "businessHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Salon" ("address", "city", "country", "createdAt", "currency", "email", "id", "logo", "name", "phone", "slug", "timezone", "updatedAt") SELECT "address", "city", "country", "createdAt", "currency", "email", "id", "logo", "name", "phone", "slug", "timezone", "updatedAt" FROM "Salon";
DROP TABLE "Salon";
ALTER TABLE "new_Salon" RENAME TO "Salon";
CREATE UNIQUE INDEX "Salon_slug_key" ON "Salon"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
