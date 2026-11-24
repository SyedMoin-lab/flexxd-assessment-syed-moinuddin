import { randomUUID } from "node:crypto";
import { generateCode } from "./codes";
import { HttpError } from "./errors";
import { bookings, users, venues } from "./store";
import type { Booking } from "./types";

/**
 * How long a code can be redeemed after booking: 10 minutes by default.
 * Set CODE_EXPIRY_SECONDS to shorten it when trying the expired case by hand.
 */
export const CODE_LIFETIME_MS = readExpirySeconds() * 1000;

/**
 * Books a visit for today and returns the new booking with its code.
 *
 * Every check runs before the credit is deducted, so a failed request never
 * costs a credit (assumption 3). This function is synchronous: no other request
 * can run between the checks and the writes, which keeps it safe in memory.
 */
export function createBooking(userId: string, venueId: string) {
  const user = users.get(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const venue = venues.get(venueId);
  if (!venue) {
    throw new HttpError(404, "VENUE_NOT_FOUND", "Venue not found");
  }

  if (user.credits < 1) {
    throw new HttpError(402, "NO_CREDITS", "User has no credits left");
  }

  const now = new Date();
  const createdAt = now.toISOString();
  if (bookingsOnDay(venue.id, utcDay(createdAt)) >= venue.dailyCapacity) {
    throw new HttpError(409, "VENUE_FULL", "Venue is fully booked today");
  }

  let code: string;
  do {
    code = generateCode();
  } while (bookings.has(code));

  const booking: Booking = {
    id: randomUUID(),
    code,
    userId: user.id,
    venueId: venue.id,
    status: "booked",
    createdAt,
    expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS).toISOString(),
    redeemedAt: null,
  };

  // Every check has passed. Only now does the visit cost a credit.
  user.credits -= 1;
  bookings.set(booking.code, booking);

  return { booking, creditsRemaining: user.credits };
}

/**
 * Redeems a code at the venue. Checks run in this order: the code exists (404),
 * it hasn't been redeemed already (409), it hasn't expired (410). A code can only
 * move from booked to redeemed once (assumption 4).
 */
export function redeemBooking(rawCode: string): Booking {
  // Codes are case-insensitive: "46e9rp2p" finds "46E9RP2P".
  const booking = bookings.get(rawCode.trim().toUpperCase());
  if (!booking) {
    throw new HttpError(404, "CODE_NOT_FOUND", "No booking has this code");
  }

  if (booking.status === "redeemed") {
    throw new HttpError(409, "ALREADY_REDEEMED", `This code was already redeemed at ${booking.redeemedAt}`);
  }

  const now = new Date();
  if (now.getTime() >= Date.parse(booking.expiresAt)) {
    // Treated as a no-show, so the credit is not refunded (assumption 4).
    throw new HttpError(
      410,
      "CODE_EXPIRED",
      `This code expired at ${booking.expiresAt}. The credit is not refunded.`,
    );
  }

  booking.status = "redeemed";
  booking.redeemedAt = now.toISOString();
  return booking;
}

function readExpirySeconds(): number {
  const seconds = Number(process.env.CODE_EXPIRY_SECONDS);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 10 * 60;
}

/** The UTC calendar day of an ISO timestamp, e.g. "2026-11-24". */
function utcDay(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

/**
 * How many bookings a venue has on one UTC day. Redeemed and expired bookings
 * still count, because the slot was taken.
 */
function bookingsOnDay(venueId: string, day: string): number {
  let count = 0;
  for (const booking of bookings.values()) {
    if (booking.venueId === venueId && utcDay(booking.createdAt) === day) {
      count++;
    }
  }
  return count;
}
