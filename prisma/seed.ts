import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
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

  const salon = await prisma.salon.create({
    data: {
      name: "Studio One",
      slug: "studio-one",
      city: "New York",
      country: "US",
      timezone: "America/New_York",
      currency: "USD",
      phone: "+1 212 555 0100",
      email: "hello@studioone.com",
      address: "145 W 57th St, New York, NY 10019",
    },
  });

  const [zoe, marcus, luna] = await Promise.all([
    prisma.staff.create({ data: { salonId: salon.id, name: "Zoe Hartman", phone: "+1 555 0101" } }),
    prisma.staff.create({ data: { salonId: salon.id, name: "Marcus Reed", phone: "+1 555 0102" } }),
    prisma.staff.create({ data: { salonId: salon.id, name: "Luna Patel", phone: "+1 555 0103" } }),
  ]);

  await prisma.shift.createMany({
    data: [
      ...[1, 2, 3, 4, 5].map((d) => ({ staffId: zoe.id, dayOfWeek: d, startTime: "09:00", endTime: "18:00" })),
      ...[1, 2, 3, 4, 5].map((d) => ({ staffId: marcus.id, dayOfWeek: d, startTime: "10:00", endTime: "19:00" })),
      ...[2, 3, 4, 5, 6].map((d) => ({ staffId: luna.id, dayOfWeek: d, startTime: "11:00", endTime: "20:00" })),
    ],
  });

  const [hairCat, colorCat, nailsCat, treatmentCat] = await Promise.all([
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Haircut & Styling", icon: "✂️" } }),
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Color & Highlights", icon: "🎨" } }),
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Nails", icon: "💅" } }),
    prisma.serviceCategory.create({ data: { salonId: salon.id, name: "Treatments", icon: "✨" } }),
  ]);

  const services = await Promise.all([
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Women's Haircut", durationMins: 45, price: 75 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Men's Haircut", durationMins: 30, price: 45 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: hairCat.id, name: "Blowout", durationMins: 40, price: 55 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: colorCat.id, name: "Full Color", durationMins: 90, price: 120 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: colorCat.id, name: "Highlights", durationMins: 120, price: 165 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: nailsCat.id, name: "Manicure", durationMins: 30, price: 35 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: nailsCat.id, name: "Pedicure", durationMins: 45, price: 50 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: treatmentCat.id, name: "Scalp Treatment", durationMins: 60, price: 80 } }),
    prisma.service.create({ data: { salonId: salon.id, categoryId: treatmentCat.id, name: "Deep Conditioning", durationMins: 45, price: 65 } }),
  ]);

  await prisma.staffService.createMany({
    data: [
      { staffId: zoe.id, serviceId: services[0].id },
      { staffId: zoe.id, serviceId: services[2].id },
      { staffId: zoe.id, serviceId: services[3].id },
      { staffId: zoe.id, serviceId: services[4].id },
      { staffId: marcus.id, serviceId: services[0].id },
      { staffId: marcus.id, serviceId: services[1].id },
      { staffId: marcus.id, serviceId: services[2].id },
      { staffId: luna.id, serviceId: services[5].id },
      { staffId: luna.id, serviceId: services[6].id },
      { staffId: luna.id, serviceId: services[7].id },
      { staffId: luna.id, serviceId: services[8].id },
    ],
  });

  const clients = await Promise.all([
    prisma.client.create({ data: { salonId: salon.id, name: "Aria Thompson", phone: "+1 555 2001", email: "aria@example.com", birthday: new Date("1992-07-14") } }),
    prisma.client.create({ data: { salonId: salon.id, name: "James Okafor", phone: "+1 555 2002", email: "james@example.com" } }),
    prisma.client.create({ data: { salonId: salon.id, name: "Sofia Reyes", phone: "+1 555 2003", birthday: new Date("1988-07-29"), anniversary: new Date("2018-06-01") } }),
    prisma.client.create({ data: { salonId: salon.id, name: "David Kim", phone: "+1 555 2004" } }),
    prisma.client.create({ data: { salonId: salon.id, name: "Emma Laurent", phone: "+1 555 2005", email: "emma@example.com" } }),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const appts = await Promise.all([
    prisma.appointment.create({ data: { salonId: salon.id, clientId: clients[0].id, staffId: zoe.id, date: today, startTime: "09:30", totalAmount: 75, status: "COMPLETED" } }),
    prisma.appointment.create({ data: { salonId: salon.id, clientId: clients[1].id, staffId: marcus.id, date: today, startTime: "10:00", totalAmount: 45, status: "COMPLETED" } }),
    prisma.appointment.create({ data: { salonId: salon.id, clientId: clients[2].id, staffId: zoe.id, date: today, startTime: "11:30", totalAmount: 165, status: "SCHEDULED" } }),
    prisma.appointment.create({ data: { salonId: salon.id, clientId: clients[3].id, staffId: luna.id, date: today, startTime: "13:00", totalAmount: 85, status: "SCHEDULED" } }),
    prisma.appointment.create({ data: { salonId: salon.id, clientId: clients[4].id, staffId: marcus.id, date: today, startTime: "14:30", totalAmount: 120, status: "SCHEDULED" } }),
  ]);

  await prisma.appointmentService.createMany({
    data: [
      { appointmentId: appts[0].id, serviceId: services[0].id },
      { appointmentId: appts[1].id, serviceId: services[1].id },
      { appointmentId: appts[2].id, serviceId: services[4].id },
      { appointmentId: appts[3].id, serviceId: services[5].id },
      { appointmentId: appts[3].id, serviceId: services[6].id },
      { appointmentId: appts[4].id, serviceId: services[3].id },
    ],
  });

  await prisma.invoice.createMany({
    data: [
      { salonId: salon.id, clientId: clients[0].id, appointmentId: appts[0].id, total: 75, paymentMethod: "CARD", status: "PAID" },
      { salonId: salon.id, clientId: clients[1].id, appointmentId: appts[1].id, total: 45, paymentMethod: "CASH", status: "PAID" },
    ],
  });

  await prisma.ledgerEntry.createMany({
    data: [
      { clientId: clients[2].id, type: "DEBIT", amount: 200, note: "Outstanding balance from last visit" },
      { clientId: clients[2].id, type: "CREDIT", amount: 100, note: "Partial payment" },
      { clientId: clients[4].id, type: "DEBIT", amount: 65, note: "Tab — deep conditioning" },
    ],
  });

  console.log("✅ Seed complete — Studio One is ready!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
