import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 5 minutes to check for expired orders
crons.interval(
  "release-expired-reservations",
  { minutes: 5 },
  internal.stock.releaseExpiredReservations
);

export default crons;
