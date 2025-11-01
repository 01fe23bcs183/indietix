import { prisma } from "@indietix/db";

const WAITLIST_OFFER_TTL_MINUTES = 30;

export async function issueWaitlistOffers(
  eventId: string,
  freedQuantity: number
): Promise<void> {
  const activeEntries = await prisma.waitlistEntry.findMany({
    where: {
      eventId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "asc",
    },
    take: freedQuantity,
  });

  if (activeEntries.length === 0) {
    return;
  }

  const expiresAt = new Date(
    Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60 * 1000
  );

  for (const entry of activeEntries) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: {
          status: "INVITED",
          invitedAt: new Date(),
        },
      });

      await tx.waitlistOffer.create({
        data: {
          eventId,
          entryId: entry.id,
          quantity: 1,
          expiresAt,
          status: "PENDING",
        },
      });
    });
  }
}

export async function expireWaitlistOffers(): Promise<number> {
  const now = new Date();

  const expiredOffers = await prisma.waitlistOffer.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
    },
    include: {
      entry: true,
    },
  });

  let expiredCount = 0;

  for (const offer of expiredOffers) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.waitlistOffer.update({
        where: { id: offer.id },
        data: {
          status: "EXPIRED",
          expiredAt: now,
        },
      });

      await tx.waitlistEntry.update({
        where: { id: offer.entryId },
        data: {
          status: "ACTIVE",
          invitedAt: null,
        },
      });
    });

    expiredCount++;
  }

  return expiredCount;
}
