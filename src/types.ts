export interface User {
  id: string;
  name: string;
  credits: number;
}

export interface Venue {
  id: string;
  name: string;
  dailyCapacity: number;
  /** Stored but not used yet: every visit costs 1 credit (assumption 1). */
  pricePerVisit: number;
}

export type BookingStatus = "booked" | "redeemed";

export interface Booking {
  id: string;
  /** Secret, single-use redemption code (assumption 4). */
  code: string;
  userId: string;
  venueId: string;
  status: BookingStatus;
  /** ISO 8601 UTC, e.g. "2026-11-24T09:30:00.000Z". */
  createdAt: string;
  /** ISO 8601 UTC. */
  expiresAt: string;
  /** ISO 8601 UTC, null until the code is redeemed. */
  redeemedAt: string | null;
}
