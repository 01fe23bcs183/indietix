import { describe, it, expect } from "vitest";
import {
  signTicketPayload,
  verifyTicketSignature,
  generateTicketPayload,
  createSignedTicket,
  encodeTicketForQR,
  decodeTicketFromQR,
  hashTicketPayload,
} from "../ticket";
import type { TicketPayload } from "../ticket";

describe("Ticket Utilities", () => {
  describe("signTicketPayload", () => {
    it("should generate a valid signature for a payload", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const signature = signTicketPayload(payload);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
    });

    it("should generate the same signature for the same payload", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const signature1 = signTicketPayload(payload);
      const signature2 = signTicketPayload(payload);

      expect(signature1).toBe(signature2);
    });

    it("should generate different signatures for different payloads", () => {
      const payload1: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const payload2: TicketPayload = {
        bookingId: "booking456",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const signature1 = signTicketPayload(payload1);
      const signature2 = signTicketPayload(payload2);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe("verifyTicketSignature", () => {
    it("should verify a valid signature", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const signature = signTicketPayload(payload);
      const isValid = verifyTicketSignature(payload, signature);

      expect(isValid).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const isValid = verifyTicketSignature(payload, "invalid-signature");

      expect(isValid).toBe(false);
    });

    it("should reject a signature for a tampered payload", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const signature = signTicketPayload(payload);

      const tamperedPayload: TicketPayload = {
        ...payload,
        bookingId: "booking456",
      };

      const isValid = verifyTicketSignature(tamperedPayload, signature);

      expect(isValid).toBe(false);
    });
  });

  describe("generateTicketPayload", () => {
    it("should generate a valid ticket payload", () => {
      const bookingId = "booking123";
      const userId = "user123";
      const eventId = "event123";

      const payload = generateTicketPayload(bookingId, userId, eventId);

      expect(payload.bookingId).toBe(bookingId);
      expect(payload.userId).toBe(userId);
      expect(payload.eventId).toBe(eventId);
      expect(typeof payload.ts).toBe("number");
      expect(payload.ts).toBeGreaterThan(0);
    });

    it("should generate different timestamps for sequential calls", async () => {
      const payload1 = generateTicketPayload("booking1", "user1", "event1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const payload2 = generateTicketPayload("booking2", "user2", "event2");

      expect(payload2.ts).toBeGreaterThanOrEqual(payload1.ts);
    });
  });

  describe("createSignedTicket", () => {
    it("should create a signed ticket with payload and signature", () => {
      const bookingId = "booking123";
      const userId = "user123";
      const eventId = "event123";

      const ticket = createSignedTicket(bookingId, userId, eventId);

      expect(ticket.payload).toBeDefined();
      expect(ticket.signature).toBeDefined();
      expect(ticket.payload.bookingId).toBe(bookingId);
      expect(ticket.payload.userId).toBe(userId);
      expect(ticket.payload.eventId).toBe(eventId);
      expect(typeof ticket.signature).toBe("string");
    });

    it("should create a ticket with a valid signature", () => {
      const ticket = createSignedTicket("booking123", "user123", "event123");

      const isValid = verifyTicketSignature(ticket.payload, ticket.signature);

      expect(isValid).toBe(true);
    });
  });

  describe("encodeTicketForQR and decodeTicketFromQR", () => {
    it("should encode and decode a ticket correctly", () => {
      const ticket = createSignedTicket("booking123", "user123", "event123");

      const encoded = encodeTicketForQR(ticket);
      const decoded = decodeTicketFromQR(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.payload.bookingId).toBe(ticket.payload.bookingId);
      expect(decoded?.payload.userId).toBe(ticket.payload.userId);
      expect(decoded?.payload.eventId).toBe(ticket.payload.eventId);
      expect(decoded?.payload.ts).toBe(ticket.payload.ts);
      expect(decoded?.signature).toBe(ticket.signature);
    });

    it("should return null for invalid JSON", () => {
      const decoded = decodeTicketFromQR("invalid json");

      expect(decoded).toBeNull();
    });

    it("should return null for missing payload", () => {
      const invalidTicket = JSON.stringify({ signature: "test" });
      const decoded = decodeTicketFromQR(invalidTicket);

      expect(decoded).toBeNull();
    });

    it("should return null for missing signature", () => {
      const invalidTicket = JSON.stringify({
        payload: {
          bookingId: "booking123",
          userId: "user123",
          eventId: "event123",
          ts: 1234567890,
        },
      });
      const decoded = decodeTicketFromQR(invalidTicket);

      expect(decoded).toBeNull();
    });

    it("should return null for incomplete payload", () => {
      const invalidTicket = JSON.stringify({
        payload: {
          bookingId: "booking123",
          userId: "user123",
        },
        signature: "test",
      });
      const decoded = decodeTicketFromQR(invalidTicket);

      expect(decoded).toBeNull();
    });
  });

  describe("hashTicketPayload", () => {
    it("should generate a hash for a payload", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const hash = hashTicketPayload(payload);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate the same hash for the same payload", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const hash1 = hashTicketPayload(payload);
      const hash2 = hashTicketPayload(payload);

      expect(hash1).toBe(hash2);
    });

    it("should generate the same hash as signature for the same payload", () => {
      const payload: TicketPayload = {
        bookingId: "booking123",
        userId: "user123",
        eventId: "event123",
        ts: 1234567890,
      };

      const hash = hashTicketPayload(payload);
      const signature = signTicketPayload(payload);

      expect(hash).toBe(signature);
    });
  });
});
