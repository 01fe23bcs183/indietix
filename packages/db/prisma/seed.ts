import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";
import {
  createSignedTicket,
  encodeTicketForQR,
  hashTicketPayload,
} from "@indietix/utils";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log("🌱 Starting database seed...");

  const password = await hash("password123", SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@indietix.com" },
    update: {},
    create: {
      email: "admin@indietix.com",
      name: "Admin User",
      passwordHash: password,
      role: "ADMIN",
      phone: "+919876543210",
    },
  });
  console.log("✅ Created ADMIN user:", admin.email);

  const organizer1User = await prisma.user.upsert({
    where: { email: "organizer1@indietix.com" },
    update: {},
    create: {
      email: "organizer1@indietix.com",
      name: "Ravi Kumar",
      passwordHash: password,
      role: "ORGANIZER",
      phone: "+919876543211",
    },
  });

  const organizer1 = await prisma.organizer.upsert({
    where: { userId: organizer1User.id },
    update: {},
    create: {
      userId: organizer1User.id,
      businessName: "EventPro India",
      description: "Leading event management company in India",
      verified: true,
    },
  });
  console.log("✅ Created ORGANIZER 1:", organizer1.businessName);

  const organizer2User = await prisma.user.upsert({
    where: { email: "organizer2@indietix.com" },
    update: {},
    create: {
      email: "organizer2@indietix.com",
      name: "Priya Sharma",
      passwordHash: password,
      role: "ORGANIZER",
      phone: "+919876543212",
    },
  });

  const organizer2 = await prisma.organizer.upsert({
    where: { userId: organizer2User.id },
    update: {},
    create: {
      userId: organizer2User.id,
      businessName: "Mumbai Events Co",
      description: "Premium event experiences in Mumbai",
      verified: true,
    },
  });
  console.log("✅ Created ORGANIZER 2:", organizer2.businessName);

  const events = [
    {
      organizerId: organizer1.id,
      title: "Sunburn Festival 2025",
      slug: "sunburn-festival-2025-bengaluru",
      description:
        "Asia's biggest electronic music festival returns to Bengaluru",
      category: "MUSIC" as const,
      city: "Bengaluru",
      venue: "Jayamahal Palace Grounds",
      date: new Date("2025-12-15T18:00:00Z"),
      price: 2500,
      totalSeats: 5000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer1.id,
      title: "Booking Test Event - Future Date",
      slug: "booking-test-event-future",
      description: "Test event for booking system with 100 available seats",
      category: "TECH" as const,
      city: "Bengaluru",
      venue: "Test Venue",
      date: new Date("2026-06-15T18:00:00Z"),
      price: 500,
      totalSeats: 100,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer1.id,
      title: "Stand-Up Comedy Night with Zakir Khan",
      slug: "zakir-khan-comedy-bengaluru",
      description: "An evening of laughter with India's favorite comedian",
      category: "COMEDY" as const,
      city: "Bengaluru",
      venue: "Chowdiah Memorial Hall",
      date: new Date("2026-01-20T19:30:00Z"),
      price: 800,
      totalSeats: 1200,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer2.id,
      title: "IPL 2025: Mumbai Indians vs RCB",
      slug: "ipl-2025-mi-vs-rcb",
      description: "Witness the clash of titans at Wankhede Stadium",
      category: "SPORTS" as const,
      city: "Mumbai",
      venue: "Wankhede Stadium",
      date: new Date("2025-04-10T19:30:00Z"),
      price: 1500,
      totalSeats: 33000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer2.id,
      title: "TechCrunch Disrupt Mumbai 2025",
      slug: "techcrunch-disrupt-mumbai-2025",
      description: "India's premier startup and technology conference",
      category: "TECH" as const,
      city: "Mumbai",
      venue: "Jio World Convention Centre",
      date: new Date("2025-09-25T09:00:00Z"),
      price: 5000,
      totalSeats: 2000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer1.id,
      title: "Delhi Food Festival 2025",
      slug: "delhi-food-festival-2025",
      description: "Celebrate India's culinary diversity",
      category: "FOOD" as const,
      city: "Delhi",
      venue: "Jawaharlal Nehru Stadium",
      date: new Date("2025-11-05T11:00:00Z"),
      price: 500,
      totalSeats: 10000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer2.id,
      title: "India Art Fair 2025",
      slug: "india-art-fair-2025-delhi",
      description: "South Asia's leading international art fair",
      category: "ART" as const,
      city: "Delhi",
      venue: "NSIC Exhibition Grounds",
      date: new Date("2025-02-08T10:00:00Z"),
      price: 1200,
      totalSeats: 5000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer1.id,
      title: "NH7 Weekender Bengaluru",
      slug: "nh7-weekender-bengaluru-2025",
      description: "India's happiest music festival",
      category: "MUSIC" as const,
      city: "Bengaluru",
      venue: "Backyard Sports Club",
      date: new Date("2025-11-28T14:00:00Z"),
      price: 3500,
      totalSeats: 8000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer2.id,
      title: "Mumbai Marathon 2025",
      slug: "mumbai-marathon-2025",
      description: "Asia's largest marathon event",
      category: "SPORTS" as const,
      city: "Mumbai",
      venue: "Chhatrapati Shivaji Terminus",
      date: new Date("2025-01-19T06:00:00Z"),
      price: 1000,
      totalSeats: 50000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer1.id,
      title: "Photography Workshop with Raghu Rai",
      slug: "photography-workshop-delhi-2025",
      description:
        "Learn the art of photography from India's legendary photographer",
      category: "OTHER" as const,
      city: "Delhi",
      venue: "India Habitat Centre",
      date: new Date("2025-03-15T10:00:00Z"),
      price: 2000,
      totalSeats: 50,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer2.id,
      title: "Biswa Kalyan Rath Live in Mumbai",
      slug: "biswa-comedy-mumbai-2025",
      description: "Stand-up comedy special by Biswa Kalyan Rath",
      category: "COMEDY" as const,
      city: "Mumbai",
      venue: "NCPA Tata Theatre",
      date: new Date("2026-02-20T20:00:00Z"),
      price: 999,
      totalSeats: 800,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer1.id,
      title: "Arijit Singh Live in Concert",
      slug: "arijit-singh-delhi-2025",
      description: "Experience the magic of Arijit Singh live in Delhi",
      category: "MUSIC" as const,
      city: "Delhi",
      venue: "Indira Gandhi Indoor Stadium",
      date: new Date("2025-06-10T19:00:00Z"),
      price: 1999,
      totalSeats: 15000,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
    {
      organizerId: organizer2.id,
      title: "Digital Marketing Masterclass",
      slug: "digital-marketing-workshop-bengaluru-2025",
      description: "Hands-on workshop on modern digital marketing strategies",
      category: "OTHER" as const,
      city: "Bengaluru",
      venue: "WeWork Prestige Central",
      date: new Date("2025-07-05T09:30:00Z"),
      price: 1500,
      totalSeats: 100,
      bookedSeats: 0,
      status: "PUBLISHED" as const,
    },
  ];

  console.log("🎉 Creating events...");
  const createdEvents = [];
  for (const eventData of events) {
    const event = await prisma.event.upsert({
      where: { slug: eventData.slug },
      update: {},
      create: eventData,
    });
    createdEvents.push(event);
    console.log(`✅ Created event: ${event.title}`);
  }

  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@example.com" },
    update: {},
    create: {
      email: "customer1@example.com",
      name: "Amit Patel",
      passwordHash: password,
      role: "CUSTOMER",
      phone: "+919876543213",
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: "customer2@example.com" },
    update: {},
    create: {
      email: "customer2@example.com",
      name: "Neha Singh",
      passwordHash: password,
      role: "CUSTOMER",
      phone: "+919876543214",
    },
  });

  console.log("🎫 Creating sample bookings...");
  const sunburnEvent = createdEvents[0];

  if (sunburnEvent) {
    const bookings = [
      {
        eventId: sunburnEvent.id,
        userId: customer1.id,
        quantity: 2,
        totalAmount: 5000,
        paymentStatus: "COMPLETED" as const,
        status: "CONFIRMED" as const,
      },
      {
        eventId: sunburnEvent.id,
        userId: customer2.id,
        quantity: 1,
        totalAmount: 2500,
        paymentStatus: "COMPLETED" as const,
        status: "CONFIRMED" as const,
      },
      {
        eventId: sunburnEvent.id,
        userId: customer1.id,
        quantity: 3,
        totalAmount: 7500,
        paymentStatus: "COMPLETED" as const,
        status: "CONFIRMED" as const,
      },
      {
        eventId: sunburnEvent.id,
        userId: customer2.id,
        quantity: 2,
        totalAmount: 5000,
        paymentStatus: "COMPLETED" as const,
        status: "CONFIRMED" as const,
      },
      {
        eventId: sunburnEvent.id,
        userId: customer1.id,
        quantity: 1,
        totalAmount: 2500,
        paymentStatus: "COMPLETED" as const,
        status: "CONFIRMED" as const,
      },
    ];

    for (const bookingData of bookings) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketNumber = `TIX-${timestamp}-${random}`;
      const { eventId, userId, paymentStatus, status, quantity } = bookingData;
      const ticketPrice = sunburnEvent.price * quantity;
      const convenienceFee = Math.round(ticketPrice * 0.05);
      const platformFee = Math.round(ticketPrice * 0.03);
      const finalAmount = ticketPrice + convenienceFee + platformFee;

      await prisma.booking.create({
        data: {
          eventId,
          userId,
          paymentStatus,
          status,
          ticketNumber,
          seats: quantity,
          ticketPrice,
          convenienceFee,
          platformFee,
          finalAmount,
          holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    }
    console.log(`✅ Created 5 sample bookings for ${sunburnEvent.title}`);
  }

  console.log("🎫 Creating organizer-owned event with attendees for DX...");
  const dxEvent = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      title: "Bangalore Tech Meetup 2025",
      slug: "bangalore-tech-meetup-2025",
      description:
        "A networking event for tech enthusiasts and developers in Bangalore",
      category: "TECH",
      city: "Bengaluru",
      venue: "Koramangala Social",
      date: new Date("2025-12-01T18:00:00Z"),
      price: 500,
      totalSeats: 100,
      bookedSeats: 0,
      status: "PUBLISHED",
    },
  });
  console.log(`✅ Created DX event: ${dxEvent.title}`);

  const customer3 = await prisma.user.create({
    data: {
      email: "customer3@example.com",
      name: "Rajesh Kumar",
      passwordHash: password,
      role: "CUSTOMER",
      phone: "+919876543215",
    },
  });

  const dxBookings = [
    {
      eventId: dxEvent.id,
      userId: customer1.id,
      quantity: 2,
      totalAmount: 1000,
      paymentStatus: "COMPLETED" as const,
      status: "CONFIRMED" as const,
    },
    {
      eventId: dxEvent.id,
      userId: customer2.id,
      quantity: 1,
      totalAmount: 500,
      paymentStatus: "COMPLETED" as const,
      status: "CONFIRMED" as const,
    },
    {
      eventId: dxEvent.id,
      userId: customer3.id,
      quantity: 3,
      totalAmount: 1500,
      paymentStatus: "COMPLETED" as const,
      status: "CONFIRMED" as const,
    },
  ];

  for (const bookingData of dxBookings) {
    const { eventId, userId, paymentStatus, status, quantity } = bookingData;
    const ticketPrice = dxEvent.price * quantity;
    const convenienceFee = Math.round(ticketPrice * 0.05);
    const platformFee = Math.round(ticketPrice * 0.03);
    const finalAmount = ticketPrice + convenienceFee + platformFee;

    const booking = await prisma.booking.create({
      data: {
        eventId,
        userId,
        paymentStatus,
        status,
        ticketNumber: `TIX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        seats: quantity,
        ticketPrice,
        convenienceFee,
        platformFee,
        finalAmount,
        holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const ticket = createSignedTicket(
      booking.id,
      booking.userId,
      booking.eventId
    );
    const qrCode = encodeTicketForQR(ticket);
    const ticketPayloadHash = hashTicketPayload(ticket.payload);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        qrCode,
        ticketPayloadHash,
      },
    });
  }
  console.log(`✅ Created 3 attendees with tickets for ${dxEvent.title}`);

  console.log("📊 Creating synthetic analytics data (30 days)...");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const organizer1Events = createdEvents.filter(
    (e) => e.organizerId === organizer1.id
  );
  const organizer2Events = createdEvents.filter(
    (e) => e.organizerId === organizer2.id
  );

  let totalViews = 0;
  let totalBookings = 0;

  for (let day = 0; day < 30; day++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + day);

    for (const event of [...organizer1Events, ...organizer2Events]) {
      const viewsPerDay = Math.floor(Math.random() * 50) + 10;

      for (let i = 0; i < viewsPerDay; i++) {
        const viewTime = new Date(date);
        viewTime.setHours(Math.floor(Math.random() * 24));
        viewTime.setMinutes(Math.floor(Math.random() * 60));

        await prisma.eventView.create({
          data: {
            eventId: event.id,
            userId: Math.random() > 0.5 ? customer1.id : null,
            createdAt: viewTime,
          },
        });
        totalViews++;
      }

      const bookingsPerDay = Math.floor(Math.random() * 5);

      for (let i = 0; i < bookingsPerDay; i++) {
        const bookingTime = new Date(date);
        bookingTime.setHours(Math.floor(Math.random() * 24));
        bookingTime.setMinutes(Math.floor(Math.random() * 60));

        const quantity = Math.floor(Math.random() * 3) + 1;
        const ticketPrice = event.price * quantity;
        const convenienceFee = Math.round(ticketPrice * 0.05);
        const platformFee = Math.round(ticketPrice * 0.03);
        const finalAmount = ticketPrice + convenienceFee + platformFee;

        const booking = await prisma.booking.create({
          data: {
            eventId: event.id,
            userId: Math.random() > 0.5 ? customer1.id : customer2.id,
            ticketNumber: `TIX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            seats: quantity,
            ticketPrice,
            convenienceFee,
            platformFee,
            finalAmount,
            paymentStatus: "COMPLETED",
            status: "CONFIRMED",
            holdExpiresAt: new Date(bookingTime.getTime() + 15 * 60 * 1000),
            createdAt: bookingTime,
          },
        });

        const ticket = createSignedTicket(
          booking.id,
          booking.userId,
          booking.eventId
        );
        const qrCode = encodeTicketForQR(ticket);
        const ticketPayloadHash = hashTicketPayload(ticket.payload);

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            qrCode,
            ticketPayloadHash,
          },
        });

        await prisma.event.update({
          where: { id: event.id },
          data: {
            bookedSeats: {
              increment: quantity,
            },
          },
        });

        totalBookings++;
      }
    }
  }

  console.log(`✅ Created ${totalViews} synthetic event views across 30 days`);
  console.log(`✅ Created ${totalBookings} synthetic bookings across 30 days`);

  console.log("🔔 Creating default notification preferences for all users...");
  const allUsers = [
    admin,
    organizer1User,
    organizer2User,
    customer1,
    customer2,
    customer3,
  ];

  for (const user of allUsers) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        transactional: true,
        reminders: true,
        marketing: false,
      },
    });
  }
  console.log(
    `✅ Created notification preferences for ${allUsers.length} users`
  );

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
