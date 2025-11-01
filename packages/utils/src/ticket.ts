import { createHmac } from "crypto";

export interface TicketPayload {
  bookingId: string;
  userId: string;
  eventId: string;
  ts: number;
}

export interface SignedTicket {
  payload: TicketPayload;
  signature: string;
}

const TICKET_SECRET =
  process.env.TICKET_SECRET || "default-ticket-secret-for-tests";

export function signTicketPayload(payload: TicketPayload): string {
  const payloadString = JSON.stringify(payload);
  const hmac = createHmac("sha256", TICKET_SECRET);
  hmac.update(payloadString);
  return hmac.digest("hex");
}

export function verifyTicketSignature(
  payload: TicketPayload,
  signature: string
): boolean {
  const expectedSignature = signTicketPayload(payload);
  return expectedSignature === signature;
}

export function generateTicketPayload(
  bookingId: string,
  userId: string,
  eventId: string
): TicketPayload {
  return {
    bookingId,
    userId,
    eventId,
    ts: Date.now(),
  };
}

export function createSignedTicket(
  bookingId: string,
  userId: string,
  eventId: string
): SignedTicket {
  const payload = generateTicketPayload(bookingId, userId, eventId);
  const signature = signTicketPayload(payload);
  return { payload, signature };
}

export function encodeTicketForQR(ticket: SignedTicket): string {
  return JSON.stringify(ticket);
}

export function decodeTicketFromQR(qrData: string): SignedTicket | null {
  try {
    const ticket = JSON.parse(qrData) as SignedTicket;
    if (
      !ticket.payload ||
      !ticket.signature ||
      !ticket.payload.bookingId ||
      !ticket.payload.userId ||
      !ticket.payload.eventId ||
      typeof ticket.payload.ts !== "number"
    ) {
      return null;
    }
    return ticket;
  } catch {
    return null;
  }
}

export function hashTicketPayload(payload: TicketPayload): string {
  const payloadString = JSON.stringify(payload);
  const hmac = createHmac("sha256", TICKET_SECRET);
  hmac.update(payloadString);
  return hmac.digest("hex");
}
