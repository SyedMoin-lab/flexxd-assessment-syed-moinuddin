# Assumptions

The brief leaves these open, so here's what I'm assuming and why.

1. **Every visit costs 1 credit, whatever the venue's price.**
   The brief says "deducts one credit". Price per visit is stored but not used yet.
   It would matter later, for paying venues or for premium venues that cost 2 credits.

2. **Daily capacity is enforced, per venue, per calendar day.**
   The brief gives venues a daily capacity but never says to check it.
   Overbooking a gym is a real problem, so a booking fails with 409 once the venue is full today.
   Bookings are always for "today" because the request has no date.

3. **Every check runs before the credit is deducted.**
   Order: input → user exists → venue exists → user has credits → venue has space → deduct → create booking.
   A failed request never costs the user a credit.
   Node handles one request at a time, so this is safe in memory. A real database would need a transaction.

4. **Redemption codes are random, unique and single-use.**
   Codes are 8 characters made with crypto, not Math.random, so nobody can guess them.
   A code can only move from booked to redeemed once. A second redeem returns 409 and an unknown code returns 404.
   If I add the 10-minute expiry, an expired code returns 410 and the credit is not refunded (treated as a no-show).

5. **No login, no database, data resets on restart.**
   The brief asks for an in-memory store, and auth isn't in scope.
   The cost: anyone with a code can call redeem. That's a real gap, and I'll come back to it in the walkthrough.

6. **The redemption code is only shown once, when the booking is made.**
   POST /bookings returns the code. GET /users/:id lists the user's bookings without their codes.
   With no login, anyone can call GET /users/:id, so showing codes there would let them redeem someone else's booking.
   The cost: a user who loses the POST response can't get their code back.