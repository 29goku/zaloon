import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomUUID } from "crypto";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

async function main() {
  console.log("🗑  Deleting existing data...");

  // ── Teardown (FK-safe order) ──────────────────────────────────────────────
  await prisma.reminder.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.client.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salon.deleteMany();

  console.log("✅ Teardown complete.");

  // ── 1. Salon ──────────────────────────────────────────────────────────────
  console.log("🏠 Creating salon...");

  const businessHours = JSON.stringify({
    mon: { open: "09:00", close: "19:00" },
    tue: { open: "09:00", close: "19:00" },
    wed: { open: "09:00", close: "19:00" },
    thu: { open: "09:00", close: "19:00" },
    fri: { open: "09:00", close: "19:00" },
    sat: { open: "09:00", close: "19:00" },
    sun: null,
  });

  const salon = await prisma.salon.create({
    data: {
      id: randomUUID(),
      name: "Studio Luxe",
      slug: "studio-luxe",
      address: "210 West 5th Avenue",
      city: "New York",
      country: "US",
      timezone: "America/New_York",
      currency: "USD",
      phone: "+1 212-555-0190",
      email: "hello@studioluxe.com",
      taxRate: 8.5,
      invoicePrefix: "SL",
      invoiceFooter: "Thank you for visiting Studio Luxe! We look forward to seeing you again.",
      businessHours,
      updatedAt: new Date(),
    },
  });

  console.log(`   Salon: ${salon.name} (${salon.slug})`);

  // ── 2. Service Categories ─────────────────────────────────────────────────
  console.log("📂 Creating service categories...");

  const [hairCat, nailsCat, skinCat, makeupCat, waxingCat] = await Promise.all([
    prisma.serviceCategory.create({ data: { id: randomUUID(), salonId: salon.id, name: "Hair", icon: "✂️" } }),
    prisma.serviceCategory.create({ data: { id: randomUUID(), salonId: salon.id, name: "Nails", icon: "💅" } }),
    prisma.serviceCategory.create({ data: { id: randomUUID(), salonId: salon.id, name: "Skin", icon: "🌿" } }),
    prisma.serviceCategory.create({ data: { id: randomUUID(), salonId: salon.id, name: "Makeup", icon: "💄" } }),
    prisma.serviceCategory.create({ data: { id: randomUUID(), salonId: salon.id, name: "Waxing", icon: "🌸" } }),
  ]);

  console.log("   Created 5 categories.");

  // ── 3. Services (15) ──────────────────────────────────────────────────────
  console.log("💈 Creating services...");

  const [
    haircut,      // 0  Hair
    hairColor,    // 1  Hair
    blowout,      // 2  Hair
    highlights,   // 3  Hair
    manicure,     // 4  Nails
    pedicure,     // 5  Nails
    gelNails,     // 6  Nails
    facial,       // 7  Skin
    deepCleanse,  // 8  Skin
    dayMakeup,    // 9  Makeup
    bridalMakeup, // 10 Makeup
    eyebrowWax,   // 11 Waxing
    lipWax,       // 12 Waxing
    fullLegWax,   // 13 Waxing
    bikiniWax,    // 14 Waxing
  ] = await Promise.all([
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: hairCat.id, name: "Haircut", durationMins: 45, price: 35 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: hairCat.id, name: "Hair Color", durationMins: 120, price: 85 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: hairCat.id, name: "Blowout", durationMins: 60, price: 45 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: hairCat.id, name: "Highlights", durationMins: 180, price: 120 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: nailsCat.id, name: "Manicure", durationMins: 30, price: 25 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: nailsCat.id, name: "Pedicure", durationMins: 45, price: 35 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: nailsCat.id, name: "Gel Nails", durationMins: 60, price: 45 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: skinCat.id, name: "Facial", durationMins: 60, price: 65 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: skinCat.id, name: "Deep Cleanse", durationMins: 75, price: 85 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: makeupCat.id, name: "Day Makeup", durationMins: 45, price: 55 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: makeupCat.id, name: "Bridal Makeup", durationMins: 120, price: 150 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: waxingCat.id, name: "Eyebrow Wax", durationMins: 15, price: 15 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: waxingCat.id, name: "Lip Wax", durationMins: 10, price: 10 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: waxingCat.id, name: "Full Leg Wax", durationMins: 45, price: 60 } }),
    prisma.service.create({ data: { id: randomUUID(), salonId: salon.id, categoryId: waxingCat.id, name: "Bikini Wax", durationMins: 30, price: 40 } }),
  ]);

  const allServices = [
    haircut, hairColor, blowout, highlights,
    manicure, pedicure, gelNails,
    facial, deepCleanse,
    dayMakeup, bridalMakeup,
    eyebrowWax, lipWax, fullLegWax, bikiniWax,
  ];

  console.log("   Created 15 services.");

  // ── 4. Staff ──────────────────────────────────────────────────────────────
  console.log("👩‍💼 Creating staff...");

  const [anna, maria, james, lisa] = await Promise.all([
    prisma.staff.create({ data: { id: randomUUID(), salonId: salon.id, name: "Anna Chen", phone: "+1 212-555-0101", commissionPct: 30 } }),
    prisma.staff.create({ data: { id: randomUUID(), salonId: salon.id, name: "Maria Santos", phone: "+1 212-555-0102", commissionPct: 25 } }),
    prisma.staff.create({ data: { id: randomUUID(), salonId: salon.id, name: "James Park", phone: "+1 212-555-0103", commissionPct: 35 } }),
    prisma.staff.create({ data: { id: randomUUID(), salonId: salon.id, name: "Lisa Wong", phone: "+1 212-555-0104", commissionPct: 30 } }),
  ]);

  // Shifts: Mon(1)–Sat(6), 9am–7pm
  const monToSat = [1, 2, 3, 4, 5, 6];
  await prisma.shift.createMany({
    data: [anna, maria, james, lisa].flatMap((s) =>
      monToSat.map((day) => ({
        id: randomUUID(),
        staffId: s.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "19:00",
      }))
    ),
  });

  // StaffService assignments
  await prisma.staffService.createMany({
    data: [
      // Anna — hair specialist
      { staffId: anna.id, serviceId: haircut.id },
      { staffId: anna.id, serviceId: hairColor.id },
      { staffId: anna.id, serviceId: blowout.id },
      { staffId: anna.id, serviceId: highlights.id },
      // Maria — nails & waxing
      { staffId: maria.id, serviceId: manicure.id },
      { staffId: maria.id, serviceId: pedicure.id },
      { staffId: maria.id, serviceId: gelNails.id },
      { staffId: maria.id, serviceId: eyebrowWax.id },
      { staffId: maria.id, serviceId: lipWax.id },
      { staffId: maria.id, serviceId: fullLegWax.id },
      { staffId: maria.id, serviceId: bikiniWax.id },
      // James — skin & hair
      { staffId: james.id, serviceId: facial.id },
      { staffId: james.id, serviceId: deepCleanse.id },
      { staffId: james.id, serviceId: haircut.id },
      { staffId: james.id, serviceId: blowout.id },
      // Lisa — makeup & skin
      { staffId: lisa.id, serviceId: dayMakeup.id },
      { staffId: lisa.id, serviceId: bridalMakeup.id },
      { staffId: lisa.id, serviceId: facial.id },
      { staffId: lisa.id, serviceId: eyebrowWax.id },
    ],
  });

  console.log("   Created 4 staff with shifts and service links.");

  // ── 5. Clients (20) ───────────────────────────────────────────────────────
  console.log("👥 Creating clients...");

  const clientData = [
    { name: "Sophie Anderson",  phone: "+1 646-555-1001", email: "sophie.a@gmail.com",      birthday: new Date("1994-03-12"), loyaltyPoints: 150 },
    { name: "Emma Williams",    phone: "+1 646-555-1002", email: "emma.w@outlook.com",       birthday: new Date("1988-11-05"), loyaltyPoints: 320 },
    { name: "Olivia Johnson",   phone: "+1 646-555-1003", email: null,                        birthday: new Date("1997-07-22"), loyaltyPoints: 75 },
    { name: "Ava Brown",        phone: "+1 646-555-1004", email: "ava.b@yahoo.com",          birthday: null,                   loyaltyPoints: 200 },
    { name: "Isabella Davis",   phone: "+1 646-555-1005", email: "isabella.d@gmail.com",     birthday: new Date("1995-01-30"), loyaltyPoints: 490 },
    { name: "Mia Wilson",       phone: "+1 646-555-1006", email: null,                        birthday: new Date("1990-09-14"), loyaltyPoints: 30 },
    { name: "Charlotte Moore",  phone: "+1 646-555-1007", email: "charlotte.m@gmail.com",    birthday: null,                   loyaltyPoints: 110 },
    { name: "Amelia Taylor",    phone: "+1 646-555-1008", email: null,                        birthday: new Date("1993-06-08"), loyaltyPoints: 270 },
    { name: "Harper Martin",    phone: "+1 646-555-1009", email: "harper.m@gmail.com",       birthday: null,                   loyaltyPoints: 60 },
    { name: "Evelyn Thompson",  phone: "+1 646-555-1010", email: "evelyn.t@hotmail.com",     birthday: new Date("1999-12-19"), loyaltyPoints: 180 },
    { name: "Abigail Garcia",   phone: "+1 646-555-1011", email: null,                        birthday: null,                   loyaltyPoints: 0 },
    { name: "Emily Martinez",   phone: "+1 646-555-1012", email: "emily.m@gmail.com",        birthday: new Date("1991-04-27"), loyaltyPoints: 410 },
    { name: "Elizabeth Clark",  phone: "+1 646-555-1013", email: null,                        birthday: null,                   loyaltyPoints: 50 },
    { name: "Sofia Lewis",      phone: "+1 646-555-1014", email: "sofia.l@gmail.com",        birthday: new Date("1996-08-03"), loyaltyPoints: 300 },
    { name: "Camila Robinson",  phone: "+1 646-555-1015", email: null,                        birthday: null,                   loyaltyPoints: 90 },
    { name: "Victoria Walker",  phone: "+1 646-555-1016", email: "victoria.w@gmail.com",     birthday: new Date("1987-02-18"), loyaltyPoints: 520 },
    { name: "Penelope Hall",    phone: "+1 646-555-1017", email: null,                        birthday: null,                   loyaltyPoints: 15 },
    { name: "Riley Allen",      phone: "+1 646-555-1018", email: "riley.a@gmail.com",        birthday: new Date("1998-10-11"), loyaltyPoints: 230 },
    { name: "Aria Young",       phone: "+1 646-555-1019", email: null,                        birthday: null,                   loyaltyPoints: 80 },
    { name: "Grace Hernandez",  phone: "+1 646-555-1020", email: "grace.h@gmail.com",        birthday: new Date("1992-05-25"), loyaltyPoints: 360 },
  ];

  const clients = await Promise.all(
    clientData.map((c) =>
      prisma.client.create({
        data: { id: randomUUID(), salonId: salon.id, ...c },
      })
    )
  );

  console.log(`   Created ${clients.length} clients.`);

  // ── 6. Appointments (54) ──────────────────────────────────────────────────
  console.log("📅 Creating appointments...");

  type ApptSpec = {
    clientIdx: number;
    staffRef: typeof anna;
    serviceIdxs: number[];   // indexes into allServices
    dateStr: string;
    startTime: string;
    status: string;
  };

  const apptSpecs: ApptSpec[] = [
    // ── Past COMPLETED (40) ──────────────────────────────────────────────────
    { clientIdx: 0,  staffRef: anna,  serviceIdxs: [0],         dateStr: daysAgo(30), startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 1,  staffRef: james, serviceIdxs: [7],         dateStr: daysAgo(29), startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 2,  staffRef: lisa,  serviceIdxs: [9],         dateStr: daysAgo(28), startTime: "11:00", status: "COMPLETED" },
    { clientIdx: 3,  staffRef: maria, serviceIdxs: [4, 5],      dateStr: daysAgo(27), startTime: "14:00", status: "COMPLETED" },
    { clientIdx: 4,  staffRef: anna,  serviceIdxs: [1],         dateStr: daysAgo(26), startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 5,  staffRef: anna,  serviceIdxs: [3],         dateStr: daysAgo(25), startTime: "10:30", status: "COMPLETED" },
    { clientIdx: 6,  staffRef: james, serviceIdxs: [8],         dateStr: daysAgo(24), startTime: "15:00", status: "CANCELLED" },
    { clientIdx: 7,  staffRef: maria, serviceIdxs: [6],         dateStr: daysAgo(23), startTime: "13:00", status: "COMPLETED" },
    { clientIdx: 8,  staffRef: anna,  serviceIdxs: [0, 2],      dateStr: daysAgo(22), startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 9,  staffRef: james, serviceIdxs: [7],         dateStr: daysAgo(21), startTime: "11:00", status: "NO_SHOW"   },
    { clientIdx: 10, staffRef: lisa,  serviceIdxs: [10],        dateStr: daysAgo(20), startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 11, staffRef: anna,  serviceIdxs: [3],         dateStr: daysAgo(19), startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 12, staffRef: james, serviceIdxs: [7, 8],      dateStr: daysAgo(18), startTime: "14:30", status: "COMPLETED" },
    { clientIdx: 13, staffRef: maria, serviceIdxs: [5],         dateStr: daysAgo(17), startTime: "16:00", status: "CANCELLED" },
    { clientIdx: 14, staffRef: anna,  serviceIdxs: [1],         dateStr: daysAgo(16), startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 15, staffRef: anna,  serviceIdxs: [0],         dateStr: daysAgo(15), startTime: "12:00", status: "COMPLETED" },
    { clientIdx: 16, staffRef: james, serviceIdxs: [7],         dateStr: daysAgo(14), startTime: "11:30", status: "NO_SHOW"   },
    { clientIdx: 17, staffRef: lisa,  serviceIdxs: [9],         dateStr: daysAgo(13), startTime: "15:00", status: "COMPLETED" },
    { clientIdx: 18, staffRef: maria, serviceIdxs: [4],         dateStr: daysAgo(12), startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 19, staffRef: anna,  serviceIdxs: [2],         dateStr: daysAgo(11), startTime: "13:00", status: "COMPLETED" },
    { clientIdx: 0,  staffRef: james, serviceIdxs: [7],         dateStr: daysAgo(10), startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 2,  staffRef: anna,  serviceIdxs: [3],         dateStr: daysAgo(9),  startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 4,  staffRef: maria, serviceIdxs: [5, 6],      dateStr: daysAgo(8),  startTime: "14:00", status: "COMPLETED" },
    { clientIdx: 6,  staffRef: anna,  serviceIdxs: [0],         dateStr: daysAgo(7),  startTime: "11:00", status: "CANCELLED" },
    { clientIdx: 8,  staffRef: lisa,  serviceIdxs: [10],        dateStr: daysAgo(6),  startTime: "10:30", status: "COMPLETED" },
    { clientIdx: 10, staffRef: james, serviceIdxs: [8],         dateStr: daysAgo(5),  startTime: "15:30", status: "COMPLETED" },
    { clientIdx: 12, staffRef: anna,  serviceIdxs: [1, 2],      dateStr: daysAgo(4),  startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 1,  staffRef: maria, serviceIdxs: [11, 12],    dateStr: daysAgo(3),  startTime: "13:00", status: "COMPLETED" },
    { clientIdx: 3,  staffRef: lisa,  serviceIdxs: [9],         dateStr: daysAgo(2),  startTime: "11:00", status: "COMPLETED" },
    { clientIdx: 5,  staffRef: anna,  serviceIdxs: [0],         dateStr: daysAgo(2),  startTime: "14:00", status: "COMPLETED" },
    { clientIdx: 7,  staffRef: james, serviceIdxs: [7],         dateStr: daysAgo(1),  startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 9,  staffRef: maria, serviceIdxs: [4, 5],      dateStr: daysAgo(1),  startTime: "12:00", status: "COMPLETED" },
    { clientIdx: 11, staffRef: anna,  serviceIdxs: [1],         dateStr: daysAgo(1),  startTime: "15:00", status: "COMPLETED" },
    { clientIdx: 13, staffRef: lisa,  serviceIdxs: [9, 10],     dateStr: daysAgo(1),  startTime: "16:00", status: "COMPLETED" },
    // Extra past completeds for variety
    { clientIdx: 15, staffRef: anna,  serviceIdxs: [0, 2],      dateStr: daysAgo(35), startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 17, staffRef: maria, serviceIdxs: [13, 14],    dateStr: daysAgo(33), startTime: "10:30", status: "COMPLETED" },
    { clientIdx: 19, staffRef: james, serviceIdxs: [8],         dateStr: daysAgo(31), startTime: "14:00", status: "COMPLETED" },
    { clientIdx: 14, staffRef: maria, serviceIdxs: [6],         dateStr: daysAgo(40), startTime: "13:30", status: "COMPLETED" },
    { clientIdx: 16, staffRef: anna,  serviceIdxs: [1, 3],      dateStr: daysAgo(38), startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 18, staffRef: lisa,  serviceIdxs: [9],         dateStr: daysAgo(36), startTime: "11:00", status: "COMPLETED" },
    // ── Today SCHEDULED ──────────────────────────────────────────────────────
    { clientIdx: 0,  staffRef: anna,  serviceIdxs: [0],         dateStr: todayStr(),  startTime: "09:00", status: "SCHEDULED" },
    { clientIdx: 2,  staffRef: maria, serviceIdxs: [4, 5],      dateStr: todayStr(),  startTime: "10:30", status: "SCHEDULED" },
    { clientIdx: 4,  staffRef: james, serviceIdxs: [7],         dateStr: todayStr(),  startTime: "13:00", status: "SCHEDULED" },
    { clientIdx: 6,  staffRef: lisa,  serviceIdxs: [9],         dateStr: todayStr(),  startTime: "15:00", status: "SCHEDULED" },
    // ── Future SCHEDULED ─────────────────────────────────────────────────────
    { clientIdx: 8,  staffRef: anna,  serviceIdxs: [1],         dateStr: daysFromNow(1),  startTime: "10:00", status: "SCHEDULED" },
    { clientIdx: 10, staffRef: james, serviceIdxs: [8],         dateStr: daysFromNow(2),  startTime: "11:00", status: "SCHEDULED" },
    { clientIdx: 12, staffRef: maria, serviceIdxs: [6],         dateStr: daysFromNow(3),  startTime: "14:00", status: "SCHEDULED" },
    { clientIdx: 14, staffRef: lisa,  serviceIdxs: [10],        dateStr: daysFromNow(4),  startTime: "15:30", status: "SCHEDULED" },
    { clientIdx: 16, staffRef: anna,  serviceIdxs: [0, 2],      dateStr: daysFromNow(5),  startTime: "09:30", status: "SCHEDULED" },
    { clientIdx: 18, staffRef: james, serviceIdxs: [7, 8],      dateStr: daysFromNow(6),  startTime: "10:30", status: "SCHEDULED" },
    { clientIdx: 1,  staffRef: anna,  serviceIdxs: [3],         dateStr: daysFromNow(7),  startTime: "13:00", status: "SCHEDULED" },
    { clientIdx: 3,  staffRef: maria, serviceIdxs: [4],         dateStr: daysFromNow(8),  startTime: "11:00", status: "SCHEDULED" },
    { clientIdx: 5,  staffRef: lisa,  serviceIdxs: [9],         dateStr: daysFromNow(10), startTime: "14:00", status: "SCHEDULED" },
    { clientIdx: 7,  staffRef: james, serviceIdxs: [7],         dateStr: daysFromNow(12), startTime: "10:00", status: "SCHEDULED" },
  ];

  // Create appointments one by one (createMany doesn't return IDs in all adapters)
  const appointments = [];
  for (const spec of apptSpecs) {
    const svcList = spec.serviceIdxs.map((i) => allServices[i]);
    const total = svcList.reduce((s, sv) => s + sv.price, 0);
    const appt = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: clients[spec.clientIdx].id,
        staffId: spec.staffRef.id,
        date: spec.dateStr,
        startTime: spec.startTime,
        totalAmount: total,
        status: spec.status,
      },
    });
    appointments.push(appt);
  }

  // AppointmentService join rows
  await prisma.appointmentService.createMany({
    data: apptSpecs.flatMap((spec, idx) =>
      spec.serviceIdxs.map((si) => ({
        appointmentId: appointments[idx].id,
        serviceId: allServices[si].id,
      }))
    ),
  });

  console.log(`   Created ${appointments.length} appointments.`);

  // ── 7. Invoices (for all COMPLETED appointments) ──────────────────────────
  console.log("🧾 Creating invoices...");

  const paymentMethods = ["CASH", "CARD", "CARD", "CASH", "CASH", "CARD", "CASH", "CARD", "CASH", "CARD"];
  const completedAppts = apptSpecs
    .map((s, i) => ({ spec: s, appt: appointments[i] }))
    .filter(({ spec }) => spec.status === "COMPLETED");

  for (let i = 0; i < completedAppts.length; i++) {
    const { spec, appt } = completedAppts[i];
    await prisma.invoice.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: clients[spec.clientIdx].id,
        appointmentId: appt.id,
        total: appt.totalAmount,
        paymentMethod: paymentMethods[i % paymentMethods.length],
        status: "PAID",
      },
    });
  }

  console.log(`   Created ${completedAppts.length} invoices (PAID).`);

  // ── 8. LedgerEntries ──────────────────────────────────────────────────────
  console.log("📒 Creating ledger entries...");

  await prisma.ledgerEntry.createMany({
    data: [
      { id: randomUUID(), clientId: clients[0].id,  type: "CREDIT", amount: 150,  note: "Loyalty reward redemption" },
      { id: randomUUID(), clientId: clients[0].id,  type: "DEBIT",  amount: 35,   note: "Haircut — Anna Chen" },
      { id: randomUUID(), clientId: clients[1].id,  type: "CREDIT", amount: 320,  note: "VIP loyalty tier credit" },
      { id: randomUUID(), clientId: clients[3].id,  type: "DEBIT",  amount: 60,   note: "Manicure + Pedicure — Maria Santos" },
      { id: randomUUID(), clientId: clients[3].id,  type: "CREDIT", amount: 25,   note: "Referral bonus" },
      { id: randomUUID(), clientId: clients[4].id,  type: "DEBIT",  amount: 85,   note: "Hair Color — Anna Chen" },
      { id: randomUUID(), clientId: clients[4].id,  type: "CREDIT", amount: 490,  note: "Annual loyalty bonus" },
      { id: randomUUID(), clientId: clients[11].id, type: "DEBIT",  amount: 120,  note: "Highlights — Anna Chen" },
      { id: randomUUID(), clientId: clients[11].id, type: "CREDIT", amount: 410,  note: "Membership credit" },
      { id: randomUUID(), clientId: clients[15].id, type: "CREDIT", amount: 520,  note: "Platinum loyalty tier upgrade" },
      { id: randomUUID(), clientId: clients[15].id, type: "DEBIT",  amount: 80,   note: "Haircut + Blowout — Anna Chen" },
      { id: randomUUID(), clientId: clients[19].id, type: "CREDIT", amount: 360,  note: "Gold tier loyalty bonus" },
    ],
  });

  console.log("   Created 12 ledger entries.");

  // ── 9. Reminders (for upcoming appointments) ──────────────────────────────
  console.log("🔔 Creating reminders...");

  // Find future scheduled appointments
  const futureAppts = apptSpecs
    .map((s, i) => ({ spec: s, appt: appointments[i] }))
    .filter(({ spec }) => spec.status === "SCHEDULED" && spec.dateStr > todayStr());

  const reminderTypes = ["SMS", "EMAIL", "SMS"];
  for (let i = 0; i < Math.min(futureAppts.length, 8); i++) {
    const { spec, appt } = futureAppts[i];
    const apptDate = new Date(spec.dateStr + "T" + spec.startTime + ":00");
    const scheduledAt = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000); // 24h before
    const clientName = clients[spec.clientIdx].name;

    await prisma.reminder.create({
      data: {
        id: randomUUID(),
        appointmentId: appt.id,
        type: reminderTypes[i % reminderTypes.length],
        status: "PENDING",
        message: `Hi ${clientName}, this is a reminder for your appointment at Studio Luxe on ${spec.dateStr} at ${spec.startTime}. See you soon!`,
        scheduledAt,
      },
    });
  }

  console.log(`   Created ${Math.min(futureAppts.length, 8)} reminders.`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("");
  console.log("🎉 Seed complete — Studio Luxe is ready!");
  console.log(`   Salon:        ${salon.name} (${salon.slug})`);
  console.log(`   Categories:   5`);
  console.log(`   Services:     ${allServices.length}`);
  console.log(`   Staff:        4 (with shifts and service assignments)`);
  console.log(`   Clients:      ${clients.length}`);
  console.log(`   Appointments: ${appointments.length} (${completedAppts.length} completed, ${appointments.length - completedAppts.length} other)`);
  console.log(`   Invoices:     ${completedAppts.length} (PAID)`);
  console.log(`   Ledger:       12 entries`);
  console.log(`   Reminders:    ${Math.min(futureAppts.length, 8)} pending`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
