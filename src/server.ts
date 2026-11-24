import { app } from "./app";
import { CODE_LIFETIME_MS } from "./bookings";

const PORT = Number(process.env.PORT) || 6548;

// Express 5 passes startup errors (e.g. port already in use) to this callback.
app.listen(PORT, (error) => {
  if (error) {
    console.error(`Could not start on port ${PORT}: ${error.message}`);
    process.exit(1);
  }
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Redemption codes expire ${CODE_LIFETIME_MS / 1000} seconds after booking`);
});
