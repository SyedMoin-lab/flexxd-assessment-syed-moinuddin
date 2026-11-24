# Flexxd booking API

A small API for booking visits with credits. A user spends 1 credit to book a visit at a venue for today and gets a single-use code. The venue redeems that code within 10 minutes.

It's built with Node, Express 5 and TypeScript. Data is kept in memory, so there's no database and everything resets when the server restarts. There's no login, and no AI APIs are used.

## Run it

```bash
npm install
npm run dev      # starts the API on http://localhost:6548 and restarts on file changes
npm test         # runs the three tests
```

Built and tested on Node 26.

## Endpoints

| Method | Path | What it does | Errors |
|---|---|---|---|
| GET | `/health` | Checks the server is up | |
| GET | `/users/:id` | Returns the user, their current credits and all their bookings | 404 |
| POST | `/bookings` | Takes `{ userId, venueId }`. Books a visit for today, costs 1 credit and returns 201 with the booking and its code | 400, 404, 402, 409 |
| POST | `/bookings/redeem` | Takes `{ code }`. Redeems the code once and returns 200 with the booking | 400, 404, 409, 410 |

Every error has the same shape: `{ "error": { "code": "VENUE_FULL", "message": "Venue is fully booked today" } }`.

| Status | When |
|---|---|
| 400 | The body is missing, broken JSON, or has a missing field |
| 402 | The user has no credits left |
| 404 | The user, venue or code doesn't exist |
| 409 | The venue is full today, or the code was already redeemed |
| 410 | The code has expired (the credit is not refunded) |

## Try it with curl

The server starts with two users and two venues:

- `u1` Alice, 5 credits
- `u2` Bob, 0 credits
- `v1` City Gym, room for 20 a day
- `v2` Corner Yoga, room for 1 a day

```bash
# See a user, their credits and their bookings
curl -i http://localhost:6548/users/u1

# Book a visit (copy the "code" from the response)
curl -i -X POST http://localhost:6548/bookings -H "Content-Type: application/json" -d '{"userId":"u1","venueId":"v1"}'

# Redeem it (try it twice to see the 409)
curl -i -X POST http://localhost:6548/bookings/redeem -H "Content-Type: application/json" -d '{"code":"PASTE_CODE_HERE"}'
```

In Windows PowerShell, type `curl.exe` instead of `curl`.

## How it works

**Booking.** The checks run in this order: body, then user, then venue, then credits, then room left today. The credit is deducted only after every check passes, so a failed request never costs anything. Capacity counts every booking at the venue on the same UTC day. Redeemed and expired bookings still hold their slot. The same user can book the same venue more than once a day, and each booking costs a credit.

**Codes.** Codes are 8 characters long and made with `crypto`, not `Math.random`, so they can't be guessed. They leave out look-alike characters (0, O, 1, I, L). Redeem trims and uppercases the code before looking it up, so `8qym3c7f` works. `GET /users/:id` doesn't show codes: with no login, anyone could read them there and redeem someone else's booking.

**Redeem.** The checks run in this order: body, then the code exists, then it hasn't been redeemed, then it hasn't expired. A code expires 10 minutes after booking. An expired code counts as a no-show, so the credit isn't refunded.

The reasoning behind each of these decisions is in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Settings

| Variable | Default | What it's for |
|---|---|---|
| `PORT` | `6548` | Port the server listens on |
| `CODE_EXPIRY_SECONDS` | `600` (10 minutes) | Makes codes expire sooner, so the 410 case can be tried by hand. The tests set it to 1 |

## Tests

`npm test` runs three tests with Node's built-in test runner. They start the app on a random free port, so they don't clash with `npm run dev`.

1. **No credits:** booking returns 402 and creates no booking.
2. **Double redeem:** the second redeem of a code returns 409.
3. **Expiry:** an expired code returns 410 and the credit is not refunded.

## How I built it

I wrote down the assumptions first, then built the API in small steps. After each step I tried every case by hand with curl and only then committed it, so `git log` shows one commit per step.

1. Project setup and `GET /health`
2. In-memory store, seed data and `GET /users/:id`
3. `POST /bookings` with all its error paths
4. `POST /bookings/redeem` with the 10-minute expiry
5. The three tests
6. This README

## Project layout

```
src/
  server.ts     starts the server
  app.ts        routes and request checks
  bookings.ts   the booking and redeem rules
  store.ts      in-memory data and seed data
  codes.ts      random redemption codes
  errors.ts     error responses
  types.ts      User, Venue and Booking types
  api.test.ts   the three tests
```

## What I'd do next

- **Login.** Right now anyone with a code can redeem it. Venue staff should sign in to redeem, and users should sign in to see their own bookings.
- **A real database.** The check-then-deduct is safe in memory because Node runs one request at a time. With a database, it would need to run in a transaction.
- **`GET /venues`.** This was optional, and I skipped it for time.
- **Show expired bookings as "expired".** Right now an expired booking still says `booked` in `GET /users/:id`, and only its `expiresAt` tells you it has expired.
- **Use the venue's price.** Price per visit is stored but not used yet, because every visit costs 1 credit.
