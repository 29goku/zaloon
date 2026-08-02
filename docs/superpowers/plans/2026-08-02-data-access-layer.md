# Data Access Layer (Repository Pattern) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all direct Prisma calls out of 40+ Server Action files into a typed repository layer at `src/lib/repositories/`, eliminating duplicated salon resolution, fixing cross-tenant leaks, and making the data layer independently testable.

**Architecture:** Each repository file owns one Prisma model domain and exposes typed async functions that accept an explicit `salonId` parameter. A shared `src/lib/repositories/base.ts` provides `getCurrentSalonId()` (reads the JWT via `auth()`) and `getSalonBySlug(slug)` for public routes. All action files are refactored to call repositories instead of Prisma directly.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma ORM, NextAuth v5 (`auth()` from `@/lib/auth`), `server-only` package.

## Global Constraints

- All repository files must begin with `"use server"` or import from a `"server-only"` module — never ship Prisma to the client bundle.
- Never use `prisma.salon.findFirst()` inside action files after this refactor — all salon resolution goes through `getCurrentSalonId()` or `getSalonBySlug()` from `base.ts`.
- All repository functions accept `salonId: string` as their first or a required named parameter.
- Return types must be explicit TypeScript types — no `any`.
- Do NOT change any UI component files, page files, or API route files — only action files and new repository files.
- Do NOT change the Prisma schema.
- Run `npx tsc --noEmit` after each task to verify no type errors.

---

## File Map

### New files to create

```
src/lib/repositories/
  base.ts             — getCurrentSalonId(), getSalonBySlug(), type SalonContext
  salon.ts            — getSalon(), updateSalon(), businessHours blob read/write helpers
  appointments.ts     — all appointment queries
  clients.ts          — all client queries
  invoices.ts         — all invoice + partial-payment queries
  staff.ts            — staff + shifts + time-off queries
  services.ts         — service + category queries
  inventory.ts        — inventory item + transaction queries
  campaigns.ts        — campaign queries
  reminders.ts        — reminder queries
  reviews.ts          — review queries
  waitlist.ts         — waitlist queries
  coupons.ts          — coupon queries
  gift-cards.ts       — gift card + transaction queries
  memberships.ts      — membership plan + client membership queries
  expenses.ts         — expense queries
  ledger.ts           — ledger entry queries
  tips.ts             — tip queries (via Invoice/InvoiceItem)
  payroll.ts          — payroll record queries
  index.ts            — barrel re-export of all repositories
```

### Action files to modify (refactor only — no logic changes)

```
src/app/actions/appointments.ts
src/app/actions/clients.ts
src/app/actions/invoices.ts
src/app/actions/staff.ts
src/app/actions/services.ts
src/app/actions/inventory.ts
src/app/actions/campaigns.ts
src/app/actions/reminders.ts
src/app/actions/reviews.ts
src/app/actions/waitlist.ts
src/app/actions/coupons.ts
src/app/actions/gift-cards.ts
src/app/actions/memberships.ts
src/app/actions/expenses.ts
src/app/actions/ledger.ts
src/app/actions/tips.ts
src/app/actions/payroll.ts
src/app/actions/shifts.ts
src/app/actions/settings.ts
src/app/actions/billing.ts
src/app/actions/booking.ts
src/app/actions/branches.ts
src/app/actions/budget.ts
src/app/actions/packages.ts
src/app/actions/policies.ts
src/app/actions/pricing-rules.ts
src/app/actions/templates.ts
src/app/actions/timetracking.ts
src/app/actions/notifications.ts
src/app/actions/search.ts
src/app/actions/onboarding.ts
src/app/actions/portal.ts
src/app/actions/kiosk.ts
src/app/actions/intake.ts
src/app/actions/export.ts
src/app/actions/automations.ts
src/lib/activity-feed.ts
src/lib/segments.ts
```

---

## Task 1: Base Repository — `getCurrentSalonId` and `getSalonBySlug`

**Files:**
- Create: `src/lib/repositories/base.ts`

**Interfaces:**
- Produces:
  - `getCurrentSalonId(): Promise<string>` — resolves from `prisma.salon.findFirstOrThrow({ select: { id: true } })`
  - `getSalonBySlug(slug: string): Promise<{ id: string; slug: string; name: string }>` — throws if not found
  - `type SalonContext = { salonId: string }`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/repositories/base.ts
import "server-only"
import { prisma } from "@/lib/prisma"

export type SalonContext = { salonId: string }

export async function getCurrentSalonId(): Promise<string> {
  const salon = await prisma.salon.findFirstOrThrow({ select: { id: true } })
  return salon.id
}

export async function getSalonBySlug(slug: string): Promise<{ id: string; slug: string; name: string }> {
  const salon = await prisma.salon.findUniqueOrThrow({
    where: { slug },
    select: { id: true, slug: true, name: true },
  })
  return salon
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors related to `base.ts`.

---

## Task 2: Salon Repository — businessHours blob helpers

**Files:**
- Create: `src/lib/repositories/salon.ts`

**Interfaces:**
- Consumes: `getCurrentSalonId` from `./base`
- Produces:
  - `readSalonBlob(salonId: string): Promise<Record<string, unknown>>`
  - `writeSalonBlobKey(salonId: string, key: string, value: unknown): Promise<void>`
  - `getSalon(salonId: string): Promise<Salon>` (full Salon record)
  - `updateSalon(salonId: string, data: Prisma.SalonUpdateInput): Promise<Salon>`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/repositories/salon.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma, Salon } from "@prisma/client"

export async function getSalon(salonId: string): Promise<Salon> {
  return prisma.salon.findUniqueOrThrow({ where: { id: salonId } })
}

export async function updateSalon(salonId: string, data: Prisma.SalonUpdateInput): Promise<Salon> {
  return prisma.salon.update({ where: { id: salonId }, data })
}

export async function readSalonBlob(salonId: string): Promise<Record<string, unknown>> {
  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: salonId },
    select: { businessHours: true },
  })
  if (!salon.businessHours) return {}
  try {
    return JSON.parse(salon.businessHours) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function writeSalonBlobKey(salonId: string, key: string, value: unknown): Promise<void> {
  const existing = await readSalonBlob(salonId)
  const updated = { ...existing, [key]: value }
  await prisma.salon.update({
    where: { id: salonId },
    data: { businessHours: JSON.stringify(updated) },
  })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 3: Appointments Repository

**Files:**
- Create: `src/lib/repositories/appointments.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`
- Produces (key functions extracted from `actions/appointments.ts`):
  - `getAppointments(salonId: string, filter?: { date?: string; staffId?: string; status?: string }): Promise<Appointment[]>`
  - `getAppointmentById(id: string, salonId: string): Promise<Appointment | null>`
  - `createAppointmentRecord(salonId: string, data: AppointmentCreateData): Promise<Appointment>`
  - `updateAppointmentRecord(id: string, salonId: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment>`
  - `deleteAppointmentRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Read the current appointments action to understand query shapes**

Read: `src/app/actions/appointments.ts` lines 1-200

- [ ] **Step 2: Create the repository**

```typescript
// src/lib/repositories/appointments.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Appointment, Prisma } from "@prisma/client"

export async function getAppointments(
  salonId: string,
  filter?: { date?: string; staffId?: string; status?: string }
): Promise<Appointment[]> {
  const where: Prisma.AppointmentWhereInput = { salonId }
  if (filter?.status) where.status = filter.status
  if (filter?.staffId) {
    where.services = { some: { staffId: filter.staffId } }
  }
  if (filter?.date) {
    const start = new Date(filter.date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(filter.date)
    end.setHours(23, 59, 59, 999)
    where.startTime = { gte: start, lte: end }
  }
  return prisma.appointment.findMany({
    where,
    include: {
      client: true,
      services: { include: { service: true, staff: true } },
    },
    orderBy: { startTime: "asc" },
  })
}

export async function getAppointmentById(
  id: string,
  salonId: string
): Promise<Appointment | null> {
  return prisma.appointment.findFirst({
    where: { id, salonId },
    include: {
      client: true,
      services: { include: { service: true, staff: true } },
    },
  })
}

export async function updateAppointmentRecord(
  id: string,
  salonId: string,
  data: Prisma.AppointmentUpdateInput
): Promise<Appointment> {
  return prisma.appointment.update({
    where: { id },
    data: { ...data, salonId },
  })
}

export async function deleteAppointmentRecord(id: string, salonId: string): Promise<void> {
  await prisma.appointment.delete({ where: { id, salonId } })
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 4: Clients Repository

**Files:**
- Create: `src/lib/repositories/clients.ts`

**Interfaces:**
- Produces:
  - `getClients(salonId: string, filter?: ClientFilter): Promise<Client[]>`
  - `getClientById(id: string, salonId: string): Promise<Client | null>`
  - `createClientRecord(salonId: string, data: Prisma.ClientCreateInput): Promise<Client>`
  - `updateClientRecord(id: string, salonId: string, data: Prisma.ClientUpdateInput): Promise<Client>`
  - `deleteClientRecord(id: string, salonId: string): Promise<void>`
  - `searchClientsByQuery(salonId: string, query: string): Promise<Client[]>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/clients.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Client, Prisma } from "@prisma/client"

export type ClientFilter = {
  query?: string
  tag?: string
  isVip?: boolean
  limit?: number
}

export async function getClients(
  salonId: string,
  filter?: ClientFilter
): Promise<Client[]> {
  const where: Prisma.ClientWhereInput = { salonId }
  if (filter?.isVip) where.isVip = true
  if (filter?.query) {
    where.OR = [
      { firstName: { contains: filter.query, mode: "insensitive" } },
      { lastName: { contains: filter.query, mode: "insensitive" } },
      { email: { contains: filter.query, mode: "insensitive" } },
      { phone: { contains: filter.query, mode: "insensitive" } },
    ]
  }
  return prisma.client.findMany({
    where,
    orderBy: { firstName: "asc" },
    take: filter?.limit,
  })
}

export async function getClientById(id: string, salonId: string): Promise<Client | null> {
  return prisma.client.findFirst({ where: { id, salonId } })
}

export async function createClientRecord(
  salonId: string,
  data: Omit<Prisma.ClientUncheckedCreateInput, "salonId">
): Promise<Client> {
  return prisma.client.create({ data: { ...data, salonId } })
}

export async function updateClientRecord(
  id: string,
  salonId: string,
  data: Prisma.ClientUpdateInput
): Promise<Client> {
  return prisma.client.update({ where: { id }, data: { ...data, salonId } })
}

export async function deleteClientRecord(id: string, salonId: string): Promise<void> {
  await prisma.client.delete({ where: { id, salonId } })
}

export async function searchClientsByQuery(salonId: string, query: string): Promise<Client[]> {
  return getClients(salonId, { query, limit: 20 })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 5: Invoices Repository

**Files:**
- Create: `src/lib/repositories/invoices.ts`

**Interfaces:**
- Produces:
  - `getInvoices(salonId: string, filter?: InvoiceFilter): Promise<Invoice[]>`
  - `getInvoiceById(id: string, salonId: string): Promise<Invoice | null>`
  - `createInvoiceRecord(salonId: string, data: InvoiceCreateData): Promise<Invoice>`
  - `updateInvoiceRecord(id: string, salonId: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice>`
  - `deleteInvoiceRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/invoices.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Invoice, Prisma } from "@prisma/client"

export type InvoiceFilter = {
  status?: string
  clientId?: string
  from?: Date
  to?: Date
  limit?: number
}

export async function getInvoices(
  salonId: string,
  filter?: InvoiceFilter
): Promise<Invoice[]> {
  const where: Prisma.InvoiceWhereInput = { salonId }
  if (filter?.status) where.status = filter.status
  if (filter?.clientId) where.clientId = filter.clientId
  if (filter?.from || filter?.to) {
    where.createdAt = {}
    if (filter.from) where.createdAt.gte = filter.from
    if (filter.to) where.createdAt.lte = filter.to
  }
  return prisma.invoice.findMany({
    where,
    include: { client: true, items: true, partialPayments: true },
    orderBy: { createdAt: "desc" },
    take: filter?.limit,
  })
}

export async function getInvoiceById(id: string, salonId: string): Promise<Invoice | null> {
  return prisma.invoice.findFirst({
    where: { id, salonId },
    include: { client: true, items: true, partialPayments: true },
  })
}

export async function updateInvoiceRecord(
  id: string,
  salonId: string,
  data: Prisma.InvoiceUpdateInput
): Promise<Invoice> {
  return prisma.invoice.update({ where: { id, salonId }, data })
}

export async function deleteInvoiceRecord(id: string, salonId: string): Promise<void> {
  await prisma.invoice.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 6: Staff Repository

**Files:**
- Create: `src/lib/repositories/staff.ts`

**Interfaces:**
- Produces:
  - `getStaff(salonId: string): Promise<Staff[]>`
  - `getStaffById(id: string, salonId: string): Promise<Staff | null>`
  - `createStaffRecord(salonId: string, data: Omit<Prisma.StaffUncheckedCreateInput, "salonId">): Promise<Staff>`
  - `updateStaffRecord(id: string, salonId: string, data: Prisma.StaffUpdateInput): Promise<Staff>`
  - `deleteStaffRecord(id: string, salonId: string): Promise<void>`
  - `getShiftsByStaff(staffId: string): Promise<Shift[]>`
  - `getTimeOffBySalon(salonId: string): Promise<TimeOff[]>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/staff.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Staff, Shift, TimeOff, Prisma } from "@prisma/client"

export async function getStaff(salonId: string): Promise<Staff[]> {
  return prisma.staff.findMany({
    where: { salonId },
    include: { services: { include: { service: true } }, shifts: true },
    orderBy: { name: "asc" },
  })
}

export async function getStaffById(id: string, salonId: string): Promise<Staff | null> {
  return prisma.staff.findFirst({
    where: { id, salonId },
    include: { services: { include: { service: true } }, shifts: true },
  })
}

export async function createStaffRecord(
  salonId: string,
  data: Omit<Prisma.StaffUncheckedCreateInput, "salonId">
): Promise<Staff> {
  return prisma.staff.create({ data: { ...data, salonId } })
}

export async function updateStaffRecord(
  id: string,
  salonId: string,
  data: Prisma.StaffUpdateInput
): Promise<Staff> {
  return prisma.staff.update({ where: { id, salonId }, data })
}

export async function deleteStaffRecord(id: string, salonId: string): Promise<void> {
  await prisma.staff.delete({ where: { id, salonId } })
}

export async function getShiftsByStaff(staffId: string): Promise<Shift[]> {
  return prisma.shift.findMany({ where: { staffId }, orderBy: { dayOfWeek: "asc" } })
}

export async function getShiftsBySalon(salonId: string): Promise<Shift[]> {
  return prisma.shift.findMany({
    where: { staff: { salonId } },
    include: { staff: true },
  })
}

export async function getTimeOffBySalon(salonId: string): Promise<TimeOff[]> {
  return prisma.timeOff.findMany({
    where: { staff: { salonId } },
    include: { staff: true },
    orderBy: { startDate: "asc" },
  })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 7: Services Repository

**Files:**
- Create: `src/lib/repositories/services.ts`

**Interfaces:**
- Produces:
  - `getServices(salonId: string): Promise<Service[]>`
  - `getServiceById(id: string, salonId: string): Promise<Service | null>`
  - `createServiceRecord(salonId: string, data: Omit<Prisma.ServiceUncheckedCreateInput, "salonId">): Promise<Service>`
  - `updateServiceRecord(id: string, salonId: string, data: Prisma.ServiceUpdateInput): Promise<Service>`
  - `deleteServiceRecord(id: string, salonId: string): Promise<void>`
  - `getCategories(salonId: string): Promise<ServiceCategory[]>`
  - `createCategoryRecord(salonId: string, name: string): Promise<ServiceCategory>`
  - `deleteCategoryRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/services.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Service, ServiceCategory, Prisma } from "@prisma/client"

export async function getServices(salonId: string): Promise<Service[]> {
  return prisma.service.findMany({
    where: { salonId },
    include: { category: true },
    orderBy: { name: "asc" },
  })
}

export async function getServiceById(id: string, salonId: string): Promise<Service | null> {
  return prisma.service.findFirst({ where: { id, salonId }, include: { category: true } })
}

export async function createServiceRecord(
  salonId: string,
  data: Omit<Prisma.ServiceUncheckedCreateInput, "salonId">
): Promise<Service> {
  return prisma.service.create({ data: { ...data, salonId } })
}

export async function updateServiceRecord(
  id: string,
  salonId: string,
  data: Prisma.ServiceUpdateInput
): Promise<Service> {
  return prisma.service.update({ where: { id, salonId }, data })
}

export async function deleteServiceRecord(id: string, salonId: string): Promise<void> {
  await prisma.service.delete({ where: { id, salonId } })
}

export async function getCategories(salonId: string): Promise<ServiceCategory[]> {
  return prisma.serviceCategory.findMany({
    where: { salonId },
    include: { services: true },
    orderBy: { name: "asc" },
  })
}

export async function createCategoryRecord(salonId: string, name: string): Promise<ServiceCategory> {
  const { randomUUID } = await import("crypto")
  return prisma.serviceCategory.create({ data: { id: randomUUID(), salonId, name } })
}

export async function deleteCategoryRecord(id: string, salonId: string): Promise<void> {
  await prisma.serviceCategory.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 8: Reviews Repository

**Files:**
- Create: `src/lib/repositories/reviews.ts`

**Interfaces:**
- Produces:
  - `getReviews(salonId: string, filter?: ReviewFilter): Promise<Review[]>`
  - `getAverageRating(salonId: string): Promise<number>`
  - `updateReviewRecord(id: string, salonId: string, data: Prisma.ReviewUpdateInput): Promise<Review>`
  - `deleteReviewRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/reviews.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Review, Prisma } from "@prisma/client"

export type ReviewFilter = { staffId?: string; minRating?: number; limit?: number }

export async function getReviews(salonId: string, filter?: ReviewFilter): Promise<Review[]> {
  const where: Prisma.ReviewWhereInput = { salonId }
  if (filter?.staffId) where.staffId = filter.staffId
  if (filter?.minRating) where.rating = { gte: filter.minRating }
  return prisma.review.findMany({
    where,
    include: { client: true, staff: true, appointment: true },
    orderBy: { createdAt: "desc" },
    take: filter?.limit,
  })
}

export async function getAverageRating(salonId: string): Promise<number> {
  const result = await prisma.review.aggregate({
    where: { salonId },
    _avg: { rating: true },
  })
  return result._avg.rating ?? 0
}

export async function getRatingDistribution(
  salonId: string
): Promise<Record<number, number>> {
  const reviews = await prisma.review.findMany({ where: { salonId }, select: { rating: true } })
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const key = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
    if (key >= 1 && key <= 5) dist[key]++
  }
  return dist
}

export async function updateReviewRecord(
  id: string,
  salonId: string,
  data: Prisma.ReviewUpdateInput
): Promise<Review> {
  return prisma.review.update({ where: { id, salonId }, data })
}

export async function deleteReviewRecord(id: string, salonId: string): Promise<void> {
  await prisma.review.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 9: Reminders Repository

**Files:**
- Create: `src/lib/repositories/reminders.ts`

**Interfaces:**
- Produces:
  - `getReminders(salonId: string, filter?: ReminderFilter): Promise<Reminder[]>`
  - `getPendingReminderCount(salonId: string): Promise<number>`
  - `createReminderRecord(salonId: string, data: Omit<Prisma.ReminderUncheckedCreateInput, "salonId">): Promise<Reminder>`
  - `updateReminderRecord(id: string, salonId: string, data: Prisma.ReminderUpdateInput): Promise<Reminder>`
  - `deleteReminderRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/reminders.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Reminder, Prisma } from "@prisma/client"

export type ReminderFilter = { status?: string; type?: string; limit?: number }

export async function getReminders(salonId: string, filter?: ReminderFilter): Promise<Reminder[]> {
  const where: Prisma.ReminderWhereInput = { salonId }
  if (filter?.status) where.status = filter.status
  if (filter?.type) where.type = filter.type
  return prisma.reminder.findMany({
    where,
    include: { appointment: { include: { client: true } } },
    orderBy: { scheduledFor: "asc" },
    take: filter?.limit,
  })
}

export async function getPendingReminderCount(salonId: string): Promise<number> {
  return prisma.reminder.count({ where: { salonId, status: "PENDING" } })
}

export async function createReminderRecord(
  salonId: string,
  data: Omit<Prisma.ReminderUncheckedCreateInput, "salonId">
): Promise<Reminder> {
  const { randomUUID } = await import("crypto")
  return prisma.reminder.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateReminderRecord(
  id: string,
  salonId: string,
  data: Prisma.ReminderUpdateInput
): Promise<Reminder> {
  return prisma.reminder.update({ where: { id, salonId }, data })
}

export async function deleteReminderRecord(id: string, salonId: string): Promise<void> {
  await prisma.reminder.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 10: Inventory Repository

**Files:**
- Create: `src/lib/repositories/inventory.ts`

**Interfaces:**
- Produces:
  - `getInventory(salonId: string, filter?: InventoryFilter): Promise<InventoryItem[]>`
  - `getInventoryItemById(id: string, salonId: string): Promise<InventoryItem | null>`
  - `createInventoryItemRecord(salonId: string, data: Omit<Prisma.InventoryItemUncheckedCreateInput, "salonId">): Promise<InventoryItem>`
  - `updateInventoryItemRecord(id: string, salonId: string, data: Prisma.InventoryItemUpdateInput): Promise<InventoryItem>`
  - `deleteInventoryItemRecord(id: string, salonId: string): Promise<void>`
  - `createInventoryTransaction(data: Prisma.InventoryTransactionUncheckedCreateInput): Promise<InventoryTransaction>`
  - `getInventoryTransactions(salonId: string, itemId?: string): Promise<InventoryTransaction[]>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/inventory.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { InventoryItem, InventoryTransaction, Prisma } from "@prisma/client"

export type InventoryFilter = { category?: string; lowStock?: boolean; limit?: number }

export async function getInventory(salonId: string, filter?: InventoryFilter): Promise<InventoryItem[]> {
  const where: Prisma.InventoryItemWhereInput = { salonId }
  if (filter?.category) where.category = filter.category
  if (filter?.lowStock) where.quantity = { lte: prisma.inventoryItem.fields.reorderPoint }
  return prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    take: filter?.limit,
  })
}

export async function getInventoryItemById(id: string, salonId: string): Promise<InventoryItem | null> {
  return prisma.inventoryItem.findFirst({ where: { id, salonId } })
}

export async function createInventoryItemRecord(
  salonId: string,
  data: Omit<Prisma.InventoryItemUncheckedCreateInput, "salonId">
): Promise<InventoryItem> {
  const { randomUUID } = await import("crypto")
  return prisma.inventoryItem.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateInventoryItemRecord(
  id: string,
  salonId: string,
  data: Prisma.InventoryItemUpdateInput
): Promise<InventoryItem> {
  return prisma.inventoryItem.update({ where: { id, salonId }, data })
}

export async function deleteInventoryItemRecord(id: string, salonId: string): Promise<void> {
  await prisma.inventoryItem.delete({ where: { id, salonId } })
}

export async function createInventoryTransaction(
  data: Prisma.InventoryTransactionUncheckedCreateInput
): Promise<InventoryTransaction> {
  const { randomUUID } = await import("crypto")
  return prisma.inventoryTransaction.create({ data: { ...data, id: data.id ?? randomUUID() } })
}

export async function getInventoryTransactions(
  salonId: string,
  itemId?: string
): Promise<InventoryTransaction[]> {
  return prisma.inventoryTransaction.findMany({
    where: { item: { salonId }, ...(itemId ? { itemId } : {}) },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 11: Expenses Repository

**Files:**
- Create: `src/lib/repositories/expenses.ts`

**Interfaces:**
- Produces:
  - `getExpenses(salonId: string, filter?: ExpenseFilter): Promise<Expense[]>`
  - `createExpenseRecord(salonId: string, data: Omit<Prisma.ExpenseUncheckedCreateInput, "salonId">): Promise<Expense>`
  - `updateExpenseRecord(id: string, salonId: string, data: Prisma.ExpenseUpdateInput): Promise<Expense>`
  - `deleteExpenseRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/expenses.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Expense, Prisma } from "@prisma/client"

export type ExpenseFilter = { category?: string; from?: Date; to?: Date; limit?: number }

export async function getExpenses(salonId: string, filter?: ExpenseFilter): Promise<Expense[]> {
  const where: Prisma.ExpenseWhereInput = { salonId }
  if (filter?.category) where.category = filter.category
  if (filter?.from || filter?.to) {
    where.date = {}
    if (filter.from) where.date.gte = filter.from
    if (filter.to) where.date.lte = filter.to
  }
  return prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    take: filter?.limit,
  })
}

export async function createExpenseRecord(
  salonId: string,
  data: Omit<Prisma.ExpenseUncheckedCreateInput, "salonId">
): Promise<Expense> {
  const { randomUUID } = await import("crypto")
  return prisma.expense.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateExpenseRecord(
  id: string,
  salonId: string,
  data: Prisma.ExpenseUpdateInput
): Promise<Expense> {
  return prisma.expense.update({ where: { id, salonId }, data })
}

export async function deleteExpenseRecord(id: string, salonId: string): Promise<void> {
  await prisma.expense.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 12: Waitlist Repository

**Files:**
- Create: `src/lib/repositories/waitlist.ts`

**Interfaces:**
- Produces:
  - `getWaitlistBySalon(salonId: string): Promise<Waitlist[]>`
  - `createWaitlistRecord(salonId: string, data: Omit<Prisma.WaitlistUncheckedCreateInput, "salonId">): Promise<Waitlist>`
  - `deleteWaitlistRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/waitlist.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Waitlist, Prisma } from "@prisma/client"

export async function getWaitlistBySalon(salonId: string): Promise<Waitlist[]> {
  return prisma.waitlist.findMany({
    where: { salonId },
    include: { client: true, service: true, preferredStaff: true },
    orderBy: { createdAt: "asc" },
  })
}

export async function createWaitlistRecord(
  salonId: string,
  data: Omit<Prisma.WaitlistUncheckedCreateInput, "salonId">
): Promise<Waitlist> {
  const { randomUUID } = await import("crypto")
  return prisma.waitlist.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function deleteWaitlistRecord(id: string, salonId: string): Promise<void> {
  await prisma.waitlist.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 13: Coupons Repository

**Files:**
- Create: `src/lib/repositories/coupons.ts`

**Interfaces:**
- Produces:
  - `getCoupons(salonId: string): Promise<Coupon[]>`
  - `getCouponByCode(code: string, salonId: string): Promise<Coupon | null>`
  - `createCouponRecord(salonId: string, data: Omit<Prisma.CouponUncheckedCreateInput, "salonId">): Promise<Coupon>`
  - `updateCouponRecord(id: string, salonId: string, data: Prisma.CouponUpdateInput): Promise<Coupon>`
  - `deleteCouponRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/coupons.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Coupon, Prisma } from "@prisma/client"

export async function getCoupons(salonId: string): Promise<Coupon[]> {
  return prisma.coupon.findMany({ where: { salonId }, orderBy: { createdAt: "desc" } })
}

export async function getCouponByCode(code: string, salonId: string): Promise<Coupon | null> {
  return prisma.coupon.findFirst({ where: { code, salonId } })
}

export async function createCouponRecord(
  salonId: string,
  data: Omit<Prisma.CouponUncheckedCreateInput, "salonId">
): Promise<Coupon> {
  const { randomUUID } = await import("crypto")
  return prisma.coupon.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateCouponRecord(
  id: string,
  salonId: string,
  data: Prisma.CouponUpdateInput
): Promise<Coupon> {
  return prisma.coupon.update({ where: { id, salonId }, data })
}

export async function deleteCouponRecord(id: string, salonId: string): Promise<void> {
  await prisma.coupon.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 14: Gift Cards Repository

**Files:**
- Create: `src/lib/repositories/gift-cards.ts`

**Interfaces:**
- Produces:
  - `getGiftCards(salonId: string): Promise<GiftCard[]>`
  - `getGiftCardByCode(code: string, salonId: string): Promise<GiftCard | null>`
  - `createGiftCardRecord(salonId: string, data: Omit<Prisma.GiftCardUncheckedCreateInput, "salonId">): Promise<GiftCard>`
  - `updateGiftCardRecord(id: string, salonId: string, data: Prisma.GiftCardUpdateInput): Promise<GiftCard>`
  - `createGiftCardTransaction(data: Prisma.GiftCardTransactionUncheckedCreateInput): Promise<GiftCardTransaction>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/gift-cards.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { GiftCard, GiftCardTransaction, Prisma } from "@prisma/client"

export async function getGiftCards(salonId: string): Promise<GiftCard[]> {
  return prisma.giftCard.findMany({
    where: { salonId },
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getGiftCardByCode(code: string, salonId: string): Promise<GiftCard | null> {
  return prisma.giftCard.findFirst({ where: { code, salonId }, include: { transactions: true } })
}

export async function createGiftCardRecord(
  salonId: string,
  data: Omit<Prisma.GiftCardUncheckedCreateInput, "salonId">
): Promise<GiftCard> {
  const { randomUUID } = await import("crypto")
  return prisma.giftCard.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateGiftCardRecord(
  id: string,
  salonId: string,
  data: Prisma.GiftCardUpdateInput
): Promise<GiftCard> {
  return prisma.giftCard.update({ where: { id, salonId }, data })
}

export async function createGiftCardTransaction(
  data: Prisma.GiftCardTransactionUncheckedCreateInput
): Promise<GiftCardTransaction> {
  const { randomUUID } = await import("crypto")
  return prisma.giftCardTransaction.create({ data: { ...data, id: data.id ?? randomUUID() } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 15: Memberships Repository

**Files:**
- Create: `src/lib/repositories/memberships.ts`

**Interfaces:**
- Produces:
  - `getMembershipPlans(salonId: string): Promise<MembershipPlan[]>`
  - `createMembershipPlanRecord(salonId: string, data: Omit<Prisma.MembershipPlanUncheckedCreateInput, "salonId">): Promise<MembershipPlan>`
  - `updateMembershipPlanRecord(id: string, salonId: string, data: Prisma.MembershipPlanUpdateInput): Promise<MembershipPlan>`
  - `deleteMembershipPlanRecord(id: string, salonId: string): Promise<void>`
  - `getClientMemberships(salonId: string, clientId?: string): Promise<ClientMembership[]>`
  - `createClientMembershipRecord(data: Prisma.ClientMembershipUncheckedCreateInput): Promise<ClientMembership>`
  - `updateClientMembershipRecord(id: string, data: Prisma.ClientMembershipUpdateInput): Promise<ClientMembership>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/memberships.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { MembershipPlan, ClientMembership, Prisma } from "@prisma/client"

export async function getMembershipPlans(salonId: string): Promise<MembershipPlan[]> {
  return prisma.membershipPlan.findMany({ where: { salonId }, orderBy: { name: "asc" } })
}

export async function createMembershipPlanRecord(
  salonId: string,
  data: Omit<Prisma.MembershipPlanUncheckedCreateInput, "salonId">
): Promise<MembershipPlan> {
  const { randomUUID } = await import("crypto")
  return prisma.membershipPlan.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateMembershipPlanRecord(
  id: string,
  salonId: string,
  data: Prisma.MembershipPlanUpdateInput
): Promise<MembershipPlan> {
  return prisma.membershipPlan.update({ where: { id, salonId }, data })
}

export async function deleteMembershipPlanRecord(id: string, salonId: string): Promise<void> {
  await prisma.membershipPlan.delete({ where: { id, salonId } })
}

export async function getClientMemberships(salonId: string, clientId?: string): Promise<ClientMembership[]> {
  return prisma.clientMembership.findMany({
    where: { plan: { salonId }, ...(clientId ? { clientId } : {}) },
    include: { plan: true, client: true },
    orderBy: { startDate: "desc" },
  })
}

export async function createClientMembershipRecord(
  data: Prisma.ClientMembershipUncheckedCreateInput
): Promise<ClientMembership> {
  const { randomUUID } = await import("crypto")
  return prisma.clientMembership.create({ data: { ...data, id: data.id ?? randomUUID() } })
}

export async function updateClientMembershipRecord(
  id: string,
  data: Prisma.ClientMembershipUpdateInput
): Promise<ClientMembership> {
  return prisma.clientMembership.update({ where: { id }, data })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 16: Ledger, Tips, Payroll Repositories

**Files:**
- Create: `src/lib/repositories/ledger.ts`
- Create: `src/lib/repositories/tips.ts`
- Create: `src/lib/repositories/payroll.ts`

**Interfaces:**
- Produces from `ledger.ts`:
  - `createLedgerEntryRecord(data: Prisma.LedgerEntryUncheckedCreateInput): Promise<LedgerEntry>`
  - `deleteLedgerEntryRecord(id: string): Promise<void>`
  - `getLedgerEntriesByClient(clientId: string): Promise<LedgerEntry[]>`
- Produces from `tips.ts`:
  - `getTipsForStaff(salonId: string, staffId: string, from: Date, to: Date): Promise<TipSummary[]>`
  - `addTipToInvoice(invoiceId: string, salonId: string, amount: number): Promise<Invoice>`
- Produces from `payroll.ts`:
  - `getPayrollRecords(salonId: string, from: Date, to: Date): Promise<PayrollRecord[]>`
  - `savePayrollRecord(salonId: string, data: Omit<Prisma.PayrollRecordUncheckedCreateInput, "salonId">): Promise<PayrollRecord>`

- [ ] **Step 1: Create ledger.ts**

```typescript
// src/lib/repositories/ledger.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { LedgerEntry, Prisma } from "@prisma/client"

export async function createLedgerEntryRecord(
  data: Prisma.LedgerEntryUncheckedCreateInput
): Promise<LedgerEntry> {
  const { randomUUID } = await import("crypto")
  return prisma.ledgerEntry.create({ data: { ...data, id: data.id ?? randomUUID() } })
}

export async function deleteLedgerEntryRecord(id: string): Promise<void> {
  await prisma.ledgerEntry.delete({ where: { id } })
}

export async function getLedgerEntriesByClient(clientId: string): Promise<LedgerEntry[]> {
  return prisma.ledgerEntry.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } })
}
```

- [ ] **Step 2: Create tips.ts**

```typescript
// src/lib/repositories/tips.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Invoice, Prisma } from "@prisma/client"

export async function addTipToInvoice(
  invoiceId: string,
  salonId: string,
  amount: number
): Promise<Invoice> {
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id: invoiceId, salonId } })
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { tip: (invoice.tip ?? 0) + amount, total: invoice.total + amount },
  })
}

export async function getTipsForStaff(
  salonId: string,
  staffId: string,
  from: Date,
  to: Date
): Promise<{ staffId: string; total: number; count: number }> {
  const result = await prisma.invoice.aggregate({
    where: {
      salonId,
      createdAt: { gte: from, lte: to },
      appointment: { services: { some: { staffId } } },
    },
    _sum: { tip: true },
    _count: { id: true },
  })
  return { staffId, total: result._sum.tip ?? 0, count: result._count.id }
}
```

- [ ] **Step 3: Create payroll.ts**

```typescript
// src/lib/repositories/payroll.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { PayrollRecord, Prisma } from "@prisma/client"

export async function getPayrollRecords(
  salonId: string,
  from: Date,
  to: Date
): Promise<PayrollRecord[]> {
  return prisma.payrollRecord.findMany({
    where: { salonId, periodStart: { gte: from }, periodEnd: { lte: to } },
    include: { staff: true },
    orderBy: { periodStart: "desc" },
  })
}

export async function savePayrollRecord(
  salonId: string,
  data: Omit<Prisma.PayrollRecordUncheckedCreateInput, "salonId">
): Promise<PayrollRecord> {
  const { randomUUID } = await import("crypto")
  const id = data.id ?? randomUUID()
  return prisma.payrollRecord.upsert({
    where: { id },
    create: { ...data, id, salonId },
    update: { ...data, salonId },
  })
}
```

- [ ] **Step 4: Type-check all three**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 17: Campaigns Repository

**Files:**
- Create: `src/lib/repositories/campaigns.ts`

**Interfaces:**
- Produces:
  - `getCampaigns(salonId: string): Promise<Campaign[]>`
  - `getCampaignById(id: string, salonId: string): Promise<Campaign | null>`
  - `createCampaignRecord(salonId: string, data: Omit<Prisma.CampaignUncheckedCreateInput, "salonId">): Promise<Campaign>`
  - `updateCampaignRecord(id: string, salonId: string, data: Prisma.CampaignUpdateInput): Promise<Campaign>`
  - `deleteCampaignRecord(id: string, salonId: string): Promise<void>`

- [ ] **Step 1: Create the repository**

```typescript
// src/lib/repositories/campaigns.ts
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Campaign, Prisma } from "@prisma/client"

export async function getCampaigns(salonId: string): Promise<Campaign[]> {
  return prisma.campaign.findMany({ where: { salonId }, orderBy: { createdAt: "desc" } })
}

export async function getCampaignById(id: string, salonId: string): Promise<Campaign | null> {
  return prisma.campaign.findFirst({ where: { id, salonId } })
}

export async function createCampaignRecord(
  salonId: string,
  data: Omit<Prisma.CampaignUncheckedCreateInput, "salonId">
): Promise<Campaign> {
  const { randomUUID } = await import("crypto")
  return prisma.campaign.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateCampaignRecord(
  id: string,
  salonId: string,
  data: Prisma.CampaignUpdateInput
): Promise<Campaign> {
  return prisma.campaign.update({ where: { id, salonId }, data })
}

export async function deleteCampaignRecord(id: string, salonId: string): Promise<void> {
  await prisma.campaign.delete({ where: { id, salonId } })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 18: Barrel Index

**Files:**
- Create: `src/lib/repositories/index.ts`

- [ ] **Step 1: Create the barrel**

```typescript
// src/lib/repositories/index.ts
export * from "./base"
export * from "./salon"
export * from "./appointments"
export * from "./clients"
export * from "./invoices"
export * from "./staff"
export * from "./services"
export * from "./reviews"
export * from "./reminders"
export * from "./inventory"
export * from "./expenses"
export * from "./waitlist"
export * from "./coupons"
export * from "./gift-cards"
export * from "./memberships"
export * from "./ledger"
export * from "./tips"
export * from "./payroll"
export * from "./campaigns"
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 19: Refactor `actions/appointments.ts`

**Files:**
- Modify: `src/app/actions/appointments.ts`

- [ ] **Step 1: Replace all `prisma.salon.findFirst()` calls**

Find every occurrence of `await prisma.salon.findFirst()` in the file. Replace with:
```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"
// at top of each function:
const salonId = await getCurrentSalonId()
```

- [ ] **Step 2: Replace direct `prisma.appointment` queries with repository calls**

Replace `prisma.appointment.findMany({ where: { salonId }, ... })` with `getAppointments(salonId, filter)` from `@/lib/repositories/appointments`.

Replace `prisma.appointment.findFirst({ where: { id, salonId } })` with `getAppointmentById(id, salonId)`.

Keep all business logic, `prisma.$transaction()` blocks, `revalidatePath()` calls, and Zod validation intact.

- [ ] **Step 3: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 20: Refactor `actions/clients.ts`

**Files:**
- Modify: `src/app/actions/clients.ts`

- [ ] **Step 1: Replace salon resolution**

Remove every `const salon = await prisma.salon.findFirst()` block. Replace with:
```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"
const salonId = await getCurrentSalonId()
```

- [ ] **Step 2: Replace direct client queries**

Replace `prisma.client.findMany({ where: { salonId } })` with `getClients(salonId)`.
Replace `prisma.client.findFirst({ where: { id, salonId } })` with `getClientById(id, salonId)`.
Replace `prisma.client.create(...)` with `createClientRecord(salonId, data)`.
Replace `prisma.client.update({ where: { id, salonId } })` with `updateClientRecord(id, salonId, data)`.
Replace `prisma.client.delete({ where: { id, salonId } })` with `deleteClientRecord(id, salonId)`.

Keep all note-parsing logic, loyalty point logic, `revalidatePath()` calls intact.

- [ ] **Step 3: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 21: Refactor `actions/reviews.ts` — Fix Cross-Tenant Leak

**Files:**
- Modify: `src/app/actions/reviews.ts`

This task fixes the critical cross-tenant leak where `getReviews()`, `getAverageRating()`, and `getRatingDistribution()` had NO salonId filter.

- [ ] **Step 1: Replace salon resolution in all three read functions**

```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"
import { getReviews as getReviewsRepo, getAverageRating as getAverageRatingRepo, getRatingDistribution as getRatingDistributionRepo } from "@/lib/repositories/reviews"

export async function getReviews() {
  const salonId = await getCurrentSalonId()
  return getReviewsRepo(salonId)
}

export async function getAverageRating() {
  const salonId = await getCurrentSalonId()
  return getAverageRatingRepo(salonId)
}

export async function getRatingDistribution() {
  const salonId = await getCurrentSalonId()
  return getRatingDistributionRepo(salonId)
}
```

- [ ] **Step 2: Refactor the write functions similarly**

`respondToReview`, `flagReview`, `deleteReview` — add salonId scoping via `getCurrentSalonId()` and delegate to repository.

- [ ] **Step 3: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 22: Refactor `actions/reminders.ts` — Fix Cross-Tenant Leak

**Files:**
- Modify: `src/app/actions/reminders.ts`

- [ ] **Step 1: Remove local `getDefaultSalonId()` helper, use canonical one**

Delete the local function:
```typescript
// DELETE THIS:
async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst({ select: { id: true } })
  return salon?.id
}
```

Replace all call sites with:
```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"
const salonId = await getCurrentSalonId()
```

- [ ] **Step 2: Add salonId filter to all unscoped read functions**

`getReminders()`, `getAllReminders()`, `getPendingReminderCount()`, `sendAllPendingReminders()`, `clearOldReminders()` — each must call `getCurrentSalonId()` and pass it to the repository.

- [ ] **Step 3: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 23: Refactor `actions/tips.ts` — Fix Full Cross-Tenant Leak

**Files:**
- Modify: `src/app/actions/tips.ts`

- [ ] **Step 1: Add salonId scoping to all functions**

Every function in `tips.ts` currently has NO salonId filter. Add:
```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"
// at top of every exported function:
const salonId = await getCurrentSalonId()
```

Then scope all queries: `prisma.invoice.findMany({ where: { salonId, ... } })`.

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 24: Refactor `actions/shifts.ts` — Fix Cross-Tenant Leak

**Files:**
- Modify: `src/app/actions/shifts.ts`

- [ ] **Step 1: Fix `getAllShifts`, `applyShiftToAll`, `setStandardWeek`**

These currently query all shifts globally. Add salonId scoping:
```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"
import { getShiftsBySalon } from "@/lib/repositories/staff"

export async function getAllShifts() {
  const salonId = await getCurrentSalonId()
  return getShiftsBySalon(salonId)
}
```

For `applyShiftToAll` and `setStandardWeek`, scope `prisma.staff.findMany()` with `where: { salonId }`.

- [ ] **Step 2: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 25: Refactor Remaining Action Files (Batch)

**Files:**
- Modify: `src/app/actions/invoices.ts`
- Modify: `src/app/actions/staff.ts`
- Modify: `src/app/actions/services.ts`
- Modify: `src/app/actions/expenses.ts`
- Modify: `src/app/actions/coupons.ts`
- Modify: `src/app/actions/gift-cards.ts`
- Modify: `src/app/actions/memberships.ts`

For each file, apply the same two-step refactor:
1. Replace local `prisma.salon.findFirst()` / local helper with `getCurrentSalonId()` from `@/lib/repositories/base`
2. Replace direct `prisma.model` CRUD calls with corresponding repository functions

The pattern is identical for each:

```typescript
// BEFORE (example from invoices.ts):
const salon = await prisma.salon.findFirst()
if (!salon) return { success: false, error: "No salon" }
const invoices = await prisma.invoice.findMany({ where: { salonId: salon.id } })

// AFTER:
const salonId = await getCurrentSalonId()
const invoices = await getInvoices(salonId)
```

- [ ] **Step 1: Refactor invoices.ts** — use `getInvoices`, `getInvoiceById`, `updateInvoiceRecord`, `deleteInvoiceRecord` from `@/lib/repositories/invoices`
- [ ] **Step 2: Refactor staff.ts** — use `getStaff`, `getStaffById`, `createStaffRecord`, `updateStaffRecord`, `deleteStaffRecord` from `@/lib/repositories/staff`
- [ ] **Step 3: Refactor services.ts** — use `getServices`, `getServiceById`, `createServiceRecord`, `updateServiceRecord`, `deleteServiceRecord`, `getCategories`, `createCategoryRecord` from `@/lib/repositories/services`
- [ ] **Step 4: Refactor expenses.ts** — use `getExpenses`, `createExpenseRecord`, `updateExpenseRecord`, `deleteExpenseRecord` from `@/lib/repositories/expenses`
- [ ] **Step 5: Refactor coupons.ts** — use `getCoupons`, `getCouponByCode`, `createCouponRecord`, `updateCouponRecord`, `deleteCouponRecord` from `@/lib/repositories/coupons`
- [ ] **Step 6: Refactor gift-cards.ts** — use `getGiftCards`, `getGiftCardByCode`, `createGiftCardRecord`, `updateGiftCardRecord` from `@/lib/repositories/gift-cards`
- [ ] **Step 7: Refactor memberships.ts** — use `getMembershipPlans`, `createMembershipPlanRecord`, `updateMembershipPlanRecord`, `deleteMembershipPlanRecord`, `getClientMemberships` from `@/lib/repositories/memberships`
- [ ] **Step 8: Type-check all**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -60
```

---

## Task 26: Refactor Settings, Billing, Branches, Budget, Policies, Pricing-Rules, Templates, Timetracking

**Files:**
- Modify: `src/app/actions/settings.ts`
- Modify: `src/app/actions/billing.ts`
- Modify: `src/app/actions/branches.ts`
- Modify: `src/app/actions/budget.ts`
- Modify: `src/app/actions/policies.ts`
- Modify: `src/app/actions/pricing-rules.ts`
- Modify: `src/app/actions/templates.ts`
- Modify: `src/app/actions/timetracking.ts`

All these files use `businessHours` blob patterns. Replace local blob helpers with the canonical ones from `@/lib/repositories/salon`:

```typescript
// BEFORE (each file has its own version of this):
const salon = await prisma.salon.findFirst()
const blob = JSON.parse(salon.businessHours ?? "{}")
const key = blob.__myKey ?? defaultValue
// ...
await prisma.salon.update({ data: { businessHours: JSON.stringify({ ...blob, __myKey: newValue }) } })

// AFTER:
import { getCurrentSalonId } from "@/lib/repositories/base"
import { readSalonBlob, writeSalonBlobKey } from "@/lib/repositories/salon"
const salonId = await getCurrentSalonId()
const blob = await readSalonBlob(salonId)
const key = blob.__myKey ?? defaultValue
// ...
await writeSalonBlobKey(salonId, "__myKey", newValue)
```

- [ ] **Step 1: Refactor settings.ts** — replace `loadBusinessHoursBlob()` / `saveBusinessHoursKey()` with imports from salon repository (these helpers in settings.ts are the canonical pattern — move them to the repository and import back)
- [ ] **Step 2: Refactor billing.ts** — `prisma.salon.findFirst()` → `getCurrentSalonId()` + `getSalon(salonId)`
- [ ] **Step 3: Refactor branches.ts** — local `readBusinessHours/writeBusinessHours` → `readSalonBlob/writeSalonBlobKey`
- [ ] **Step 4: Refactor budget.ts** — local `getSalonWithHours()` → `getCurrentSalonId()` + `readSalonBlob()`
- [ ] **Step 5: Refactor policies.ts** — local `getSalonBusinessHours/saveSalonBusinessHours` → `readSalonBlob/writeSalonBlobKey`
- [ ] **Step 6: Refactor pricing-rules.ts** — local `readRules/writeRules` → `readSalonBlob/writeSalonBlobKey`
- [ ] **Step 7: Refactor templates.ts** — local `getTemplatesBlob/saveTemplatesBlob` → `readSalonBlob/writeSalonBlobKey`
- [ ] **Step 8: Refactor timetracking.ts** — local `readEntries/writeEntries` → `readSalonBlob/writeSalonBlobKey`
- [ ] **Step 9: Type-check all**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -60
```

---

## Task 27: Refactor `lib/segments.ts` and `lib/activity-feed.ts`

**Files:**
- Modify: `src/lib/segments.ts`
- Modify: `src/lib/activity-feed.ts`

- [ ] **Step 1: Fix segments.ts**

Currently calls `prisma.salon.findFirst()` internally. Change signature to accept explicit `salonId`:

```typescript
// BEFORE:
export async function getSegmentClientIds(prisma: PrismaClient, segmentId: string): Promise<string[]>
// also calls prisma.salon.findFirst() internally

// AFTER: remove internal salon lookup, require salonId param
export async function getSegmentClientIds(prisma: PrismaClient, salonId: string, segmentId: string): Promise<string[]>
```

Update the one call site in `actions/campaigns.ts`.

- [ ] **Step 2: Fix activity-feed.ts — Add salonId scoping**

```typescript
import { getCurrentSalonId } from "@/lib/repositories/base"

export async function getRecentActivity(limit = 20) {
  const salonId = await getCurrentSalonId()
  // scope all queries to salonId
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 28: Final — Remove Duplicate Files and Full Type-Check

**Files:**
- Delete: `src/app/actions/time-off.ts` (superseded by `timeoff.ts`)
- Delete: `src/app/actions/membership.ts` (thin shim — inline its re-exports into callers or point to `memberships.ts` directly)
- Verify: `src/app/actions/` has no remaining `prisma.salon.findFirst()` calls

- [ ] **Step 1: Grep for remaining anti-patterns**

```bash
cd /Users/shosingh_1/zaloon && grep -rn "prisma\.salon\.findFirst" src/app/actions/ src/lib/
```

Expected: 0 results.

- [ ] **Step 2: Full type-check**

```bash
cd /Users/shosingh_1/zaloon && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and verify the app loads**

```bash
cd /Users/shosingh_1/zaloon && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
```

Expected: `200` or `307` (redirect to login).
