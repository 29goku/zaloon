import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

// Helper: date string N days ago from today
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function main() {
  // ── Teardown (ordered by FK) ──────────────────────────────────────────────
  await prisma.invoice.deleteMany();
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.client.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salon.deleteMany();

  // ── Salon ─────────────────────────────────────────────────────────────────
  const salon = await prisma.salon.create({
    data: {
      name: "Style Studio",
      slug: "style-studio",
      address: "42 MG Road, Koramangala",
      city: "Bengaluru",
      country: "IN",
      timezone: "Asia/Kolkata",
      currency: "INR",
      phone: "+91 80 4567 8900",
      email: "hello@stylestudio.in",
    },
  });

  // ── Service Categories ────────────────────────────────────────────────────
  const [hairCat, skinCat, nailsCat, makeupCat] = await Promise.all([
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Hair", icon: "✂️" } }),
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Skin", icon: "🌿" } }),
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Nails", icon: "💅" } }),
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Makeup", icon: "💄" } }),
  ]);

  // ── Services (12+) ────────────────────────────────────────────────────────
  const [
    haircut,       // 0  Hair
    hairColor,     // 1  Hair
    highlights,    // 2  Hair
    blowDry,       // 3  Hair
    keratin,       // 4  Hair
    facial,        // 5  Skin
    cleanup,       // 6  Skin
    deetan,        // 7  Skin
    manicure,      // 8  Nails
    pedicure,      // 9  Nails
    gelNails,      // 10 Nails
    brideMakeup,   // 11 Makeup
    partyMakeup,   // 12 Makeup
  ] = await Promise.all([
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Haircut (Women)", durationMins: 45, price: 350 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Hair Color (Full)", durationMins: 90, price: 800 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Global Highlights", durationMins: 120, price: 1200 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Blow Dry & Styling", durationMins: 30, price: 250 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Keratin Treatment", durationMins: 180, price: 3500 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: skinCat.id, name: "Brightening Facial", durationMins: 60, price: 600 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: skinCat.id, name: "Deep Pore Cleanup", durationMins: 45, price: 400 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: skinCat.id, name: "De-Tan Treatment", durationMins: 30, price: 300 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: nailsCat.id, name: "Manicure", durationMins: 30, price: 300 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: nailsCat.id, name: "Pedicure", durationMins: 45, price: 400 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: nailsCat.id, name: "Gel Nail Extensions", durationMins: 90, price: 900 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: makeupCat.id, name: "Bridal Makeup", durationMins: 120, price: 5000 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: makeupCat.id, name: "Party Makeup", durationMins: 60, price: 1500 } }),
  ]);

  // ── Staff (5 members) ─────────────────────────────────────────────────────
  const [priya, rahul, ananya, vikram, meera] = await Promise.all([
    prisma.staff.create({ data: { salonId: salon.id, name: "Priya Sharma", phone: "+91 98400 11001" } }),
    prisma.staff.create({ data: { salonId: salon.id, name: "Rahul Verma", phone: "+91 98400 11002" } }),
    prisma.staff.create({ data: { salonId: salon.id, name: "Ananya Iyer", phone: "+91 98400 11003" } }),
    prisma.staff.create({ data: { salonId: salon.id, name: "Vikram Nair", phone: "+91 98400 11004" } }),
    prisma.staff.create({ data: { salonId: salon.id, name: "Meera Pillai", phone: "+91 98400 11005" } }),
  ]);

  // Shifts: Mon–Sat (1–6), 9:00–19:00 for all staff
  const monToSat = [1, 2, 3, 4, 5, 6];
  const shiftData = [priya, rahul, ananya, vikram, meera].flatMap((s) =>
    monToSat.map((d) => ({ staffId: s.id, dayOfWeek: d, startTime: "09:00", endTime: "19:00" }))
  );
  await prisma.shift.createMany({ data: shiftData });

  // Staff ↔ Service assignments
  await prisma.staffService.createMany({
    data: [
      // Priya — hair specialist
      { staffId: priya.id, serviceId: haircut.id },
      { staffId: priya.id, serviceId: hairColor.id },
      { staffId: priya.id, serviceId: highlights.id },
      { staffId: priya.id, serviceId: blowDry.id },
      { staffId: priya.id, serviceId: keratin.id },
      // Rahul — hair & color
      { staffId: rahul.id, serviceId: haircut.id },
      { staffId: rahul.id, serviceId: hairColor.id },
      { staffId: rahul.id, serviceId: blowDry.id },
      // Ananya — skin & nails
      { staffId: ananya.id, serviceId: facial.id },
      { staffId: ananya.id, serviceId: cleanup.id },
      { staffId: ananya.id, serviceId: deetan.id },
      { staffId: ananya.id, serviceId: manicure.id },
      { staffId: ananya.id, serviceId: pedicure.id },
      // Vikram — nails
      { staffId: vikram.id, serviceId: manicure.id },
      { staffId: vikram.id, serviceId: pedicure.id },
      { staffId: vikram.id, serviceId: gelNails.id },
      // Meera — makeup
      { staffId: meera.id, serviceId: brideMakeup.id },
      { staffId: meera.id, serviceId: partyMakeup.id },
      { staffId: meera.id, serviceId: facial.id },
    ],
  });

  // ── Clients (20) ──────────────────────────────────────────────────────────
  const clientData = [
    { name: "Kavya Reddy",      phone: "+91 99000 20001", email: "kavya.reddy@gmail.com",   birthday: new Date("1994-03-12") },
    { name: "Sunita Menon",     phone: "+91 99000 20002", email: "sunita.menon@outlook.com", birthday: new Date("1988-11-05") },
    { name: "Pooja Agarwal",    phone: "+91 99000 20003", email: null,                        birthday: new Date("1997-07-22") },
    { name: "Divya Krishnan",   phone: "+91 99000 20004", email: "divya.k@yahoo.com",        birthday: null },
    { name: "Riya Patel",       phone: "+91 99000 20005", email: "riya.patel@gmail.com",     birthday: new Date("1995-01-30") },
    { name: "Aishwarya Rao",    phone: "+91 99000 20006", email: null,                        birthday: new Date("1990-09-14") },
    { name: "Nisha Gupta",      phone: "+91 99000 20007", email: "nisha.g@gmail.com",        birthday: null },
    { name: "Shreya Joshi",     phone: "+91 99000 20008", email: null,                        birthday: new Date("1993-06-08") },
    { name: "Pallavi Singh",    phone: "+91 99000 20009", email: "pallavi.s@gmail.com",      birthday: null },
    { name: "Ankita Desai",     phone: "+91 99000 20010", email: "ankita.d@hotmail.com",     birthday: new Date("1999-12-19") },
    { name: "Meghna Bose",      phone: "+91 99000 20011", email: null,                        birthday: null },
    { name: "Tanya Chawla",     phone: "+91 99000 20012", email: "tanya.c@gmail.com",        birthday: new Date("1991-04-27") },
    { name: "Sonal Kapoor",     phone: "+91 99000 20013", email: null,                        birthday: null },
    { name: "Preethi Nair",     phone: "+91 99000 20014", email: "preethi.n@gmail.com",      birthday: new Date("1996-08-03") },
    { name: "Deepa Subramaniam",phone: "+91 99000 20015", email: null,                        birthday: null },
    { name: "Rekha Bhatt",      phone: "+91 99000 20016", email: "rekha.bhatt@gmail.com",    birthday: new Date("1987-02-18") },
    { name: "Swati Kulkarni",   phone: "+91 99000 20017", email: null,                        birthday: null },
    { name: "Lavanya Iyer",     phone: "+91 99000 20018", email: "lavanya.i@gmail.com",      birthday: new Date("1998-10-11") },
    { name: "Chitra Venkat",    phone: "+91 99000 20019", email: null,                        birthday: null },
    { name: "Madhuri Thakur",   phone: "+91 99000 20020", email: "madhuri.t@gmail.com",      birthday: new Date("1992-05-25") },
  ];

  const clients = await Promise.all(
    clientData.map((c) => prisma.client.create({ data: { salonId: salon.id, ...c } }))
  );

  // ── Appointments (30, spread over last 30 days) ───────────────────────────
  // Statuses: mostly COMPLETED for older, mix in the middle, SCHEDULED for recent
  type ApptSpec = {
    clientIdx: number;
    staffRef: typeof priya;
    serviceIdxs: number[];
    daysBack: number;
    startTime: string;
    status: string;
  };

  const allServices = [
    haircut, hairColor, highlights, blowDry, keratin,
    facial, cleanup, deetan,
    manicure, pedicure, gelNails,
    brideMakeup, partyMakeup,
  ];

  const apptSpecs: ApptSpec[] = [
    { clientIdx: 0,  staffRef: priya,  serviceIdxs: [0],     daysBack: 29, startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 1,  staffRef: ananya, serviceIdxs: [5],     daysBack: 28, startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 2,  staffRef: meera,  serviceIdxs: [12],    daysBack: 27, startTime: "11:00", status: "COMPLETED" },
    { clientIdx: 3,  staffRef: vikram, serviceIdxs: [8, 9],  daysBack: 26, startTime: "14:00", status: "COMPLETED" },
    { clientIdx: 4,  staffRef: rahul,  serviceIdxs: [1],     daysBack: 25, startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 5,  staffRef: priya,  serviceIdxs: [2],     daysBack: 24, startTime: "10:30", status: "COMPLETED" },
    { clientIdx: 6,  staffRef: ananya, serviceIdxs: [6],     daysBack: 23, startTime: "15:00", status: "CANCELLED" },
    { clientIdx: 7,  staffRef: vikram, serviceIdxs: [10],    daysBack: 22, startTime: "13:00", status: "COMPLETED" },
    { clientIdx: 8,  staffRef: rahul,  serviceIdxs: [0, 3],  daysBack: 21, startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 9,  staffRef: ananya, serviceIdxs: [7],     daysBack: 20, startTime: "11:00", status: "NO_SHOW"   },
    { clientIdx: 10, staffRef: meera,  serviceIdxs: [11],    daysBack: 19, startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 11, staffRef: priya,  serviceIdxs: [4],     daysBack: 18, startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 12, staffRef: ananya, serviceIdxs: [5, 6],  daysBack: 17, startTime: "14:30", status: "COMPLETED" },
    { clientIdx: 13, staffRef: vikram, serviceIdxs: [9],     daysBack: 16, startTime: "16:00", status: "CANCELLED" },
    { clientIdx: 14, staffRef: rahul,  serviceIdxs: [1],     daysBack: 15, startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 15, staffRef: priya,  serviceIdxs: [0],     daysBack: 14, startTime: "12:00", status: "COMPLETED" },
    { clientIdx: 16, staffRef: ananya, serviceIdxs: [7],     daysBack: 13, startTime: "11:30", status: "NO_SHOW"   },
    { clientIdx: 17, staffRef: meera,  serviceIdxs: [12],    daysBack: 12, startTime: "15:00", status: "COMPLETED" },
    { clientIdx: 18, staffRef: vikram, serviceIdxs: [8],     daysBack: 11, startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 19, staffRef: rahul,  serviceIdxs: [3],     daysBack: 10, startTime: "13:00", status: "COMPLETED" },
    { clientIdx: 0,  staffRef: ananya, serviceIdxs: [5],     daysBack: 9,  startTime: "10:00", status: "COMPLETED" },
    { clientIdx: 2,  staffRef: priya,  serviceIdxs: [2],     daysBack: 8,  startTime: "09:00", status: "COMPLETED" },
    { clientIdx: 4,  staffRef: vikram, serviceIdxs: [9, 10], daysBack: 7,  startTime: "14:00", status: "COMPLETED" },
    { clientIdx: 6,  staffRef: rahul,  serviceIdxs: [0],     daysBack: 6,  startTime: "11:00", status: "CANCELLED" },
    { clientIdx: 8,  staffRef: meera,  serviceIdxs: [11],    daysBack: 5,  startTime: "10:30", status: "COMPLETED" },
    { clientIdx: 10, staffRef: ananya, serviceIdxs: [6],     daysBack: 4,  startTime: "15:30", status: "COMPLETED" },
    { clientIdx: 12, staffRef: priya,  serviceIdxs: [1, 3],  daysBack: 3,  startTime: "09:30", status: "COMPLETED" },
    { clientIdx: 14, staffRef: vikram, serviceIdxs: [8],     daysBack: 2,  startTime: "13:00", status: "SCHEDULED" },
    { clientIdx: 16, staffRef: rahul,  serviceIdxs: [0],     daysBack: 1,  startTime: "10:00", status: "SCHEDULED" },
    { clientIdx: 18, staffRef: ananya, serviceIdxs: [5, 7],  daysBack: 0,  startTime: "11:30", status: "SCHEDULED" },
  ];

  const appointments = await Promise.all(
    apptSpecs.map((spec) => {
      const svcList = spec.serviceIdxs.map((i) => allServices[i]);
      const total = svcList.reduce((s, sv) => s + sv.price, 0);
      return prisma.appointment.create({
        data: {
          salonId: salon.id,
          clientId: clients[spec.clientIdx].id,
          staffId: spec.staffRef.id,
          date: daysAgo(spec.daysBack),
          startTime: spec.startTime,
          totalAmount: total,
          status: spec.status,
        },
      });
    })
  );

  // AppointmentService join rows
  const apptServiceRows = apptSpecs.flatMap((spec, idx) =>
    spec.serviceIdxs.map((si) => ({
      appointmentId: appointments[idx].id,
      serviceId: allServices[si].id,
    }))
  );
  await prisma.appointmentService.createMany({ data: apptServiceRows });

  // ── Invoices (15, for COMPLETED appointments) ─────────────────────────────
  const completedIdxs = apptSpecs
    .map((s, i) => (s.status === "COMPLETED" ? i : -1))
    .filter((i) => i !== -1)
    .slice(0, 15);

  const paymentMethods = ["CASH", "CARD", "UPI", "CASH", "UPI", "CARD", "UPI", "CASH", "CARD", "UPI", "CASH", "UPI", "CARD", "CASH", "UPI"];

  await prisma.invoice.createMany({
    data: completedIdxs.map((apptIdx, i) => ({
      salonId: salon.id,
      clientId: clients[apptSpecs[apptIdx].clientIdx].id,
      appointmentId: appointments[apptIdx].id,
      total: appointments[apptIdx].totalAmount,
      paymentMethod: paymentMethods[i],
      status: "PAID",
    })),
  });

  // ── Ledger Entries (10) ───────────────────────────────────────────────────
  await prisma.ledgerEntry.createMany({
    data: [
      { clientId: clients[0].id,  type: "DEBIT",  amount: 350,  note: "Haircut — Priya, 2 Jun" },
      { clientId: clients[0].id,  type: "CREDIT", amount: 350,  note: "Payment received — UPI" },
      { clientId: clients[3].id,  type: "DEBIT",  amount: 700,  note: "Manicure + Pedicure — Vikram" },
      { clientId: clients[3].id,  type: "CREDIT", amount: 400,  note: "Partial payment — Cash" },
      { clientId: clients[7].id,  type: "DEBIT",  amount: 900,  note: "Gel Nail Extensions — Vikram" },
      { clientId: clients[9].id,  type: "DEBIT",  amount: 300,  note: "De-Tan — Ananya, tab opened" },
      { clientId: clients[11].id, type: "DEBIT",  amount: 3500, note: "Keratin Treatment — Priya" },
      { clientId: clients[11].id, type: "CREDIT", amount: 3500, note: "Full payment — Card" },
      { clientId: clients[14].id, type: "DEBIT",  amount: 600,  note: "Brightening Facial — Ananya" },
      { clientId: clients[14].id, type: "CREDIT", amount: 600,  note: "Payment received — UPI" },
    ],
  });

  console.log("✅ Seed complete — Style Studio is ready!");
  console.log(`   Salon:        ${salon.name}`);
  console.log(`   Staff:        5`);
  console.log(`   Services:     13`);
  console.log(`   Clients:      ${clients.length}`);
  console.log(`   Appointments: ${appointments.length}`);
  console.log(`   Invoices:     ${completedIdxs.length}`);
  console.log(`   Ledger:       10 entries`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
