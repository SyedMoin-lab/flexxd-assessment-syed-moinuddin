// Three tests: no credits (402), double redeem (409), expired code (410).
// Run with: npm test
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { Booking } from "./types";

// Codes expire after 1 second in tests, so the 410 test doesn't wait 10 minutes.
// This must be set before the app loads, because the lifetime is read once at startup.
process.env.CODE_EXPIRY_SECONDS = "1";
const { app } = await import("./app");
const { resetStore } = await import("./store");

type ErrorBody = { error: { code: string; message: string } };
type UserBody = { credits: number; bookings: unknown[] };

let server: Server;
let baseUrl: string;

// A random free port, so the tests never clash with npm run dev on 6548.
before(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(0, (error) => (error ? reject(error) : resolve(listening)));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

// Each test starts from the seed data: u1 has 5 credits, u2 has 0.
beforeEach(() => {
  resetStore();
});

function post(path: string, body: unknown): Promise<Response> {
  return fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ErrorBody).error.code;
}

async function getUser(id: string): Promise<UserBody> {
  const res = await fetch(`${baseUrl}/users/${id}`);
  return (await res.json()) as UserBody;
}

async function book(userId: string, venueId: string): Promise<Booking> {
  const res = await post("/bookings", { userId, venueId });
  assert.equal(res.status, 201);
  return (await res.json()) as Booking;
}

test("no credits: booking returns 402 and creates no booking", async () => {
  const res = await post("/bookings", { userId: "u2", venueId: "v1" });
  assert.equal(res.status, 402);
  assert.equal(await errorCode(res), "NO_CREDITS");

  const user = await getUser("u2");
  assert.equal(user.credits, 0);
  assert.deepEqual(user.bookings, []);
});

test("double redeem: the second redeem of a code returns 409", async () => {
  const { code } = await book("u1", "v1");

  const first = await post("/bookings/redeem", { code });
  assert.equal(first.status, 200);
  assert.equal(((await first.json()) as Booking).status, "redeemed");

  const second = await post("/bookings/redeem", { code });
  assert.equal(second.status, 409);
  assert.equal(await errorCode(second), "ALREADY_REDEEMED");
});

test("expiry: an expired code returns 410 and the credit is not refunded", async () => {
  const { code } = await book("u1", "v1");
  await sleep(1100); // codes last 1 second in tests

  const res = await post("/bookings/redeem", { code });
  assert.equal(res.status, 410);
  assert.equal(await errorCode(res), "CODE_EXPIRED");

  const user = await getUser("u1");
  assert.equal(user.credits, 4); // 5 seeded, 1 spent on the expired booking, no refund
});
