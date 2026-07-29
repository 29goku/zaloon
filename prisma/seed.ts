import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
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
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.giftCardTransaction.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.clientMembership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.review.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.timeOff.deleteMany();
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
  const appointments: { id: string; date: string; status: string; totalAmount: number }[] = [];
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
        salonId: salon.id,
        appointmentId: appt.id,
        type: reminderTypes[i % reminderTypes.length],
        status: "PENDING",
        message: `Hi ${clientName}, this is a reminder for your appointment at Studio Luxe on ${spec.dateStr} at ${spec.startTime}. See you soon!`,
        scheduledAt,
      },
    });
  }

  console.log(`   Created ${Math.min(futureAppts.length, 8)} reminders.`);

  // ── 10. Expenses (10 entries) ─────────────────────────────────────────────
  console.log("💸 Creating expenses...");

  await prisma.expense.createMany({
    data: [
      { id: randomUUID(), salonId: salon.id, category: "RENT",        description: "Monthly salon rent",               amount: 2000, date: daysAgo(30) },
      { id: randomUUID(), salonId: salon.id, category: "SUPPLIES",    description: "Hair supplies restock",             amount: 450,  date: daysAgo(25) },
      { id: randomUUID(), salonId: salon.id, category: "PRODUCTS",    description: "Color products — L'Oréal Pro",      amount: 380,  date: daysAgo(20) },
      { id: randomUUID(), salonId: salon.id, category: "LINENS",      description: "Towels and salon linens",           amount: 120,  date: daysAgo(18) },
      { id: randomUUID(), salonId: salon.id, category: "MARKETING",   description: "Instagram ads — June campaign",     amount: 200,  date: daysAgo(15) },
      { id: randomUUID(), salonId: salon.id, category: "UTILITIES",   description: "Electricity and water bill",        amount: 180,  date: daysAgo(10) },
      { id: randomUUID(), salonId: salon.id, category: "EQUIPMENT",   description: "Hair dryer replacement",            amount: 95,   date: daysAgo(8)  },
      { id: randomUUID(), salonId: salon.id, category: "PRODUCTS",    description: "Developer and bleach products",     amount: 160,  date: daysAgo(6)  },
      { id: randomUUID(), salonId: salon.id, category: "SUPPLIES",    description: "Disposable gloves and foils",       amount: 65,   date: daysAgo(4)  },
      { id: randomUUID(), salonId: salon.id, category: "RENT",        description: "Monthly salon rent",               amount: 2000, date: todayStr()  },
    ],
  });

  console.log("   Created 10 expenses.");

  // ── 11. Coupons ───────────────────────────────────────────────────────────
  console.log("🎟  Creating coupons...");

  await prisma.coupon.createMany({
    data: [
      {
        id: randomUUID(), salonId: salon.id,
        code: "WELCOME10", type: "PERCENTAGE", value: 10,
        minOrderAmt: 0, maxUses: null, usedCount: 0,
        expiresAt: null, active: true,
      },
      {
        id: randomUUID(), salonId: salon.id,
        code: "SUMMER20", type: "PERCENTAGE", value: 20,
        minOrderAmt: 50, maxUses: 100, usedCount: 14,
        expiresAt: "2026-12-31", active: true,
      },
      {
        id: randomUUID(), salonId: salon.id,
        code: "FLAT50", type: "FIXED", value: 50,
        minOrderAmt: 150, maxUses: 50, usedCount: 7,
        expiresAt: "2026-09-30", active: true,
      },
      {
        id: randomUUID(), salonId: salon.id,
        code: "LOYAL15", type: "PERCENTAGE", value: 15,
        minOrderAmt: 75, maxUses: null, usedCount: 31,
        expiresAt: null, active: false,
      },
    ],
  });

  console.log("   Created 4 coupons.");

  // ── 12. Reviews ───────────────────────────────────────────────────────────
  console.log("⭐ Creating reviews...");

  // Pick some completed appointments that have no review yet (use different ones so appointmentId unique constraint is respected)
  // completedAppts indices: use indices 0,1,2,3,4,5,6,7 for reviews
  const reviewSpecs = [
    { apptIdx: 0,  staffRef: anna,  clientIdx: 0,  rating: 5, comment: "Anna is absolutely amazing with color! My hair looks incredible." },
    { apptIdx: 1,  staffRef: james, clientIdx: 1,  rating: 5, comment: "James gave me the most relaxing facial. My skin is glowing!" },
    { apptIdx: 2,  staffRef: lisa,  clientIdx: 2,  rating: 4, comment: "Lisa did a beautiful day makeup look for my dinner date. Very professional." },
    { apptIdx: 3,  staffRef: maria, clientIdx: 3,  rating: 5, comment: "Maria is so talented with nails. My mani-pedi lasted 3 weeks!" },
    { apptIdx: 4,  staffRef: anna,  clientIdx: 4,  rating: 4, comment: "Great hair color work as always. Booking again next month." },
    { apptIdx: 7,  staffRef: maria, clientIdx: 7,  rating: 5, comment: "Best gel nails in the city. The salon is so clean and welcoming." },
    { apptIdx: 11, staffRef: anna,  clientIdx: 11, rating: 5, comment: "Highlights turned out exactly as I wanted. Anna really listens." },
    { apptIdx: 12, staffRef: james, clientIdx: 12, rating: 4, comment: "Facial and deep cleanse combo was so worth it. Will come back." },
  ];

  for (const rs of reviewSpecs) {
    await prisma.review.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: clients[rs.clientIdx].id,
        staffId: rs.staffRef.id,
        appointmentId: completedAppts[rs.apptIdx].appt.id,
        rating: rs.rating,
        comment: rs.comment,
        isPublic: true,
      },
    });
  }

  console.log(`   Created ${reviewSpecs.length} reviews.`);

  // ── 13. MembershipPlans ───────────────────────────────────────────────────
  console.log("💳 Creating membership plans...");

  const [silverPlan, goldPlan, platinumPlan] = await Promise.all([
    prisma.membershipPlan.create({
      data: {
        id: randomUUID(), salonId: salon.id,
        name: "Silver Monthly", price: 49,
        sessionsPerMonth: 2, discountPct: 0,
        description: "2 sessions per month — perfect for occasional visits.",
        active: true,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        id: randomUUID(), salonId: salon.id,
        name: "Gold Monthly", price: 89,
        sessionsPerMonth: 4, discountPct: 10,
        description: "4 sessions per month with 10% off all additional services.",
        active: true,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        id: randomUUID(), salonId: salon.id,
        name: "Platinum Monthly", price: 149,
        sessionsPerMonth: 999, discountPct: 20,
        description: "Unlimited sessions per month with 20% off retail products.",
        active: true,
      },
    }),
  ]);

  console.log("   Created 3 membership plans.");

  // ── 14. ClientMemberships ─────────────────────────────────────────────────
  console.log("🎫 Creating client memberships...");

  await prisma.clientMembership.createMany({
    data: [
      {
        id: randomUUID(), clientId: clients[1].id, planId: goldPlan.id,
        startDate: daysAgo(60), endDate: daysFromNow(30),
        sessionsUsed: 3, status: "ACTIVE",
      },
      {
        id: randomUUID(), clientId: clients[4].id, planId: platinumPlan.id,
        startDate: daysAgo(90), endDate: daysFromNow(0),
        sessionsUsed: 8, status: "ACTIVE",
      },
      {
        id: randomUUID(), clientId: clients[11].id, planId: silverPlan.id,
        startDate: daysAgo(120), endDate: daysAgo(30),
        sessionsUsed: 2, status: "EXPIRED",
      },
      {
        id: randomUUID(), clientId: clients[15].id, planId: platinumPlan.id,
        startDate: daysAgo(30), endDate: daysFromNow(60),
        sessionsUsed: 5, status: "ACTIVE",
      },
      {
        id: randomUUID(), clientId: clients[19].id, planId: goldPlan.id,
        startDate: daysAgo(45), endDate: daysFromNow(15),
        sessionsUsed: 4, status: "ACTIVE",
      },
    ],
  });

  console.log("   Created 5 client memberships.");

  // ── 15. GiftCards ─────────────────────────────────────────────────────────
  console.log("🎁 Creating gift cards...");

  const gc1 = await prisma.giftCard.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      code: "GC-LUXE100",
      initialValue: 100, balance: 65,
      purchasedBy: clients[0].email ?? clients[0].name,
      recipientName: "Emma Williams",
      expiresAt: "2027-06-30",
      status: "ACTIVE",
    },
  });

  const gc2 = await prisma.giftCard.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      code: "GC-GIFT050",
      initialValue: 50, balance: 0,
      purchasedBy: "Grace Hernandez",
      recipientName: "Ava Brown",
      expiresAt: "2026-12-31",
      status: "REDEEMED",
    },
  });

  const gc3 = await prisma.giftCard.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      code: "GC-BDAY200",
      initialValue: 200, balance: 200,
      purchasedBy: clients[15].email ?? clients[15].name,
      recipientName: "Sofia Lewis",
      expiresAt: "2027-12-31",
      status: "ACTIVE",
    },
  });

  console.log("   Created 3 gift cards.");

  // ── 16. GiftCardTransactions ──────────────────────────────────────────────
  console.log("💰 Creating gift card transactions...");

  await prisma.giftCardTransaction.createMany({
    data: [
      // GC1: $100 issued, $35 redeemed
      { id: randomUUID(), giftCardId: gc1.id, amount: 100,  note: "Gift card issued"                },
      { id: randomUUID(), giftCardId: gc1.id, amount: -35,  note: "Redeemed — Haircut & Blowout"    },
      // GC2: $50 issued, fully redeemed
      { id: randomUUID(), giftCardId: gc2.id, amount: 50,   note: "Gift card issued"                },
      { id: randomUUID(), giftCardId: gc2.id, amount: -50,  note: "Redeemed — Manicure & Pedicure"  },
      // GC3: $200 issued, not yet used
      { id: randomUUID(), giftCardId: gc3.id, amount: 200,  note: "Gift card issued — birthday gift" },
    ],
  });

  console.log("   Created 5 gift card transactions.");

  // ── 17. Campaigns ─────────────────────────────────────────────────────────
  console.log("📣 Creating campaigns...");

  await prisma.campaign.createMany({
    data: [
      {
        id: randomUUID(), salonId: salon.id,
        name: "Birthday Month Special",
        type: "BIRTHDAY",
        message: "Happy Birthday! Treat yourself to 20% off your next visit at Studio Luxe. Use code BDAY20 at booking.",
        channel: "SMS",
        targetFilter: JSON.stringify({ filter: "birthday" }),
        status: "ACTIVE",
        recipientCount: 4,
        openCount: 2,
        clickCount: 1,
        sentAt: new Date(daysAgo(5) + "T09:00:00"),
        scheduledAt: new Date(daysAgo(5) + "T09:00:00"),
      },
      {
        id: randomUUID(), salonId: salon.id,
        name: "We Miss You — 60 Day Win-back",
        type: "WIN_BACK",
        message: "Hi! It's been a while since your last visit to Studio Luxe. Come back and enjoy $15 off your next appointment.",
        channel: "EMAIL",
        subject: "We miss you! Come back for a special offer",
        targetFilter: JSON.stringify({ filter: "inactive", daysInactive: 60 }),
        status: "DRAFT",
        recipientCount: 0,
        openCount: 0,
        clickCount: 0,
        scheduledAt: new Date(daysFromNow(3) + "T10:00:00"),
      },
      {
        id: randomUUID(), salonId: salon.id,
        name: "Summer Highlights Promo",
        type: "PROMOTIONAL",
        message: "Summer is here! Get sun-kissed highlights starting from $99 this month only. Book now before slots fill up!",
        channel: "SMS",
        targetFilter: JSON.stringify({ filter: "all" }),
        status: "ACTIVE",
        recipientCount: 18,
        openCount: 7,
        clickCount: 3,
        sentAt: new Date(daysAgo(10) + "T09:00:00"),
        scheduledAt: new Date(daysAgo(10) + "T09:00:00"),
      },
      {
        id: randomUUID(), salonId: salon.id,
        name: "New Membership Launch",
        type: "CUSTOM",
        message: "Exciting news! We've launched monthly membership plans. Get up to 20% off every visit. Ask us about Silver, Gold & Platinum memberships.",
        channel: "EMAIL",
        subject: "Introducing Zaloon Memberships",
        targetFilter: null,
        status: "DRAFT",
        recipientCount: 0,
        openCount: 0,
        clickCount: 0,
        scheduledAt: null,
      },
    ],
  });

  console.log("   Created 4 campaigns.");

  // ── 18. InventoryItems (10) ───────────────────────────────────────────────
  console.log("📦 Creating inventory items...");

  const inv1 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Shampoo — L'Oréal Pro",
      category: "HAIR_PRODUCTS", sku: "INV-SH001",
      quantity: 24, unit: "bottle", minQuantity: 10,
      costPrice: 8.5, salePrice: 18, supplier: "L'Oréal Distributors",
      updatedAt: new Date(),
    },
  });

  const inv2 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Conditioner — L'Oréal Pro",
      category: "HAIR_PRODUCTS", sku: "INV-CD001",
      quantity: 18, unit: "bottle", minQuantity: 10,
      costPrice: 8.5, salePrice: 18, supplier: "L'Oréal Distributors",
      updatedAt: new Date(),
    },
  });

  const inv3 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Hair Color — Ash Blonde #8.1",
      category: "COLOR", sku: "INV-HC001",
      quantity: 6, unit: "tube", minQuantity: 8,
      costPrice: 4.2, salePrice: null, supplier: "Wella Professional",
      updatedAt: new Date(),
    },
  });

  const inv4 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Hair Color — Chestnut Brown #5.0",
      category: "COLOR", sku: "INV-HC002",
      quantity: 3, unit: "tube", minQuantity: 8,
      costPrice: 4.2, salePrice: null, supplier: "Wella Professional",
      updatedAt: new Date(),
    },
  });

  const inv5 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Professional Scissors — Thinning",
      category: "TOOLS", sku: "INV-SC001",
      quantity: 4, unit: "pcs", minQuantity: 2,
      costPrice: 35, salePrice: null, supplier: "Kenchii Tools",
      updatedAt: new Date(),
    },
  });

  const inv6 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Salon Towels (Pack of 12)",
      category: "CONSUMABLES", sku: "INV-TW001",
      quantity: 2, unit: "pack", minQuantity: 3,
      costPrice: 22, salePrice: null, supplier: "LinenPro",
      updatedAt: new Date(),
    },
  });

  const inv7 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Cream Developer 20 Vol",
      category: "COLOR", sku: "INV-DV001",
      quantity: 12, unit: "bottle", minQuantity: 6,
      costPrice: 5.5, salePrice: null, supplier: "Wella Professional",
      updatedAt: new Date(),
    },
  });

  const inv8 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Highlights Kit — Balayage",
      category: "COLOR", sku: "INV-HK001",
      quantity: 7, unit: "kit", minQuantity: 5,
      costPrice: 18, salePrice: 45, supplier: "Schwarzkopf",
      updatedAt: new Date(),
    },
  });

  const inv9 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Foil Sheets (500 pack)",
      category: "CONSUMABLES", sku: "INV-FO001",
      quantity: 1, unit: "pack", minQuantity: 3,
      costPrice: 12, salePrice: null, supplier: "SalonSupply Co.",
      updatedAt: new Date(),
    },
  });

  const inv10 = await prisma.inventoryItem.create({
    data: {
      id: randomUUID(), salonId: salon.id,
      name: "Nail Polish — OPI Collection",
      category: "RETAIL", sku: "INV-NP001",
      quantity: 30, unit: "bottle", minQuantity: 10,
      costPrice: 6.5, salePrice: 14, supplier: "OPI Distributors",
      updatedAt: new Date(),
    },
  });

  const allInventory = [inv1, inv2, inv3, inv4, inv5, inv6, inv7, inv8, inv9, inv10];
  console.log(`   Created ${allInventory.length} inventory items.`);

  // ── 19. InventoryTransactions ─────────────────────────────────────────────
  console.log("🔄 Creating inventory transactions...");

  await prisma.inventoryTransaction.createMany({
    data: [
      // Initial stock-in for several items
      { id: randomUUID(), itemId: inv1.id, type: "IN",         quantity: 30,  note: "Initial stock order"              },
      { id: randomUUID(), itemId: inv1.id, type: "OUT",        quantity: -6,  note: "Used in services — weekly"        },
      { id: randomUUID(), itemId: inv2.id, type: "IN",         quantity: 24,  note: "Initial stock order"              },
      { id: randomUUID(), itemId: inv2.id, type: "OUT",        quantity: -6,  note: "Used in services — weekly"        },
      { id: randomUUID(), itemId: inv3.id, type: "IN",         quantity: 12,  note: "Restock — Ash Blonde"             },
      { id: randomUUID(), itemId: inv3.id, type: "OUT",        quantity: -6,  note: "Used for hair color appointments" },
      { id: randomUUID(), itemId: inv4.id, type: "IN",         quantity: 10,  note: "Restock — Chestnut Brown"         },
      { id: randomUUID(), itemId: inv4.id, type: "OUT",        quantity: -7,  note: "Used for hair color appointments" },
      { id: randomUUID(), itemId: inv6.id, type: "IN",         quantity: 5,   note: "Towel restock"                    },
      { id: randomUUID(), itemId: inv6.id, type: "OUT",        quantity: -3,  note: "Used in salon operations"         },
      { id: randomUUID(), itemId: inv7.id, type: "IN",         quantity: 20,  note: "Initial stock"                    },
      { id: randomUUID(), itemId: inv7.id, type: "OUT",        quantity: -8,  note: "Used in color services"           },
      { id: randomUUID(), itemId: inv9.id, type: "IN",         quantity: 4,   note: "Initial foil stock"               },
      { id: randomUUID(), itemId: inv9.id, type: "OUT",        quantity: -3,  note: "Used in highlights services"      },
      { id: randomUUID(), itemId: inv10.id, type: "IN",        quantity: 40,  note: "OPI collection restock"           },
      { id: randomUUID(), itemId: inv10.id, type: "OUT",       quantity: -10, note: "Retail sales"                     },
      { id: randomUUID(), itemId: inv5.id, type: "IN",         quantity: 4,   note: "Tool purchase"                    },
      { id: randomUUID(), itemId: inv8.id, type: "ADJUSTMENT", quantity: 7,   note: "Opening inventory count"          },
    ],
  });

  console.log("   Created 18 inventory transactions.");

  // ── 20. TimeOff ───────────────────────────────────────────────────────────
  console.log("🌴 Creating time-off entries...");

  await prisma.timeOff.createMany({
    data: [
      {
        id: randomUUID(), staffId: anna.id,
        startDate: daysFromNow(14), endDate: daysFromNow(16),
        reason: "Personal vacation", approved: true,
      },
      {
        id: randomUUID(), staffId: james.id,
        startDate: daysFromNow(7), endDate: daysFromNow(7),
        reason: "Medical appointment", approved: true,
      },
      {
        id: randomUUID(), staffId: maria.id,
        startDate: daysFromNow(21), endDate: daysFromNow(25),
        reason: "Family trip", approved: false,
      },
      {
        id: randomUUID(), staffId: lisa.id,
        startDate: daysAgo(10), endDate: daysAgo(10),
        reason: "Sick day", approved: true,
      },
    ],
  });

  console.log("   Created 4 time-off entries.");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("");
  console.log("🎉 Seed complete — Studio Luxe is ready!");
  console.log(`   Salon:          ${salon.name} (${salon.slug})`);
  console.log(`   Categories:     5`);
  console.log(`   Services:       ${allServices.length}`);
  console.log(`   Staff:          4 (with shifts and service assignments)`);
  console.log(`   Clients:        ${clients.length}`);
  console.log(`   Appointments:   ${appointments.length} (${completedAppts.length} completed, ${appointments.length - completedAppts.length} other)`);
  console.log(`   Invoices:       ${completedAppts.length} (PAID)`);
  console.log(`   Ledger:         12 entries`);
  console.log(`   Reminders:      ${Math.min(futureAppts.length, 8)} pending`);
  console.log(`   Expenses:       10`);
  console.log(`   Coupons:        4`);
  console.log(`   Reviews:        ${reviewSpecs.length}`);
  console.log(`   MembershipPlans: 3 (Silver, Gold, Platinum)`);
  console.log(`   ClientMemberships: 5`);
  console.log(`   GiftCards:      3 (2 active, 1 redeemed)`);
  console.log(`   GiftCardTxns:   5`);
  console.log(`   Campaigns:      4`);
  console.log(`   InventoryItems: ${allInventory.length} (4 low-stock)`);
  console.log(`   InventoryTxns:  18`);
  console.log(`   TimeOff:        4`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
