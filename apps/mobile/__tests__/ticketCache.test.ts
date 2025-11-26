import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cacheTicket,
  getCachedTicket,
  removeCachedTicket,
  getAllCachedTickets,
  encodeTicketForQR,
  decodeTicketFromCache,
  type CachedTicket,
} from "../utils/TicketCache";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
}));

describe("TicketCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("cacheTicket", () => {
    it("should cache a ticket successfully", async () => {
      const mockTicket: CachedTicket = {
        payload: {
          bookingId: "booking123",
          userId: "user123",
          eventId: "event123",
          ts: Date.now(),
        },
        signature: "signature123",
        meta: {
          eventTitle: "Test Event",
          eventDate: "2025-12-01",
          venue: "Test Venue",
          city: "Test City",
          ticketNumber: "TICKET123",
          seats: 2,
          cachedAt: Date.now(),
        },
      };

      await cacheTicket("booking123", mockTicket);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "ticket_booking123",
        JSON.stringify(mockTicket)
      );
    });

    it("should throw error if caching fails", async () => {
      const mockTicket: CachedTicket = {
        payload: {
          bookingId: "booking123",
          userId: "user123",
          eventId: "event123",
          ts: Date.now(),
        },
        signature: "signature123",
        meta: {
          eventTitle: "Test Event",
          eventDate: "2025-12-01",
          venue: "Test Venue",
          city: "Test City",
          ticketNumber: "TICKET123",
          seats: 2,
          cachedAt: Date.now(),
        },
      };

      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error")
      );

      await expect(cacheTicket("booking123", mockTicket)).rejects.toThrow(
        "Storage error"
      );
    });
  });

  describe("getCachedTicket", () => {
    it("should retrieve a cached ticket", async () => {
      const mockTicket: CachedTicket = {
        payload: {
          bookingId: "booking123",
          userId: "user123",
          eventId: "event123",
          ts: Date.now(),
        },
        signature: "signature123",
        meta: {
          eventTitle: "Test Event",
          eventDate: "2025-12-01",
          venue: "Test Venue",
          city: "Test City",
          ticketNumber: "TICKET123",
          seats: 2,
          cachedAt: Date.now(),
        },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockTicket)
      );

      const result = await getCachedTicket("booking123");

      expect(AsyncStorage.getItem).toHaveBeenCalledWith("ticket_booking123");
      expect(result).toEqual(mockTicket);
    });

    it("should return null if ticket not found", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getCachedTicket("booking123");

      expect(result).toBeNull();
    });

    it("should return null if retrieval fails", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error")
      );

      const result = await getCachedTicket("booking123");

      expect(result).toBeNull();
    });
  });

  describe("removeCachedTicket", () => {
    it("should remove a cached ticket", async () => {
      await removeCachedTicket("booking123");

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("ticket_booking123");
    });

    it("should throw error if removal fails", async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error")
      );

      await expect(removeCachedTicket("booking123")).rejects.toThrow(
        "Storage error"
      );
    });
  });

  describe("getAllCachedTickets", () => {
    it("should retrieve all cached tickets", async () => {
      const mockTicket1: CachedTicket = {
        payload: {
          bookingId: "booking1",
          userId: "user1",
          eventId: "event1",
          ts: Date.now(),
        },
        signature: "sig1",
        meta: {
          eventTitle: "Event 1",
          eventDate: "2025-12-01",
          venue: "Venue 1",
          city: "City 1",
          ticketNumber: "TICKET1",
          seats: 1,
          cachedAt: Date.now(),
        },
      };

      const mockTicket2: CachedTicket = {
        payload: {
          bookingId: "booking2",
          userId: "user2",
          eventId: "event2",
          ts: Date.now(),
        },
        signature: "sig2",
        meta: {
          eventTitle: "Event 2",
          eventDate: "2025-12-02",
          venue: "Venue 2",
          city: "City 2",
          ticketNumber: "TICKET2",
          seats: 2,
          cachedAt: Date.now(),
        },
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        "ticket_booking1",
        "ticket_booking2",
        "other_key",
      ]);

      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        ["ticket_booking1", JSON.stringify(mockTicket1)],
        ["ticket_booking2", JSON.stringify(mockTicket2)],
      ]);

      const result = await getAllCachedTickets();

      expect(result).toHaveLength(2);
      expect(result[0]?.bookingId).toBe("booking1");
      expect(result[1]?.bookingId).toBe("booking2");
    });

    it("should return empty array if no tickets found", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);

      const result = await getAllCachedTickets();

      expect(result).toEqual([]);
    });

    it("should return empty array if retrieval fails", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error")
      );

      const result = await getAllCachedTickets();

      expect(result).toEqual([]);
    });
  });

  describe("encodeTicketForQR", () => {
    it("should encode ticket for QR code", () => {
      const ticket = {
        payload: {
          bookingId: "booking123",
          userId: "user123",
          eventId: "event123",
          ts: Date.now(),
        },
        signature: "signature123",
      };

      const result = encodeTicketForQR(ticket);

      expect(result).toBe(JSON.stringify(ticket));
    });
  });

  describe("decodeTicketFromCache", () => {
    it("should decode ticket from cache", () => {
      const cachedTicket: CachedTicket = {
        payload: {
          bookingId: "booking123",
          userId: "user123",
          eventId: "event123",
          ts: Date.now(),
        },
        signature: "signature123",
        meta: {
          eventTitle: "Test Event",
          eventDate: "2025-12-01",
          venue: "Test Venue",
          city: "Test City",
          ticketNumber: "TICKET123",
          seats: 2,
          cachedAt: Date.now(),
        },
      };

      const result = decodeTicketFromCache(cachedTicket);

      expect(result).toEqual({
        payload: cachedTicket.payload,
        signature: cachedTicket.signature,
      });
    });
  });
});
