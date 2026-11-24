import express from "express";
import { createBooking, redeemBooking } from "./bookings";
import { errorHandler, HttpError, notFound } from "./errors";
import { bookings, users } from "./store";
import type { Booking } from "./types";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

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

// Books a visit for today. Costs 1 credit and returns the booking with its code.
app.post("/bookings", (req, res) => {
  const { userId, venueId } = readBookingRequest(req.body);
  const { booking, creditsRemaining } = createBooking(userId, venueId);
  res.status(201).json({ ...booking, creditsRemaining });
});

// Redeems a code at the venue. Each code works once, until it expires.
app.post("/bookings/redeem", (req, res) => {
  const code = readRedeemRequest(req.body);
  res.json(redeemBooking(code));
});

app.use(notFound);
app.use(errorHandler);

// Leaves out the redemption code on purpose. With no auth, anyone can call
// this endpoint, so showing codes here would let them redeem other people's
// bookings. The code is only returned once, by POST /bookings (assumption 6).
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

/** Checks the POST /bookings body. This is the first check (assumption 3). */
function readBookingRequest(body: unknown): { userId: string; venueId: string } {
  const { userId, venueId } = readJsonObject(body);
  if (!isNonEmptyString(userId)) {
    throw new HttpError(400, "INVALID_BODY", "userId must be a non-empty string");
  }
  if (!isNonEmptyString(venueId)) {
    throw new HttpError(400, "INVALID_BODY", "venueId must be a non-empty string");
  }
  return { userId, venueId };
}

/** Checks the POST /bookings/redeem body. This is the first check. */
function readRedeemRequest(body: unknown): string {
  const { code } = readJsonObject(body);
  if (typeof code !== "string" || code.trim() === "") {
    throw new HttpError(400, "INVALID_BODY", "code must be a non-empty string");
  }
  return code;
}

// req.body is undefined when the request isn't sent as application/json.
function readJsonObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "INVALID_BODY", "Send a JSON object with Content-Type: application/json");
  }
  return body as Record<string, unknown>;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
