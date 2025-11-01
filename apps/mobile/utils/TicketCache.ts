import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SignedTicket } from "@indietix/utils";

export interface CachedTicket {
  payload: SignedTicket["payload"];
  signature: string;
  meta: {
    eventTitle: string;
    eventDate: string;
    venue: string;
    city: string;
    ticketNumber: string;
    seats: number;
    cachedAt: number;
  };
}

const TICKET_CACHE_PREFIX = "ticket_";

export async function cacheTicket(
  bookingId: string,
  ticket: CachedTicket
): Promise<void> {
  try {
    const key = `${TICKET_CACHE_PREFIX}${bookingId}`;
    await AsyncStorage.setItem(key, JSON.stringify(ticket));
  } catch (error) {
    console.error("Failed to cache ticket:", error);
    throw error;
  }
}

export async function getCachedTicket(
  bookingId: string
): Promise<CachedTicket | null> {
  try {
    const key = `${TICKET_CACHE_PREFIX}${bookingId}`;
    const cached = await AsyncStorage.getItem(key);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as CachedTicket;
  } catch (error) {
    console.error("Failed to get cached ticket:", error);
    return null;
  }
}

export async function removeCachedTicket(bookingId: string): Promise<void> {
  try {
    const key = `${TICKET_CACHE_PREFIX}${bookingId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to remove cached ticket:", error);
    throw error;
  }
}

export async function getAllCachedTickets(): Promise<
  Array<{ bookingId: string; ticket: CachedTicket }>
> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ticketKeys = keys.filter((key) => key.startsWith(TICKET_CACHE_PREFIX));
    const tickets = await AsyncStorage.multiGet(ticketKeys);

    return tickets
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({
        bookingId: key.replace(TICKET_CACHE_PREFIX, ""),
        ticket: JSON.parse(value!) as CachedTicket,
      }));
  } catch (error) {
    console.error("Failed to get all cached tickets:", error);
    return [];
  }
}

export function encodeTicketForQR(ticket: SignedTicket): string {
  return JSON.stringify(ticket);
}

export function decodeTicketFromCache(cached: CachedTicket): SignedTicket {
  return {
    payload: cached.payload,
    signature: cached.signature,
  };
}
