import type { Booking, User, Venue } from "./types";

// In-memory store: everything resets when the server restarts (assumption 5).

const SEED_USERS: readonly User[] = [
  { id: "u1", name: "Alice", credits: 5 },
  { id: "u2", name: "Bob", credits: 0 }, // for trying the no-credits path
];

const SEED_VENUES: readonly Venue[] = [
  { id: "v1", name: "City Gym", dailyCapacity: 20, pricePerVisit: 12 },
  { id: "v2", name: "Corner Yoga", dailyCapacity: 1, pricePerVisit: 8 }, // full after one booking
];

export const users = new Map<string, User>();
export const venues = new Map<string, Venue>();
/** Keyed by redemption code, because redeem looks bookings up by code. */
export const bookings = new Map<string, Booking>();

/** Empties the store and loads the seed data. Copies the seeds so they never change. */
export function resetStore(): void {
  users.clear();
  venues.clear();
  bookings.clear();
  for (const user of SEED_USERS) users.set(user.id, { ...user });
  for (const venue of SEED_VENUES) venues.set(venue.id, { ...venue });
}

resetStore();
