import express from "express";
import { errorHandler, HttpError, notFound } from "./errors";
import { bookings, users } from "./store";
import type { Booking } from "./types";

export const app = express();

app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// The user, their current credits and every booking they've made.
app.get("/users/:id", (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const userBookings = [...bookings.values()]
    .filter((booking) => booking.userId === user.id)
    .map(toBookingSummary);

  res.json({ id: user.id, name: user.name, credits: user.credits, bookings: userBookings });
});

app.use(notFound);
app.use(errorHandler);

// Leaves out the redemption code on purpose. With no auth, anyone can call
// this endpoint, so showing codes here would let them redeem other people's
// bookings. The code is only returned once, by POST /bookings.
function toBookingSummary(booking: Booking) {
  return {
    id: booking.id,
    venueId: booking.venueId,
    status: booking.status,
    createdAt: booking.createdAt,
    expiresAt: booking.expiresAt,
    redeemedAt: booking.redeemedAt,
  };
}
